import { Tone, type CostEntry, type Episode, type ModelTier, type TaskKind } from "@wjnp/contracts";
import type { LLM, JsonSchema } from "../interfaces";
import type { Music, TTS } from "../interfaces";
import type { ModulesData } from "../modules";
import type { Router } from "../router";
import { contextBlock, loadPrompt, type PromptName } from "../prompts";

export interface PipelineDeps {
  /** author models (brainstorm, extract, script, scene, post) */
  llm: LLM;
  /** verifier and critic: a different model family from the author */
  verifierLlm: LLM;
  tts: TTS;
  /** background-music generator; only needed when the music step must generate a track that isn't cached yet */
  music?: Music;
  modules: ModulesData;
  router: Router;
  now: () => Date;
  /** repo root (episodes/<id>/cache lives below it) */
  root: string;
  /** costs of OTHER episodes this ISO week, for the weekly budget check */
  otherEpisodeCosts?: CostEntry[];
  /** set only after the owner explicitly OK'd spending above the weekly budget */
  ownerApprovedSpend?: boolean;
  /** fixed tail added to every scene (frames); golden fixture implies 20 */
  tailFrames?: number;
  estimateTtsUsd?: (text: string) => number;
  estimateMusicUsd?: (seconds: number) => number;
  promptsDir?: string;
}

export const DEFAULT_TAIL_FRAMES = 20;

export const clone = <T>(x: T): T => structuredClone(x);

export function ensurePlan(ep: Episode): NonNullable<Episode["plan"]> {
  ep.plan ??= { tasks: [], escalations: [] };
  return ep.plan;
}

export const voiceSpecText = (m: ModulesData) => m.voiceSpec.trim() || "(no voice-spec.md found: keep it conversational, concrete and short)";

export interface LlmTaskOptions<T> {
  id: string;
  kind: TaskKind;
  prompt: PromptName;
  context: unknown;
  extraVars?: Record<string, string>;
  schema: JsonSchema<T>;
  validate?: (value: T) => string | null | undefined | void;
  sceneId?: string;
  /** verifier/critic steps go through deps.verifierLlm */
  useVerifierLlm?: boolean;
  maxTokens?: number;
}

/** Runs one LLM task with escalation; mutates `ep` (plan, costs) and returns the parsed value. */
export async function runLlmTask<T>(ep: Episode, deps: PipelineDeps, o: LlmTaskOptions<T>): Promise<{ value: T; model: string; tier: ModelTier }> {
  const llm = o.useVerifierLlm ? deps.verifierLlm : deps.llm;
  const rendered = loadPrompt(
    o.prompt,
    {
      voice_spec: voiceSpecText(deps.modules),
      context: contextBlock(o.context),
      tones: JSON.stringify(Tone.options),
      criteria_json: JSON.stringify(Object.fromEntries(deps.modules.gateCriteria.map((c) => [c.id, "1-5"]))),
      ...(o.extraVars ?? {}),
    },
    deps.promptsDir,
  );
  const plan = ensurePlan(ep);
  const task = { id: o.id, kind: o.kind, ...(o.sceneId ? { sceneId: o.sceneId } : {}) };
  try {
    const r = await deps.router.runWithEscalation<T>({
      task,
      plan,
      now: deps.now,
      run: async ({ model }) => {
        const res = await llm.complete({
          model,
          system: rendered.system,
          prompt: rendered.prompt,
          schema: o.schema,
          task: o.kind,
          ...(o.maxTokens ? { maxTokens: o.maxTokens } : {}),
        });
        return { value: res.data, usd: res.usd, provider: llm.family };
      },
      ...(o.validate ? { validate: (v: T) => o.validate!(v) } : {}),
    });
    ep.costs.push(...r.costs);
    return { value: r.value, model: r.model, tier: r.tier };
  } catch (e) {
    const costs = (e as { costs?: CostEntry[] }).costs;
    if (Array.isArray(costs)) ep.costs.push(...costs); // money spent on failed attempts is still spent
    throw e;
  }
}

export const slug = (s: string, fallback: string): string => {
  const x = s.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return /^[a-z0-9]/.test(x) ? x : fallback;
};

export const addDays = (d: Date, days: number): string => new Date(d.getTime() + days * 86400000).toISOString().slice(0, 10);

/** All string values of an object tree (for guard and number checks). */
export function collectStrings(x: unknown, out: string[] = []): string[] {
  if (typeof x === "string") out.push(x);
  else if (Array.isArray(x)) x.forEach((v) => collectStrings(v, out));
  else if (x && typeof x === "object") Object.values(x).forEach((v) => collectStrings(v, out));
  return out;
}
