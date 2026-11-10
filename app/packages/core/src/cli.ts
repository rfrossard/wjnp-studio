#!/usr/bin/env tsx
/** `wjnp` — plain-text CLI over the core. Exit code 1 on errors. */
import { approve, ApprovalError, type ApprovalTarget } from "./approve.ts";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { AssetType, Episode, type Finding } from "@wjnp/contracts";
import { addFeedback, listFeedback } from "./feedback.ts";
import { importInput, httpFetcher } from "./importer.ts";
import { writeKit } from "./kit.ts";
import { buildPlan, escalate } from "./plan.ts";
import { approveAndApply, createProposal, regress, regressProposal, rejectProposal, type RegressResult } from "./proposals.ts";
import { serve } from "./server.ts";
import { Store } from "./store.ts";
import { contextFromStore } from "./validators/context.ts";
import { runGate, VALIDATORS } from "./validators/gate.ts";

type Out = (line?: string) => void;

export interface Args {
  _: string[];
  flags: Record<string, string | true>;
}

export function parseArgs(argv: string[]): Args {
  const _: string[] = [];
  const flags: Record<string, string | true> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split("=", 2) as [string, string | undefined];
      if (v !== undefined) flags[k] = v;
      else if (argv[i + 1] !== undefined && !argv[i + 1]!.startsWith("--")) flags[k] = argv[++i]!;
      else flags[k] = true;
    } else _.push(a);
  }
  return { _, flags };
}

const str = (f: string | true | undefined) => (typeof f === "string" ? f : undefined);

const HELP = `wjnp — What's just now possible? studio CLI

  new <id> --title T [--week YYYY-MM-DD] [--brief brief.json | --theme .. --thesis .. --m1 .. --m2 .. --m3 ..]
  validate [id]              parse episode(s) against the contracts
  lint <id>                  structure, factuality, compliance, design findings
  plan <id> [--save] [--escalate <taskId> --reason "..."]
  gate <id>                  every validator + durations + gate verdict
  kit <id>                   write the publish kit to episodes/<id>/out/kit/
  import <input> [--title T] [--license kind]
  library [type]
  feedback add "<text>" [--kind comment] [--episode id] [--module m] [--scene id]
  feedback list [--status open]
  feedback propose --feedback fb1,fb2 --module m --file f (--before s | --before-file p) (--after s | --after-file p) --rationale "..."
  feedback apply <proposalId>     owner approval: regress if needed, then apply
  feedback reject <proposalId>
  approve <id> <brief|script|final|publish>   record an explicit owner approval
  regress                    golden episodes vs baseline.json
  serve [--port 4317]        HTTP API
`;

function printFindings(out: Out, findings: Finding[], showInfo = false) {
  const order = { error: 0, warning: 1, info: 2 } as const;
  const list = findings.filter((f) => showInfo || f.severity !== "info").sort((a, b) => order[a.severity] - order[b.severity]);
  for (const f of list) {
    const tag = f.severity === "error" ? "ERROR" : f.severity === "warning" ? "WARN " : "INFO ";
    const at = [f.sceneId && `scene ${f.sceneId}`, f.claimId && `claim ${f.claimId}`].filter(Boolean).join(", ");
    out(`  ${tag} ${f.rule}${at ? ` [${at}]` : ""}: ${f.message}`);
  }
  const n = (s: Finding["severity"]) => findings.filter((f) => f.severity === s).length;
  out(`  ${n("error")} error(s), ${n("warning")} warning(s), ${n("info")} info`);
}

export function printRegress(out: Out, r: RegressResult) {
  if (!r.episodes.length) out("No golden episodes found.");
  for (const e of r.episodes) {
    out(`${e.passed ? "PASS" : "FAIL"} ${e.episodeId}  gatePass=${e.gatePass} (baseline ${e.baselineGatePass})  master ${e.durations.masterSeconds}s  cut ${e.durations.cutSeconds}s`);
    for (const f of e.newErrors) out(`  new error: ${f.rule}${f.sceneId ? ` [scene ${f.sceneId}]` : ""}${f.claimId ? ` [claim ${f.claimId}]` : ""}`);
    for (const f of e.resolvedErrors) out(`  resolved: ${f.rule}`);
    for (const f of e.newWarnings) out(`  new warning: ${f.rule}`);
    for (const note of e.notes) out(`  note: ${note}`);
  }
  out(r.passed ? "Regression: PASS" : "Regression: FAIL");
}

export async function run(argv: string[], opts: { root?: string; out?: Out; err?: Out } = {}): Promise<number> {
  const out: Out = opts.out ?? ((l = "") => console.log(l));
  const errOut: Out = opts.err ?? ((l = "") => console.error(l));
  const { _, flags } = parseArgs(argv);
  const [cmd, ...rest] = _;
  if (!cmd || cmd === "help" || flags.help) {
    out(HELP);
    return cmd ? 0 : 1;
  }
  const store = new Store(opts.root);
  const need = (v: string | undefined, what: string) => {
    if (!v) throw new Error(`Missing ${what}. See \`wjnp help\`.`);
    return v;
  };
  const warnModules = () => {
    for (const w of store.moduleWarnings) errOut(`warning: ${w}`);
  };

  switch (cmd) {
    case "new": {
      const id = need(rest[0], "<id>");
      const title = need(str(flags.title), "--title");
      const weekOf = str(flags.week) ?? new Date().toISOString().slice(0, 10);
      const briefFile = str(flags.brief);
      const brief = briefFile
        ? JSON.parse(readFileSync(briefFile, "utf8"))
        : {
            theme: str(flags.theme) ?? title,
            thesis: str(flags.thesis) ?? "TBD thesis",
            messages: [1, 2, 3].map((i) => ({ id: `m${i}`, text: str(flags[`m${i}`]) ?? `TBD message ${i}`, claimIds: [] })),
            tone: str(flags.tone) ?? "analytical",
          };
      const ep = store.createEpisode({ id, title, weekOf, brief });
      out(`Created episodes/${ep.id}/episode.json (accent ${ep.design.accent.name} ${ep.design.accent.hex}, narrator ${ep.audio.narratorVoiceId})`);
      return 0;
    }
    case "validate": {
      const ids = rest[0] ? [rest[0]] : store.listEpisodes().map((e) => e.id);
      let bad = 0;
      for (const id of ids) {
        try {
          const raw = JSON.parse(readFileSync(`${store.episodeDir(id)}/episode.json`, "utf8"));
          const r = Episode.safeParse(raw);
          if (r.success) out(`OK   ${id}`);
          else {
            bad++;
            out(`FAIL ${id}`);
            for (const i of r.error.issues) out(`  ${i.path.join(".")}: ${i.message}`);
          }
        } catch (e) {
          bad++;
          out(`FAIL ${id}: ${(e as Error).message}`);
        }
      }
      return bad ? 1 : 0;
    }
    case "lint": {
      const id = need(rest[0], "<id>");
      const ep = store.getEpisode(id);
      const ctx = contextFromStore(store);
      const findings = [VALIDATORS.structure, VALIDATORS.factuality, VALIDATORS.compliance, VALIDATORS.design].flatMap((v) => v(ep, ctx));
      warnModules();
      out(`Lint ${id}`);
      printFindings(out, findings);
      return findings.some((f) => f.severity === "error") ? 1 : 0;
    }
    case "gate": {
      const id = need(rest[0], "<id>");
      const r = runGate(store.getEpisode(id), contextFromStore(store));
      warnModules();
      out(`Gate ${id}`);
      out(`  master ${r.durations.masterSeconds.toFixed(1)} s · cut ${r.durations.cutSeconds.toFixed(1)} s`);
      printFindings(out, r.findings, !!flags.info);
      out(r.gatePass ? "GATE: PASS" : "GATE: FAIL");
      return r.gatePass ? 0 : 1;
    }
    case "plan": {
      const id = need(rest[0], "<id>");
      const ep = store.getEpisode(id);
      const routing = store.routing();
      let plan = ep.plan && !flags.rebuild ? ep.plan : buildPlan(ep, routing);
      const esc = str(flags.escalate);
      if (esc) plan = escalate(plan, esc, str(flags.reason) ?? "manual escalation", routing);
      for (const t of plan.tasks)
        out(`${t.id.padEnd(28)} ${t.kind.padEnd(15)} ${t.tier.padEnd(9)} ${(t.model ?? "-").padEnd(22)} ${t.dependsOn.length ? "← " + t.dependsOn.join(", ") : ""}`);
      for (const e of plan.escalations) out(`escalated ${e.taskId}: ${e.from} → ${e.to} (${e.reason})`);
      if (flags.save || esc) {
        store.saveEpisode({ ...ep, plan });
        out(`Saved plan to ${id}`);
      }
      return 0;
    }
    case "kit": {
      const id = need(rest[0], "<id>");
      const k = writeKit(store, id);
      out(`Kit written to ${store.relative(k.dir)}/`);
      for (const f of k.files) out(`  ${f}`);
      return 0;
    }
    case "import": {
      const input = need(rest.join(" ") || undefined, "<input>");
      const lic = str(flags.license);
      const a = await importInput(store, input, { title: str(flags.title), license: lic ? { kind: lic } : undefined, fetcher: flags.offline ? undefined : httpFetcher });
      out(`Imported ${a.type}/${a.id}: ${a.title} (licence ${a.license.kind})`);
      return 0;
    }
    case "library": {
      const type = rest[0] ? AssetType.parse(rest[0]) : undefined;
      const assets = store.listAssets(type);
      if (!assets.length) out("Library is empty.");
      for (const a of assets) out(`${a.type.padEnd(10)} ${a.id.padEnd(28)} ${a.license.kind.padEnd(10)} ${a.state.padEnd(8)} ${a.title}`);
      return 0;
    }
    case "feedback": {
      const sub = rest[0];
      if (sub === "add") {
        const text = need(rest.slice(1).join(" ") || str(flags.text), "<text>");
        const fb = addFeedback(store, {
          kind: (str(flags.kind) ?? "comment") as never,
          text,
          episodeId: str(flags.episode),
          before: str(flags.before),
          after: str(flags.after),
          target: {
            ...(str(flags.module) ? { module: str(flags.module) as never } : {}),
            ...(str(flags.scene) ? { sceneId: str(flags.scene) } : {}),
          },
        });
        out(`Logged ${fb.id} (${fb.scope}${fb.target.module ? `, module ${fb.target.module}` : ""})`);
        return 0;
      }
      if (sub === "list") {
        const list = listFeedback(store, { status: str(flags.status) as never });
        if (!list.length) out("No feedback.");
        for (const f of list) out(`${f.id}  ${f.status.padEnd(8)} ${f.scope.padEnd(12)} ${(f.target.module ?? "-").padEnd(13)} ${f.text}`);
        const props = store.listProposals();
        if (props.length) {
          out("");
          out("Proposals:");
          for (const p of props) out(`${p.id}  ${p.status.padEnd(8)} ${p.module.padEnd(13)} ${p.file}  regression: ${p.regression ? (p.regression.passed ? "pass" : "FAIL") : "not run"}`);
        }
        return 0;
      }
      if (sub === "propose") {
        const before = str(flags["before-file"]) ? readFileSync(str(flags["before-file"])!, "utf8") : str(flags.before) ?? "";
        const after = str(flags["after-file"]) ? readFileSync(str(flags["after-file"])!, "utf8") : need(str(flags.after), "--after or --after-file");
        const p = createProposal(store, {
          feedbackIds: need(str(flags.feedback), "--feedback").split(",").map((s) => s.trim()),
          module: need(str(flags.module), "--module"),
          file: need(str(flags.file), "--file"),
          before,
          after,
          rationale: need(str(flags.rationale), "--rationale"),
          derivedFromMetricsOnly: flags.metrics === true,
        });
        out(`Proposal ${p.id} → ${p.file}`);
        const { result } = regressProposal(store, p.id);
        printRegress(out, result);
        return result.passed ? 0 : 1;
      }
      if (sub === "apply") {
        const p = approveAndApply(store, need(rest[1], "<proposalId>"));
        out(`Applied ${p.id}: ${p.module} → ${p.appliedVersion}`);
        return 0;
      }
      if (sub === "reject") {
        const p = rejectProposal(store, need(rest[1], "<proposalId>"));
        out(`Rejected ${p.id}`);
        return 0;
      }
      throw new Error(`Unknown feedback subcommand: ${sub ?? "(none)"}`);
    }
    case "approve": {
      const id = need(rest[0], "<id>");
      const target = need(rest[1], "<brief|script|final|publish>") as ApprovalTarget;
      try {
        const ep = approve(store, id, target);
        out(`Approved ${target} for ${ep.id}`);
        return 0;
      } catch (e) {
        if (e instanceof ApprovalError) {
          errOut(e.message);
          printFindings(errOut, e.findings);
          return 1;
        }
        throw e;
      }
    }
    case "regress": {
      const r = regress(store);
      warnModules();
      printRegress(out, r);
      return r.passed ? 0 : 1;
    }
    case "serve": {
      await serve({ root: store.root, port: str(flags.port) ? Number(flags.port) : undefined });
      return 0;
    }
    default:
      errOut(`Unknown command: ${cmd}`);
      out(HELP);
      return 1;
  }
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  if (existsSync(".env")) process.loadEnvFile(".env");
  run(process.argv.slice(2))
    .then((code) => {
      if (code !== 0 || process.argv[2] !== "serve") process.exitCode = code;
    })
    .catch((e: Error) => {
      console.error(`error: ${e.message}`);
      process.exitCode = 1;
    });
}
