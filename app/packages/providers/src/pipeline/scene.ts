import { GATE_RULES, OnScreen, type Critique, type Episode, type Scene } from "@wjnp/contracts";
import { z } from "zod";
import { VerifierIndependenceError } from "../errors";
import { guardText } from "../guard";
import { wordCount } from "../util";
import { clone, collectStrings, runLlmTask, type PipelineDeps } from "./common";
import { numbersNotInClaims } from "./script";

const FillOut = z.object({ onScreen: OnScreen, narration: z.string().min(1) });
type FillOut = z.infer<typeof FillOut>;

function findScene(ep: Episode, sceneId: string): Scene {
  const s = ep.scenes.find((x) => x.id === sceneId);
  if (!s) throw new Error(`scene ${sceneId} not found`);
  return s;
}

/** Small tier: rewrite one scene (same template, same claims) to fix the listed defects. */
export async function fillScene(episode: Episode, deps: PipelineDeps, args: { sceneId: string; defects?: string[] }): Promise<Episode> {
  const ep = clone(episode);
  const scene = findScene(ep, args.sceneId);
  const refs = ep.claims.filter((c) => scene.claimIds.includes(c.id));
  if (refs.some((c) => c.verdict !== "verified")) throw new Error(`scene ${scene.id} references an unverified claim`);
  const before = wordCount(scene.narration.text);

  const { value } = await runLlmTask(ep, deps, {
    id: `fill-${scene.id}`,
    kind: "fill_scene",
    prompt: "fill_scene",
    sceneId: scene.id,
    context: {
      scene: { id: scene.id, onScreen: scene.onScreen, narration: scene.narration.text, isOpinion: scene.isOpinion },
      defects: args.defects ?? [],
      claims: refs.map((c) => ({ id: c.id, kind: c.kind, text: c.text, ...(c.value ? { value: c.value } : {}), quotes: c.evidence.map((e) => e.quote) })),
      brief: { thesis: ep.brief.thesis, tone: ep.brief.tone, messages: ep.brief.messages.map((m) => ({ id: m.id, text: m.text })) },
    },
    schema: FillOut,
    validate: (out: FillOut) => {
      const p: string[] = [];
      if (out.onScreen.template !== scene.onScreen.template) p.push(`template changed to ${out.onScreen.template}`);
      if ("claimId" in out.onScreen && "claimId" in scene.onScreen && out.onScreen.claimId !== scene.onScreen.claimId) p.push("claimId changed");
      const n = wordCount(out.narration);
      if (n < before * 0.6 || n > before * 1.4) p.push(`narration length ${n} vs ${before} words`);
      const strings = [...collectStrings(out.onScreen).filter((t) => t !== "What's just now possible?"), out.narration];
      const nums = numbersNotInClaims(strings, refs);
      if (nums.length) p.push(`numbers not backed by claims: ${nums.join(", ")}`);
      const bad = guardText(strings.join("\n"), deps.modules);
      if (bad.length) p.push(bad.join(", "));
      return p.length ? p.join("; ") : undefined;
    },
  });
  scene.onScreen = value.onScreen;
  scene.narration = { voiceId: scene.narration.voiceId, text: value.narration.trim() }; // audio is stale now
  delete scene.durationFrames;
  return ep;
}

export const CritiqueOut = z.object({ defects: z.array(z.string()), scores: z.record(z.number().int().min(1).max(5)) });
export type CritiqueOut = z.infer<typeof CritiqueOut>;

/** Code-side critique rules: all criteria scored; a 5 is only allowed with an empty defect list. */
export function validateCritique(c: CritiqueOut, criteria: string[]): string | undefined {
  const missing = criteria.filter((id) => !(id in c.scores));
  if (missing.length) return `missing scores: ${missing.join(", ")}`;
  const fives = Object.entries(c.scores).filter(([, v]) => v === 5).map(([k]) => k);
  if (fives.length && c.defects.some((d) => d.trim().length > 0)) {
    return `score 5 on ${fives.join(", ")} while ${c.defects.length} defect(s) are listed`;
  }
  return undefined;
}

export function assertIndependentCritic(ep: Episode, deps: PipelineDeps, criticModel: string): void {
  const authors = new Set<string>([
    deps.router.resolve("write_script").model,
    deps.router.resolve("fill_scene").model,
    ...(ep.plan?.tasks ?? []).filter((t) => t.kind === "write_script" || t.kind === "fill_scene").map((t) => t.model ?? ""),
  ]);
  if ([...authors].some((m) => m && m.toLowerCase() === criticModel.toLowerCase())) {
    throw new VerifierIndependenceError(`critic model "${criticModel}" is also an author model; the critic must differ from the author`);
  }
  if ((deps.verifierLlm as unknown) === (deps.llm as unknown)) throw new VerifierIndependenceError("critic client is the same as the author client");
}

/** Critic model (different family): defects first, then scores. Writes scene.gate. */
export async function critiqueScene(episode: Episode, deps: PipelineDeps, args: { sceneId: string }): Promise<Episode> {
  const ep = clone(episode);
  const scene = findScene(ep, args.sceneId);
  const criticModel = deps.router.resolve("critique_scene").model;
  assertIndependentCritic(ep, deps, criticModel);
  const criteria = deps.modules.gateCriteria.map((c) => c.id);
  const refs = ep.claims.filter((c) => scene.claimIds.includes(c.id));
  const authorModel = ep.plan?.tasks.find((t) => t.kind === "fill_scene" && t.sceneId === scene.id)?.model ?? ep.plan?.tasks.find((t) => t.kind === "write_script")?.model;

  const { value, model } = await runLlmTask(ep, deps, {
    id: `critique-${scene.id}`,
    kind: "critique_scene",
    prompt: "critique_scene",
    sceneId: scene.id,
    useVerifierLlm: true,
    context: {
      scene: { id: scene.id, onScreen: scene.onScreen, narration: scene.narration.text, isOpinion: scene.isOpinion },
      claims: refs.map((c) => ({ id: c.id, kind: c.kind, text: c.text, ...(c.value ? { value: c.value } : {}), quotes: c.evidence.map((e) => e.quote) })),
      criteria,
    },
    schema: CritiqueOut,
    validate: (c: CritiqueOut) => validateCritique(c, criteria),
  });
  const critique: Critique = { reviewerModel: model, ...(authorModel ? { authorModel } : {}), defects: value.defects, scores: value.scores };
  const pass = Object.values(value.scores).every((v) => v >= GATE_RULES.minScore);
  scene.gate = {
    checks: [{ id: "critic", pass, detail: pass ? "all scores >= minScore" : `defects: ${value.defects.join(" | ")}` }],
    critique,
    attempts: scene.gate?.attempts ?? 0,
    pass,
  };
  return ep;
}

/** Critique every scene; on failure rewrite it (up to GATE_RULES.maxRedoAttempts) and critique again. */
export async function reviewScenes(episode: Episode, deps: PipelineDeps): Promise<Episode> {
  let ep = clone(episode);
  for (const id of ep.scenes.map((s) => s.id)) {
    ep = await critiqueScene(ep, deps, { sceneId: id });
    let attempts = 0;
    while (!findScene(ep, id).gate!.pass && attempts < GATE_RULES.maxRedoAttempts) {
      attempts++;
      const defects = findScene(ep, id).gate!.critique?.defects ?? [];
      ep = await fillScene(ep, deps, { sceneId: id, defects });
      ep = await critiqueScene(ep, deps, { sceneId: id });
      findScene(ep, id).gate!.attempts = attempts;
    }
  }
  return ep;
}
