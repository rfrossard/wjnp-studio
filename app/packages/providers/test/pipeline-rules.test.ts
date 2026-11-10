import { describe, expect, it } from "vitest";
import { GATE_RULES, type Episode } from "@wjnp/contracts";
import {
  EscalationExhaustedError,
  MockLLM,
  VerifierIndependenceError,
  critiqueScene,
  finalVerdict,
  meetsVerificationRule,
  validateCritique,
  verifyClaims,
  writeScript,
  type ScriptOut,
  reviewScenes,
} from "../src/index";
import { loadGolden, makeDeps, testRouter, tmpRoot } from "./helpers";

const withUnverified = (ep: Episode): Episode => ({ ...ep, claims: ep.claims.map((c) => ({ ...c, verdict: "unverified" as const, author: { model: "author-mid" } })) });

describe("verifier guard and code-side verification rule", () => {
  it("throws if the verifier model is identical to the author model", async () => {
    const root = tmpRoot();
    const deps = makeDeps(root, { router: testRouter({ verifier: { model: "author-mid" } }) });
    await expect(verifyClaims(withUnverified(loadGolden()), deps)).rejects.toBeInstanceOf(VerifierIndependenceError);
    expect(deps.verifierLlm.calls).toHaveLength(0);
  });

  it("throws if verifier and author are the same client object", async () => {
    const root = tmpRoot();
    const deps = makeDeps(root);
    await expect(verifyClaims(withUnverified(loadGolden()), { ...deps, verifierLlm: deps.llm })).rejects.toBeInstanceOf(VerifierIndependenceError);
  });

  it("the rule needs >=2 independent publishers and one primary", () => {
    const ep = loadGolden();
    const rules = { minIndependentSources: 2, requirePrimarySource: true };
    expect(meetsVerificationRule(ep.claims[0]!, ep.sources, rules).ok).toBe(true);
    const sameAgain = { ...ep.claims[0]!, evidence: [ep.claims[0]!.evidence[0]!, ep.claims[0]!.evidence[0]!] };
    expect(meetsVerificationRule(sameAgain, ep.sources, rules).ok).toBe(false); // one publisher twice
    const press2 = { ...ep.claims[0]!, evidence: [{ sourceId: "s-press", quote: "q" }, { sourceId: "s-press", quote: "q2" }] };
    expect(meetsVerificationRule(press2, ep.sources, rules).reasons.join()).toContain("primary");
    expect(finalVerdict("verified", { ok: false, publishers: [], hasPrimary: false, reasons: ["x"] }).verdict).toBe("partial");
  });

  it("a model 'verified' cannot override the rule; a passing rule cannot upgrade a model 'rejected'", async () => {
    const root = tmpRoot();
    const ep = withUnverified(loadGolden());
    // c-launch: keep (2 publishers + primary). c-share: single source only. c-quote: model will reject.
    ep.claims[1] = { ...ep.claims[1]!, evidence: [ep.claims[1]!.evidence[0]!] };
    const verifierLlm = new MockLLM({
      family: "verifier",
      handlers: {
        verify_claims: () => ({
          verdicts: [
            { claimId: "c-launch", reasons: [], verdict: "verified" },
            { claimId: "c-share", reasons: [], verdict: "verified" },
            { claimId: "c-quote", reasons: ["quote altered"], verdict: "rejected" },
          ],
        }),
      },
    });
    const out = await verifyClaims(ep, makeDeps(root, { verifierLlm }));
    const v = Object.fromEntries(out.claims.map((c) => [c.id, c.verdict]));
    expect(v).toEqual({ "c-launch": "verified", "c-share": "partial", "c-quote": "rejected" });
    expect(out.claims[1]!.notes).toContain("rule failed");
    expect(out.claims[0]!.verifier?.model).toBe("other-verifier");
  });

  it("escalation exhausted when the verifier leaves claims without a verdict", async () => {
    const root = tmpRoot();
    const verifierLlm = new MockLLM({ handlers: { verify_claims: () => ({ verdicts: [] }) } });
    await expect(verifyClaims(withUnverified(loadGolden()), makeDeps(root, { verifierLlm }))).rejects.toBeInstanceOf(EscalationExhaustedError);
  });
});

describe("writeScript", () => {
  const episode = (): Episode => {
    const ep = loadGolden();
    return { ...ep, scenes: [], post: undefined } as Episode;
  };

  it("fills the default skeleton into scenes that parse, first title_hook, last end_card, 3-4 inCut", async () => {
    const root = tmpRoot();
    const deps = makeDeps(root);
    const ep = await writeScript(episode(), deps);
    expect(ep.scenes[0]!.onScreen.template).toBe("title_hook");
    expect(ep.scenes.at(-1)!.onScreen.template).toBe("end_card");
    const cut = ep.scenes.filter((s) => s.inCut);
    expect(cut.length).toBeGreaterThanOrEqual(3);
    expect(cut.length).toBeLessThanOrEqual(4);
    const verified = new Set(ep.claims.filter((c) => c.verdict === "verified").map((c) => c.id));
    for (const s of ep.scenes) for (const id of s.claimIds) expect(verified.has(id)).toBe(true);
    expect(ep.scenes.filter((s) => s.isOpinion).every((s) => s.onScreen.template === "personal_take")).toBe(true);
    expect(ep.scenes.some((s) => s.onScreen.template === "stat")).toBe(true);
    expect(ep.brief.messages.some((m) => m.claimIds.length > 0)).toBe(true);
    expect(deps.llm.calls[0]!.prompt).toContain("<<<CONTEXT");
  });

  it("rejects references to unverified claims (escalates, then fails) and never returns them", async () => {
    const root = tmpRoot();
    const ep = episode();
    ep.claims[0] = { ...ep.claims[0]!, verdict: "partial" }; // c-launch no longer usable
    const llm = new MockLLM({
      handlers: {
        write_script: (ctx: any) => {
          // reference the partial claim on purpose
          const scenes = JSON.parse(JSON.stringify(ctx.skeleton.beats)).map((b: any, i: number) => ({
            beatId: b.id,
            style: ctx.allowedStyles[0],
            onScreen:
              b.templates[0] === "title_hook"
                ? { template: "title_hook", headline: "Hook" }
                : b.templates[0] === "end_card"
                  ? { template: "end_card", question: "Q?" }
                  : b.templates[0] === "personal_take"
                    ? { template: "personal_take", headline: "Take" }
                    : { template: "statement", headline: "H" },
            narration: Array(Math.round(b.targetSeconds * 2.5)).fill("word").join(" "),
            claimIds: i === 1 ? ["c-launch"] : [],
            isOpinion: b.templates[0] === "personal_take",
            inCut: false,
          }));
          return { scenes };
        },
      },
    });
    await expect(writeScript(ep, makeDeps(root, { llm }))).rejects.toThrow(/unverified claim "c-launch"/);
    expect(llm.calls.map((c) => c.model)).toEqual(["author-small", "author-mid", "author-frontier"].slice(1)); // write_script starts at mid
  });

  it("validateScript flags opinion outside personal_take, wrong first/last and numbers not in claims", async () => {
    const { validateScript, pickSkeleton } = await import("../src/index");
    const root = tmpRoot();
    const deps = makeDeps(root);
    const ep = episode();
    const good = await writeScript(ep, deps);
    const skeleton = pickSkeleton(deps.modules);
    const ctx = { claims: ep.claims, skeleton, brief: ep.brief, allowedStyles: ep.design.styles, modules: deps.modules };
    const toOut = (scenes: typeof good.scenes): ScriptOut => ({
      scenes: scenes.map((s, i) => ({ beatId: skeleton.beats[i]!.id, style: s.style, onScreen: s.onScreen, narration: s.narration.text, claimIds: s.claimIds, isOpinion: s.isOpinion, inCut: s.inCut })),
    });
    expect(validateScript(toOut(good.scenes), ctx)).toEqual([]);
    const tampered = toOut(good.scenes);
    tampered.scenes[1]!.isOpinion = true;
    tampered.scenes[1]!.narration += " exactly 77 percent of them agree";
    const problems = validateScript(tampered, ctx).join(" | ");
    expect(problems).toContain("opinion outside a personal_take");
    expect(problems).toContain("numbers not backed");
  });
});

describe("critique rules", () => {
  it("rejects a score of 5 while defects are listed", () => {
    expect(validateCritique({ defects: ["number looks off"], scores: { clarity: 5, accuracy: 3 } }, ["clarity", "accuracy"])).toContain("score 5");
    expect(validateCritique({ defects: [], scores: { clarity: 5, accuracy: 5 } }, ["clarity", "accuracy"])).toBeUndefined();
    expect(validateCritique({ defects: ["x"], scores: { clarity: 4 } }, ["clarity", "accuracy"])).toContain("missing");
  });

  it("critiqueScene retries the critic and fails if it keeps giving 5 with defects", async () => {
    const root = tmpRoot();
    const base = await writeScript({ ...loadGolden(), scenes: [] }, makeDeps(root));
    const verifierLlm = new MockLLM({ handlers: { critique_scene: () => ({ defects: ["fits badly"], scores: { clarity: 5, accuracy: 5, tone: 5, visual_fit: 5 } }) } });
    await expect(critiqueScene(base, makeDeps(root, { verifierLlm }), { sceneId: "s02" })).rejects.toThrow(/score 5/);
    expect(verifierLlm.calls).toHaveLength(2);
    expect(verifierLlm.calls.every((c) => c.model === "other-critic")).toBe(true);
  });

  it("critic must differ from the author model", async () => {
    const root = tmpRoot();
    const base = await writeScript({ ...loadGolden(), scenes: [] }, makeDeps(root));
    const deps = makeDeps(root, { router: testRouter({ critic: { model: "author-mid" } }) });
    await expect(critiqueScene(base, deps, { sceneId: "s02" })).rejects.toBeInstanceOf(VerifierIndependenceError);
  });

  it("reviewScenes rewrites a failing scene up to maxRedoAttempts and records the gate", async () => {
    const root = tmpRoot();
    const base = await writeScript({ ...loadGolden(), scenes: [] }, makeDeps(root));
    let n = 0;
    const verifierLlm = new MockLLM({
      handlers: {
        critique_scene: (ctx: any) => {
          const failing = ctx.scene.id === "s02" && n++ < 1;
          return { defects: failing ? ["too vague"] : [], scores: { clarity: failing ? 2 : 4, accuracy: 4, tone: 4, visual_fit: 4 } };
        },
      },
    });
    const deps = makeDeps(root, { verifierLlm });
    const out = await reviewScenes(base, deps);
    expect(out.scenes.every((s) => s.gate?.pass)).toBe(true);
    expect(out.scenes.find((s) => s.id === "s02")!.gate!.attempts).toBe(1);
    expect(deps.llm.calls.filter((c) => c.task === "fill_scene")).toHaveLength(1);
    expect(GATE_RULES.maxRedoAttempts).toBeGreaterThanOrEqual(1);
  });
});
