import { DURATION_RULES, Id, OnScreen, StyleId, type Brief, type Claim, type Episode, type Scene } from "@wjnp/contracts";
import { z } from "zod";
import { guardText } from "../guard";
import type { ModulesData, Skeleton } from "../modules";
import { DEFAULT_SKELETON } from "../modules";
import { wordCount } from "../util";
import { clone, collectStrings, runLlmTask, type PipelineDeps } from "./common";

export const ScriptOut = z.object({
  scenes: z
    .array(
      z.object({
        beatId: z.string(),
        style: StyleId,
        onScreen: OnScreen,
        narration: z.string().min(1),
        claimIds: z.array(Id).default([]),
        messageId: Id.optional(),
        isOpinion: z.boolean().default(false),
        inCut: z.boolean().default(false),
      }),
    )
    .min(2),
});
export type ScriptOut = z.infer<typeof ScriptOut>;

const WORDS_PER_SECOND = DURATION_RULES.wordsPerMinute / 60;
/** per-scene length tolerance around the beat target; total tolerance is tighter */
const SCENE_TOLERANCE = 0.4;
const TOTAL_TOLERANCE = 0.15;

export interface ScriptContext {
  claims: Claim[];
  skeleton: Skeleton;
  brief: Brief;
  allowedStyles: string[];
  modules: ModulesData;
}

const digitsIn = (s: string): string[] => (s.match(/\d[\d.,]*/g) ?? []).map((d) => d.replace(/[.,]+$/, "").replace(/,/g, ""));

/** Every digit sequence shown or spoken must come from a claim the scene references. */
export function numbersNotInClaims(strings: string[], refs: Claim[]): string[] {
  const allowed = new Set<string>();
  for (const c of refs) {
    for (const t of [c.text, c.value?.display ?? "", ...c.evidence.map((e) => e.quote)]) digitsIn(t).forEach((d) => allowed.add(d));
  }
  return [...new Set(strings.flatMap(digitsIn).filter((d) => !allowed.has(d)))];
}

export function sceneClaimIds(s: { claimIds: string[]; onScreen: OnScreen }): string[] {
  const ids = new Set(s.claimIds);
  if ("claimId" in s.onScreen) ids.add(s.onScreen.claimId);
  return [...ids];
}

/** Code-side rules for a script. Returns a list of problems; empty means acceptable. */
export function validateScript(out: ScriptOut, ctx: ScriptContext): string[] {
  const problems: string[] = [];
  const beats = ctx.skeleton.beats;
  const byId = new Map(ctx.claims.map((c) => [c.id, c]));
  const messageIds = new Set(ctx.brief.messages.map((m) => m.id));
  const catalog = new Map(ctx.modules.catalog.map((c) => [c.id, c]));

  if (out.scenes.length !== beats.length) problems.push(`expected ${beats.length} scenes (one per beat), got ${out.scenes.length}`);
  let totalWords = 0;
  let targetWords = 0;
  out.scenes.forEach((s, i) => {
    const tag = `scene ${i + 1}`;
    const beat = beats[i];
    if (beat) {
      if (s.beatId !== beat.id) problems.push(`${tag}: beatId "${s.beatId}" should be "${beat.id}"`);
      if (!beat.templates.includes(s.onScreen.template)) problems.push(`${tag}: template ${s.onScreen.template} not allowed by beat ${beat.id}`);
      const target = beat.targetSeconds * WORDS_PER_SECOND;
      const n = wordCount(s.narration);
      totalWords += n;
      targetWords += target;
      if (n < target * (1 - SCENE_TOLERANCE) || n > target * (1 + SCENE_TOLERANCE)) problems.push(`${tag}: ${n} words, beat wants about ${Math.round(target)}`);
    }
    if (s.onScreen.template === "clip") problems.push(`${tag}: clip scenes are not written by the model`);
    if (!ctx.allowedStyles.includes(s.style)) problems.push(`${tag}: style ${s.style} not in episode styles`);
    const entry = catalog.get(s.onScreen.template);
    if (entry && entry.styles.length && !entry.styles.includes(s.style)) problems.push(`${tag}: style ${s.style} not allowed for ${s.onScreen.template}`);

    const ids = sceneClaimIds(s);
    for (const id of ids) {
      const c = byId.get(id);
      if (!c) problems.push(`${tag}: references unknown claim "${id}"`);
      else if (c.verdict !== "verified") problems.push(`${tag}: references unverified claim "${id}" (${c.verdict})`);
    }
    if (s.onScreen.template === "stat" && byId.get(s.onScreen.claimId)?.kind !== "number") problems.push(`${tag}: stat needs a number claim`);
    if (s.onScreen.template === "quote_card" && byId.get(s.onScreen.claimId)?.kind !== "quote") problems.push(`${tag}: quote_card needs a quote claim`);
    if (s.messageId && !messageIds.has(s.messageId)) problems.push(`${tag}: unknown messageId "${s.messageId}"`);

    const isTake = s.onScreen.template === "personal_take";
    if (s.isOpinion && !isTake) problems.push(`${tag}: opinion outside a personal_take scene`);
    if (isTake && !s.isOpinion) problems.push(`${tag}: personal_take must have isOpinion=true`);

    const refs = ids.map((id) => byId.get(id)).filter((c): c is Claim => !!c);
    const shown = collectStrings(s.onScreen).filter((t) => t !== "What's just now possible?");
    const badNums = numbersNotInClaims([...shown, s.narration], refs);
    if (badNums.length) problems.push(`${tag}: numbers not backed by a referenced claim: ${badNums.join(", ")}`);
    const bad = guardText([...shown, s.narration].join("\n"), ctx.modules);
    if (bad.length) problems.push(`${tag}: ${bad.join(", ")}`);
  });
  if (out.scenes[0]?.onScreen.template !== "title_hook") problems.push("first scene must be title_hook");
  if (out.scenes[out.scenes.length - 1]?.onScreen.template !== "end_card") problems.push("last scene must be end_card");
  if (targetWords > 0 && (totalWords < targetWords * (1 - TOTAL_TOLERANCE) || totalWords > targetWords * (1 + TOTAL_TOLERANCE))) {
    problems.push(`total narration ${totalWords} words, skeleton wants about ${Math.round(targetWords)}`);
  }
  return problems;
}

const CUT_PRIORITY: OnScreen["template"][] = ["title_hook", "end_card", "personal_take", "stat", "quote_card"];

/** 3-4 scenes inCut. Keeps the model's choice if valid; otherwise picks by fixed priority. */
export function normalizeInCut(flags: boolean[], templates: OnScreen["template"][]): boolean[] {
  const n = flags.filter(Boolean).length;
  if (n >= 3 && n <= 4) return flags;
  const order = templates
    .map((t, i) => ({ i, rank: CUT_PRIORITY.indexOf(t) < 0 ? CUT_PRIORITY.length + i : CUT_PRIORITY.indexOf(t) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i);
  const want = Math.min(4, templates.length);
  const keep = new Set(order.slice(0, want).map((o) => o.i));
  return templates.map((_, i) => keep.has(i));
}

export function pickSkeleton(modules: ModulesData, skeletonId?: string): Skeleton {
  const list = modules.skeletons.length ? modules.skeletons : [DEFAULT_SKELETON];
  if (skeletonId) {
    const s = list.find((x) => x.id === skeletonId);
    if (!s) throw new Error(`skeleton "${skeletonId}" not found in modules/voice/skeletons.json`);
    return s;
  }
  return list[0]!;
}

/** Mid tier: fills a skeleton into scenes. Only verified claims may be referenced. */
export async function writeScript(episode: Episode, deps: PipelineDeps, opts: { skeletonId?: string } = {}): Promise<Episode> {
  const ep = clone(episode);
  const verified = ep.claims.filter((c) => c.verdict === "verified");
  if (verified.length === 0) throw new Error("writeScript: no verified claims; verify claims first");
  const skeleton = pickSkeleton(deps.modules, opts.skeletonId);
  const ctx: ScriptContext = { claims: ep.claims, skeleton, brief: ep.brief, allowedStyles: ep.design.styles, modules: deps.modules };

  const { value } = await runLlmTask(ep, deps, {
    id: "write-script",
    kind: "write_script",
    prompt: "write_script",
    maxTokens: 16000,
    context: {
      brief: ep.brief,
      verifiedClaims: verified.map((c) => ({
        id: c.id,
        kind: c.kind,
        text: c.text,
        ...(c.value ? { value: c.value } : {}),
        ...(c.speaker ? { speaker: c.speaker } : {}),
        quotes: c.evidence.map((e) => e.quote),
      })),
      skeleton,
      allowedStyles: ep.design.styles,
      wordsPerSecond: WORDS_PER_SECOND,
    },
    schema: ScriptOut,
    validate: (out: ScriptOut) => {
      const p = validateScript(out, ctx);
      return p.length ? p.slice(0, 8).join("; ") : undefined;
    },
  });

  const cut = normalizeInCut(value.scenes.map((s) => s.inCut), value.scenes.map((s) => s.onScreen.template));
  ep.scenes = value.scenes.map((s, i): Scene => {
    const messageId = s.messageId;
    return {
      id: `s${String(i + 1).padStart(2, "0")}`,
      order: i,
      style: s.style,
      onScreen: s.onScreen,
      narration: { voiceId: ep.audio.narratorVoiceId, text: s.narration.trim() },
      claimIds: sceneClaimIds(s),
      visualAssetIds: [],
      ...(messageId ? { messageId } : {}),
      isOpinion: s.isOpinion,
      inCut: cut[i]!,
      state: "draft",
    };
  });
  // message -> claims, derived from the scenes (deterministic, not asked from a model)
  ep.brief.messages = ep.brief.messages.map((m) => ({
    ...m,
    claimIds: [...new Set(ep.scenes.filter((s) => s.messageId === m.id).flatMap((s) => s.claimIds))],
  }));
  return ep;
}
