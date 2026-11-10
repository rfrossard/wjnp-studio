import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, posix } from "node:path";
import { ModuleName, PROTECTED_MODULES, Proposal, type Finding } from "@wjnp/contracts";
import { sha256Hex } from "./accent.ts";
import { updateFeedback } from "./feedback.ts";
import type { Store } from "./store.ts";
import { contextFromStore } from "./validators/context.ts";
import { runGate } from "./validators/gate.ts";

export class ProtectedModuleError extends Error {
  status = 403 as const;
}
export class ConflictError extends Error {
  status = 409 as const;
}

/* ------------------------------ regression ------------------------------ */

export interface BaselineFinding {
  rule: string;
  severity: Finding["severity"];
  sceneId?: string;
  claimId?: string;
}
export interface Baseline {
  episodeId: string;
  createdAt: string;
  gatePass: boolean;
  durations: { masterSeconds: number; cutSeconds: number };
  findings: BaselineFinding[];
  moduleVersions: Record<string, string>;
}
export interface RegressEpisodeResult {
  episodeId: string;
  passed: boolean;
  baselineCreated: boolean;
  gatePass: boolean;
  baselineGatePass: boolean;
  durations: { masterSeconds: number; cutSeconds: number };
  newErrors: BaselineFinding[];
  resolvedErrors: BaselineFinding[];
  newWarnings: BaselineFinding[];
  notes: string[];
}
export interface RegressResult {
  passed: boolean;
  episodes: RegressEpisodeResult[];
}

const key = (f: BaselineFinding) => `${f.severity}|${f.rule}|${f.sceneId ?? ""}|${f.claimId ?? ""}`;
const slim = (f: Finding): BaselineFinding => ({
  rule: f.rule,
  severity: f.severity,
  ...(f.sceneId ? { sceneId: f.sceneId } : {}),
  ...(f.claimId ? { claimId: f.claimId } : {}),
});

/** Multiset difference a − b by key. */
function minus(a: BaselineFinding[], b: BaselineFinding[]): BaselineFinding[] {
  const counts = new Map<string, number>();
  for (const f of b) counts.set(key(f), (counts.get(key(f)) ?? 0) + 1);
  const out: BaselineFinding[] = [];
  for (const f of a) {
    const n = counts.get(key(f)) ?? 0;
    if (n > 0) counts.set(key(f), n - 1);
    else out.push(f);
  }
  return out;
}

function snapshot(store: Store, id: string, now: Date): Baseline {
  const ep = store.getEpisode(id);
  const r = runGate(ep, contextFromStore(store));
  return {
    episodeId: id,
    createdAt: now.toISOString(),
    gatePass: r.gatePass,
    durations: r.durations,
    findings: r.findings.filter((f) => f.severity !== "info").map(slim),
    moduleVersions: Object.fromEntries(store.listModules().map((m) => [m.name, m.version])),
  };
}

/**
 * Run every golden episode through the gate and compare with its stored `baseline.json`
 * (created from the current, un-overridden modules if absent). Passes when no new errors
 * appear and no episode that passed the gate stops passing. Does not require gatePass.
 */
export function regress(store: Store, opts: { override?: { file: string; content: string }; now?: Date } = {}): RegressResult {
  const now = opts.now ?? new Date();
  const view = opts.override ? store.withOverride(opts.override.file, opts.override.content) : store;
  const episodes: RegressEpisodeResult[] = [];
  for (const id of store.goldenIds()) {
    const file = join(store.episodeDir(id), "baseline.json");
    let baselineCreated = false;
    let baseline: Baseline;
    if (existsSync(file)) baseline = JSON.parse(readFileSync(file, "utf8")) as Baseline;
    else {
      baseline = snapshot(store, id, now);
      writeFileSync(file, JSON.stringify(baseline, null, 2) + "\n");
      baselineCreated = true;
    }
    const cur = snapshot(view, id, now);
    const errors = (fs: BaselineFinding[]) => fs.filter((f) => f.severity === "error");
    const newErrors = minus(errors(cur.findings), errors(baseline.findings));
    const resolvedErrors = minus(errors(baseline.findings), errors(cur.findings));
    const warnings = (fs: BaselineFinding[]) => fs.filter((f) => f.severity === "warning");
    const newWarnings = minus(warnings(cur.findings), warnings(baseline.findings));
    const notes: string[] = [];
    if (baselineCreated) notes.push("baseline created");
    if (baseline.gatePass && !cur.gatePass) notes.push("gate used to pass and now fails");
    if (cur.durations.masterSeconds !== baseline.durations.masterSeconds || cur.durations.cutSeconds !== baseline.durations.cutSeconds)
      notes.push(`durations changed: master ${baseline.durations.masterSeconds}→${cur.durations.masterSeconds} s, cut ${baseline.durations.cutSeconds}→${cur.durations.cutSeconds} s`);
    if (newWarnings.length) notes.push(`${newWarnings.length} new warning(s)`);
    if (resolvedErrors.length) notes.push(`${resolvedErrors.length} baseline error(s) resolved`);
    const passed = newErrors.length === 0 && !(baseline.gatePass && !cur.gatePass);
    episodes.push({
      episodeId: id,
      passed,
      baselineCreated,
      gatePass: cur.gatePass,
      baselineGatePass: baseline.gatePass,
      durations: cur.durations,
      newErrors,
      resolvedErrors,
      newWarnings,
      notes,
    });
  }
  return { passed: episodes.every((e) => e.passed), episodes };
}

/* ------------------------------ proposals ------------------------------ */

export interface ProposalInput {
  feedbackIds: string[];
  module: string;
  file: string;
  before: string;
  after: string;
  rationale: string;
  derivedFromMetricsOnly?: boolean;
}

/** Normalise and check `file` is inside modules/<module>/ (and is not the manifest/changelog). */
export function moduleFilePath(module: ModuleName, file: string): string {
  let f = file.replace(/\\/g, "/").replace(/^\.\//, "");
  if (!f.startsWith("modules/")) f = `modules/${module}/${f}`;
  const norm = posix.normalize(f);
  const prefix = `modules/${module}/`;
  if (!norm.startsWith(prefix) || norm.split("/").includes("..") || norm.length <= prefix.length)
    throw new Error(`Proposal file must be inside ${prefix}: ${file}`);
  const name = norm.slice(prefix.length);
  if (name === "manifest.json" || name === "CHANGELOG.md") throw new Error(`${name} is managed by applyProposal and cannot be proposed`);
  return norm;
}

function occurrences(hay: string, needle: string): number {
  if (!needle) return 0;
  let n = 0;
  for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) n++;
  return n;
}

/** The file content after the proposal (exact, single replacement; `before: ""` creates a new/empty file). */
export function proposedContent(current: string | undefined, p: Pick<Proposal, "before" | "after" | "file">): string {
  const cur = current ?? "";
  if (p.before === "") {
    if (cur !== "") throw new ConflictError(`${p.file} is not empty: "before" must quote the exact text to replace`);
    return p.after;
  }
  const n = occurrences(cur, p.before);
  if (n !== 1) throw new ConflictError(`"before" text must occur exactly once in ${p.file} (found ${n})`);
  const i = cur.indexOf(p.before);
  return cur.slice(0, i) + p.after + cur.slice(i + p.before.length);
}

function assertNotProtected(module: ModuleName, metricsOnly: boolean) {
  if (metricsOnly && PROTECTED_MODULES.includes(module))
    throw new ProtectedModuleError(`Module "${module}" is protected: it changes only by explicit owner instruction, never from a metrics-derived proposal`);
}

export function createProposal(store: Store, input: ProposalInput, opts: { now?: Date } = {}): Proposal {
  const module = ModuleName.parse(input.module);
  if (!input.feedbackIds.length) throw new Error("A proposal needs at least one feedback id");
  const feedback = input.feedbackIds.map((id) => {
    const f = store.getFeedback(id);
    if (!f) throw new Error(`Feedback not found: ${id}`);
    return f;
  });
  const metricsOnly = !!input.derivedFromMetricsOnly || feedback.every((f) => f.kind === "metric");
  assertNotProtected(module, metricsOnly);
  const file = moduleFilePath(module, input.file);
  proposedContent(store.readText(file), { ...input, file }); // throws if `before` does not match exactly once

  const now = opts.now ?? new Date();
  const at = now.toISOString();
  const id = `prop-${at.replace(/[-:TZ.]/g, "").slice(0, 14)}-${sha256Hex(`${at}\n${file}\n${input.before}\n${input.after}`).slice(0, 6)}`;
  const p = store.saveProposal(
    Proposal.parse({
      id,
      createdAt: at,
      feedbackIds: input.feedbackIds,
      module,
      file,
      before: input.before,
      after: input.after,
      rationale: input.rationale,
      derivedFromMetricsOnly: metricsOnly,
      status: "pending",
    }),
  );
  for (const f of feedback) updateFeedback(store, f.id, { status: "proposed", proposalId: p.id });
  return p;
}

/** Regress with the proposal applied in memory only; records the result on the proposal. */
export function regressProposal(store: Store, id: string, opts: { now?: Date } = {}): { proposal: Proposal; result: RegressResult } {
  const p = store.getProposal(id);
  const content = proposedContent(store.readText(p.file), p);
  const notes: string[] = [];
  let jsonOk = true;
  if (p.file.endsWith(".json")) {
    try {
      JSON.parse(content);
    } catch (e) {
      jsonOk = false;
      notes.push(`proposed ${p.file} is not valid JSON: ${(e as Error).message}`);
    }
  }
  const result = regress(store, { override: { file: p.file, content }, now: opts.now });
  for (const e of result.episodes) {
    const bits = [`${e.episodeId}: ${e.passed ? "pass" : "FAIL"}`];
    if (e.newErrors.length) bits.push(`new errors ${e.newErrors.map((f) => f.rule).join(", ")}`);
    bits.push(...e.notes);
    notes.push(bits.join("; "));
  }
  if (!result.episodes.length) notes.push("no golden episodes found");
  const passed = jsonOk && result.passed;
  const proposal = store.saveProposal({ ...p, regression: { ran: true, passed, notes: notes.join("\n") } });
  return { proposal, result: { ...result, passed } };
}

export function approveProposal(store: Store, id: string): Proposal {
  const p = store.getProposal(id);
  if (p.status !== "pending" && p.status !== "approved") throw new ConflictError(`Proposal ${id} is ${p.status}`);
  assertNotProtected(p.module, p.derivedFromMetricsOnly);
  return store.saveProposal({ ...p, status: "approved" });
}

export function rejectProposal(store: Store, id: string): Proposal {
  const p = store.getProposal(id);
  if (p.status === "applied") throw new ConflictError(`Proposal ${id} is already applied`);
  const out = store.saveProposal({ ...p, status: "rejected" });
  for (const fid of p.feedbackIds) if (store.getFeedback(fid)) updateFeedback(store, fid, { status: "rejected" });
  return out;
}

export function bumpPatch(version: string): string {
  const [a, b, c] = version.split(".").map((n) => parseInt(n, 10));
  return `${a ?? 0}.${b ?? 0}.${(c ?? 0) + 1}`;
}

/** Write the change. Requires status approved and a passed regression. Bumps manifest patch, appends CHANGELOG, marks feedback applied. */
export function applyProposal(store: Store, id: string, opts: { now?: Date } = {}): Proposal {
  const p = store.getProposal(id);
  if (p.status !== "approved") throw new ConflictError(`Proposal ${id} must be approved before applying (status: ${p.status})`);
  if (!p.regression?.ran || !p.regression.passed) throw new ConflictError(`Proposal ${id} needs a passed regression before applying`);
  assertNotProtected(p.module, p.derivedFromMetricsOnly);
  const content = proposedContent(store.readText(p.file), p);
  store.writeText(p.file, content);

  const manifest = store.getManifest(p.module);
  const version = bumpPatch(manifest.version);
  const rel = p.file.slice(`modules/${p.module}/`.length);
  const files = manifest.files.includes(rel) ? manifest.files : [...manifest.files, rel];
  store.writeText(`modules/${p.module}/manifest.json`, JSON.stringify({ ...manifest, version, files }, null, 2) + "\n");

  const date = (opts.now ?? new Date()).toISOString().slice(0, 10);
  const clPath = `modules/${p.module}/CHANGELOG.md`;
  const cl = store.readText(clPath) ?? `# ${p.module} changelog\n`;
  const entry = `\n## ${version} — ${date}\n\n- ${p.rationale}\n- file: \`${p.file}\` · proposal: ${p.id} · feedback: ${p.feedbackIds.join(", ")}\n`;
  store.writeText(clPath, cl.replace(/\s*$/, "\n") + entry);

  for (const fid of p.feedbackIds) if (store.getFeedback(fid)) updateFeedback(store, fid, { status: "applied" });
  return store.saveProposal({ ...p, status: "applied", appliedVersion: version });
}

/** Owner approval from UI/API/CLI: approve, regress if not yet run, then apply. */
export function approveAndApply(store: Store, id: string, opts: { now?: Date } = {}): Proposal {
  approveProposal(store, id);
  let p = store.getProposal(id);
  if (!p.regression?.ran) p = regressProposal(store, id, opts).proposal;
  if (!p.regression?.passed) throw new ConflictError(`Regression failed for ${id}:\n${p.regression?.notes ?? ""}`);
  return applyProposal(store, id, opts);
}
