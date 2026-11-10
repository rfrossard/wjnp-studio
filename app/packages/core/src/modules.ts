/**
 * Lenient zod schemas for the rules-as-data files in modules/<name>/ (formats from docs/ARCHITECTURE.md)
 * plus the built-in defaults used when a file is missing or does not parse.
 */
import { z } from "zod";
import {
  Accent,
  DESIGN_RULES,
  FACTUALITY_RULES,
  ModelTier,
  ModuleManifest,
  ModuleName,
  PROTECTED_MODULES,
  TaskKind,
  Tone,
} from "@wjnp/contracts";

export const FactualityRulesFile = z
  .object({
    minIndependentSources: z.number().int().positive().default(FACTUALITY_RULES.minIndependentSources),
    requirePrimarySource: z.boolean().default(FACTUALITY_RULES.requirePrimarySource),
    validityDays: z.record(z.number()).default({}),
  })
  .passthrough();
export type FactualityRulesFile = z.infer<typeof FactualityRulesFile>;

export const BlocklistFile = z
  .object({
    entities: z
      .array(z.object({ name: z.string().min(1), aliases: z.array(z.string()).default([]), category: z.string().default("other") }).passthrough())
      .default([]),
    patterns: z
      .array(
        z
          .object({
            id: z.string(),
            regex: z.string(),
            message: z.string().default("matched a compliance pattern"),
            severity: z.enum(["error", "warning", "info"]).default("error"),
          })
          .passthrough(),
      )
      .default([]),
  })
  .passthrough();
export type BlocklistFile = z.infer<typeof BlocklistFile>;

export const DesignTokensFile = z.object({ accents: z.array(Accent).min(1) }).passthrough();
export type DesignTokensFile = z.infer<typeof DesignTokensFile>;

export const VoicesFile = z
  .object({
    narrator: z.object({ assetId: z.string(), elevenVoiceId: z.string().optional(), settings: z.unknown().optional() }).passthrough(),
    cast: z
      .array(z.object({ tone: Tone.or(z.string()), assetId: z.string(), name: z.string().default(""), elevenVoiceId: z.string().optional() }).passthrough())
      .default([]),
    /** The full pickable pool (narrator clone + cast), for the test/select step before narration. */
    menu: z
      .array(z.object({ assetId: z.string(), name: z.string(), elevenVoiceId: z.string(), roles: z.array(z.enum(["narrator", "cast"])), desc: z.string().default("") }).passthrough())
      .default([]),
  })
  .passthrough();
export type VoicesFile = z.infer<typeof VoicesFile>;

export const PostFormatFile = z
  .object({
    hookLines: z.number().int().nonnegative().optional(),
    maxHashtags: z.number().int().nonnegative().default(3),
    disclaimer: z.string().default("Views are my own."),
    firstCommentTemplate: z.string().optional(),
  })
  .passthrough();
export type PostFormatFile = z.infer<typeof PostFormatFile>;

export const RoutingFile = z
  .object({
    tiers: z.record(z.object({ model: z.string() }).passthrough()).default({}),
    verifier: z.object({ model: z.string() }).passthrough().optional(),
    critic: z.object({ model: z.string() }).passthrough().optional(),
    tasks: z.record(ModelTier).default({}),
    escalation: z.array(ModelTier).default([]),
    weeklyBudgetUsd: z.number().nonnegative().optional(),
  })
  .passthrough();
export type RoutingFile = z.infer<typeof RoutingFile>;

export interface Routing {
  tiers: Partial<Record<ModelTier, { model: string }>>;
  verifier: { model: string };
  critic: { model: string };
  tasks: Record<TaskKind, ModelTier>;
  escalation: ModelTier[];
  weeklyBudgetUsd: number;
}

/* ------------------------------ defaults ------------------------------ */

export const DEFAULT_FACTUALITY: FactualityRulesFile = {
  minIndependentSources: FACTUALITY_RULES.minIndependentSources,
  requirePrimarySource: FACTUALITY_RULES.requirePrimarySource,
  validityDays: { fact: 90, number: 60, quote: 365, interpretation: 30 },
};

/** Personal-brand guard rails: no employer mentions, no advice-like or absolute claims. */
export const DEFAULT_BLOCKLIST: BlocklistFile = {
  entities: [{ name: "Itaú", aliases: ["Itau", "Itaú Unibanco", "Itau Unibanco", "ICTi"], category: "employer" }],
  patterns: [
    { id: "investment-advice", regex: "\\b(you should|you must) (buy|sell|invest in)\\b", message: "reads as investment advice", severity: "error" },
    { id: "guaranteed", regex: "\\bguarantee(d|s)?\\b", message: "absolute promise", severity: "warning" },
  ],
};

export const DEFAULT_ACCENTS: Accent[] = [
  { name: "teal", hex: "#1F7A8C" },
  { name: "cobalt", hex: "#1D4ED8" },
  { name: "forest", hex: "#2F6F4E" },
  { name: "crimson", hex: "#A61E4D" },
];
export const DEFAULT_DESIGN_TOKENS: DesignTokensFile = { accents: DEFAULT_ACCENTS };

export const DEFAULT_VOICES: VoicesFile = {
  narrator: { assetId: "voice-roberto" },
  cast: [],
  menu: [],
};

export const DEFAULT_POST_FORMAT: PostFormatFile = { maxHashtags: 3, disclaimer: "Views are my own.", hookLines: 2 };

export const DEFAULT_TASK_TIERS: Record<TaskKind, ModelTier> = {
  brainstorm: "frontier",
  plan: "frontier",
  extract_claims: "mid",
  verify_claims: "frontier",
  write_script: "frontier",
  fill_scene: "mid",
  critique_scene: "frontier",
  write_post: "mid",
  narrate: "code",
  render: "code",
  mix: "code",
  audit: "mid",
  lint: "code",
};

export const DEFAULT_ROUTING: Routing = {
  tiers: { frontier: { model: "frontier-default" }, mid: { model: "mid-default" }, small: { model: "small-default" } },
  verifier: { model: "verifier-default" },
  critic: { model: "critic-default" },
  tasks: DEFAULT_TASK_TIERS,
  escalation: ["small", "mid", "frontier"],
  weeklyBudgetUsd: 10,
};

export function normalizeRouting(file: RoutingFile | undefined): Routing {
  if (!file) return DEFAULT_ROUTING;
  return {
    tiers: { ...DEFAULT_ROUTING.tiers, ...(file.tiers as Routing["tiers"]) },
    verifier: file.verifier ?? DEFAULT_ROUTING.verifier,
    critic: file.critic ?? DEFAULT_ROUTING.critic,
    tasks: { ...DEFAULT_TASK_TIERS, ...(file.tasks as Partial<Record<TaskKind, ModelTier>>) },
    escalation: file.escalation.length ? file.escalation : DEFAULT_ROUTING.escalation,
    weeklyBudgetUsd: file.weeklyBudgetUsd ?? DEFAULT_ROUTING.weeklyBudgetUsd,
  };
}

const DESCRIPTIONS: Record<ModuleName, string> = {
  radar: "Where weekly themes come from",
  factuality: "Source and claim verification rules",
  voice: "Voice spec, skeletons, banned phrases",
  compliance: "Blocklist and compliance patterns",
  templates: "Scene template catalogue",
  design: "Design tokens and accents",
  audio: "Voices, pronunciation, mix",
  gate: "Quality gate criteria",
  publish: "Post format and disclaimer",
  orchestration: "Model routing, escalation, budget",
  styles: "Style library: 36 styles and how to pick them",
};

export function defaultManifest(name: ModuleName): ModuleManifest {
  return {
    name,
    version: "0.0.0",
    description: `${DESCRIPTIONS[name]} (built-in default)`,
    files: [],
    protected: PROTECTED_MODULES.includes(name),
  };
}

export { DESIGN_RULES };
