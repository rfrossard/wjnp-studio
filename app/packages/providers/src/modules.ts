import { join } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import { z } from "zod";
import { FACTUALITY_RULES, ModelTier, TaskKind, TEMPLATE_IDS, Tone, StyleId } from "@wjnp/contracts";
import { findRoot, readJsonIfExists } from "./util";

/* ---------------- routing ---------------- */

const ModelRef = z.object({ model: z.string().min(1) });

export const RoutingConfig = z.object({
  tiers: z.object({ frontier: ModelRef, mid: ModelRef, small: ModelRef }),
  verifier: ModelRef,
  critic: ModelRef,
  tasks: z.record(TaskKind, ModelTier),
  escalation: z.array(ModelTier).min(1),
  weeklyBudgetUsd: z.number().nonnegative(),
});
export type RoutingConfig = z.infer<typeof RoutingConfig>;

/** Built-in defaults when modules/orchestration/routing.json is missing. Model ids are configurable strings. */
export function defaultRouting(env: NodeJS.ProcessEnv = process.env): RoutingConfig {
  return {
    tiers: {
      // UNVERIFIED: model ids are placeholders; override in routing.json or WJNP_MODEL_* env vars
      frontier: { model: env.WJNP_MODEL_FRONTIER ?? "claude-opus-4-5" },
      mid: { model: env.WJNP_MODEL_MID ?? "claude-sonnet-4-5" },
      small: { model: env.WJNP_MODEL_SMALL ?? "claude-haiku-4-5" },
    },
    // a different family from the Anthropic author models
    verifier: { model: env.WJNP_MODEL_VERIFIER ?? "gpt-5" },
    critic: { model: env.WJNP_MODEL_CRITIC ?? "gpt-5-mini" },
    tasks: {
      brainstorm: "frontier",
      plan: "frontier",
      extract_claims: "mid",
      verify_claims: "mid",
      write_script: "mid",
      fill_scene: "small",
      critique_scene: "small",
      write_post: "small",
      narrate: "code",
      render: "code",
      mix: "code",
      audit: "code",
      lint: "code",
    },
    escalation: ["small", "mid", "frontier"],
    weeklyBudgetUsd: 20,
  };
}

export function parseRouting(raw: unknown | undefined): RoutingConfig {
  const d = defaultRouting();
  if (raw === undefined) return d;
  const r = (raw ?? {}) as Partial<RoutingConfig>;
  return RoutingConfig.parse({
    ...d,
    ...r,
    tiers: { ...d.tiers, ...(r.tiers ?? {}) },
    tasks: { ...d.tasks, ...(r.tasks ?? {}) },
  });
}

/* ---------------- other module files ---------------- */

export const VoicesFile = z.object({
  narrator: z.object({
    assetId: z.string(),
    elevenVoiceId: z.string(),
    settings: z.record(z.union([z.number(), z.boolean(), z.string()])).optional(),
  }),
  cast: z
    .array(
      z.object({
        tone: Tone,
        assetId: z.string(),
        name: z.string().optional(),
        elevenVoiceId: z.string(),
        settings: z.record(z.union([z.number(), z.boolean(), z.string()])).optional(),
      }),
    )
    .default([]),
  /** The full pickable pool (narrator clone + cast), for the test/select step before narration. */
  menu: z
    .array(
      z.object({
        assetId: z.string(),
        name: z.string(),
        elevenVoiceId: z.string(),
        roles: z.array(z.enum(["narrator", "cast"])),
        desc: z.string().default(""),
      }),
    )
    .default([]),
});
export type VoicesFile = z.infer<typeof VoicesFile>;

export const PronunciationFile = z.array(z.object({ term: z.string(), say: z.string() }));

export const MusicFile = z.object({
  /** Mood tracks keyed by tone; a track is generated once (Lyria) and cached in library/assets/music/<id>.json,
   *  then reused for free by every later pick of the same id. */
  menu: z
    .array(
      z.object({
        id: z.string(),
        name: z.string(),
        tone: Tone,
        mood: z.string().default(""),
        prompt: z.string(),
        seconds: z.number().positive().default(60),
      }),
    )
    .default([]),
});
export type MusicFile = z.infer<typeof MusicFile>;

export const Skeleton = z.object({
  id: z.string(),
  name: z.string(),
  beats: z
    .array(
      z.object({
        id: z.string(),
        purpose: z.string(),
        targetSeconds: z.number().positive(),
        templates: z.array(z.enum(TEMPLATE_IDS)).min(1),
      }),
    )
    .min(2),
});
export type Skeleton = z.infer<typeof Skeleton>;

/** ~300 s default skeleton, used only when modules/voice/skeletons.json is missing. */
export const DEFAULT_SKELETON: Skeleton = {
  id: "default-five-minute",
  name: "Default five-minute skeleton",
  beats: [
    { id: "hook", purpose: "Open with the tension in one line", targetSeconds: 10, templates: ["title_hook"] },
    { id: "whats-new", purpose: "What is actually new this week", targetSeconds: 40, templates: ["statement"] },
    { id: "evidence", purpose: "The strongest number", targetSeconds: 45, templates: ["stat", "statement"] },
    { id: "voice", purpose: "A quoted voice", targetSeconds: 35, templates: ["quote_card", "statement"] },
    { id: "how", purpose: "How it works", targetSeconds: 50, templates: ["comparison", "timeline", "bullets"] },
    { id: "tension", purpose: "Where the evidence pulls in two directions", targetSeconds: 40, templates: ["bullets", "comparison"] },
    { id: "limits", purpose: "What is not yet known", targetSeconds: 35, templates: ["bullets", "statement"] },
    { id: "take", purpose: "Personal take, labelled as opinion", targetSeconds: 35, templates: ["personal_take"] },
    { id: "close", purpose: "Closing question", targetSeconds: 10, templates: ["end_card"] },
  ],
};

export const BannedFile = z.object({
  phrases: z.array(z.string()).default([]),
  patterns: z.array(z.object({ id: z.string(), regex: z.string(), message: z.string().optional() })).default([]),
});

export const BlocklistFile = z.object({
  entities: z.array(z.object({ name: z.string(), aliases: z.array(z.string()).default([]), category: z.string().optional() })).default([]),
  patterns: z.array(z.object({ id: z.string(), regex: z.string(), message: z.string().optional(), severity: z.string().optional() })).default([]),
});

export const FactualityFile = z.object({
  minIndependentSources: z.number().int().positive().default(FACTUALITY_RULES.minIndependentSources),
  requirePrimarySource: z.boolean().default(FACTUALITY_RULES.requirePrimarySource),
  validityDays: z
    .object({ fact: z.number(), number: z.number(), quote: z.number(), interpretation: z.number() })
    .default({ fact: 90, number: 90, quote: 365, interpretation: 30 }),
});
export type FactualityRules = z.infer<typeof FactualityFile>;

export const PostFormatFile = z.object({
  hookLines: z.number().int().positive().default(2),
  maxHashtags: z.number().int().nonnegative().max(3).default(3),
  disclaimer: z.string().default("Views are my own."),
  firstCommentTemplate: z.string().default("Sources:\n{{sources}}"),
});
export type PostFormat = z.infer<typeof PostFormatFile>;

export const CatalogFile = z.array(z.object({ id: z.enum(TEMPLATE_IDS), styles: z.array(StyleId).default([]) }).passthrough());

export const GateCriteriaFile = z.object({ criteria: z.array(z.object({ id: z.string(), description: z.string().optional() })).default([]) }).passthrough();

export const RadarSourcesFile = z.object({
  publishers: z.array(z.object({ name: z.string(), domain: z.string(), tier: z.string().optional(), kind: z.string().optional() })).default([]),
  feeds: z.array(z.object({ name: z.string(), url: z.string().url() })).default([]),
});
export type RadarSources = z.infer<typeof RadarSourcesFile>;

export interface ModulesData {
  routing: RoutingConfig;
  voices?: VoicesFile;
  music?: MusicFile;
  pronunciation: { term: string; say: string }[];
  skeletons: Skeleton[];
  voiceSpec: string;
  banned: z.infer<typeof BannedFile>;
  blocklist: z.infer<typeof BlocklistFile>;
  factuality: FactualityRules;
  postFormat: PostFormat;
  catalog: z.infer<typeof CatalogFile>;
  gateCriteria: { id: string; description?: string | undefined }[];
  radar: RadarSources;
}

export const DEFAULT_GATE_CRITERIA = ["clarity", "accuracy", "tone", "visual_fit"];

/** Load every module file this package consumes; each missing file falls back to a built-in default. */
export function loadModules(root: string = findRoot()): ModulesData {
  const m = (...p: string[]) => join(root, "modules", ...p);
  const json = <T>(file: string, schema: z.ZodType<T, z.ZodTypeDef, unknown>): T | undefined => {
    const raw = readJsonIfExists(m(file));
    return raw === undefined ? undefined : schema.parse(raw);
  };
  const specPath = m("voice", "voice-spec.md");
  const skeletons = json("voice/skeletons.json", z.array(Skeleton));
  return {
    routing: parseRouting(readJsonIfExists(m("orchestration", "routing.json"))),
    voices: json("audio/voices.json", VoicesFile),
    music: json("audio/music.json", MusicFile),
    pronunciation: json("audio/pronunciation.json", PronunciationFile) ?? [],
    skeletons: skeletons && skeletons.length ? skeletons : [DEFAULT_SKELETON],
    voiceSpec: existsSync(specPath) ? readFileSync(specPath, "utf8") : "",
    banned: json("voice/banned-phrases.json", BannedFile) ?? { phrases: [], patterns: [] },
    blocklist: json("compliance/blocklist.json", BlocklistFile) ?? { entities: [], patterns: [] },
    factuality: FactualityFile.parse(readJsonIfExists(m("factuality", "rules.json")) ?? {}),
    postFormat: PostFormatFile.parse(readJsonIfExists(m("publish", "post-format.json")) ?? {}),
    catalog: json("templates/catalog.json", CatalogFile) ?? [],
    gateCriteria: json("gate/criteria.json", GateCriteriaFile)?.criteria ?? DEFAULT_GATE_CRITERIA.map((id) => ({ id })),
    radar: json("radar/sources.json", RadarSourcesFile) ?? { publishers: [], feeds: [] },
  };
}
