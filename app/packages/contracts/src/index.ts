/**
 * @wjnp/contracts — the single source of truth for every data shape in the studio.
 *
 * Rule of the house: LLMs write DATA that must parse against these schemas;
 * code renders it. Same episode.json => same video.
 *
 * Changing a schema here is a contract change: bump SCHEMA_VERSION, update
 * docs/CONTRACTS.md, and run the regression set (`npm run wjnp -- regress`).
 */
import { z } from "zod";

export const SCHEMA_VERSION = 1 as const;

/* ------------------------------------------------------------------ */
/* Constants (deterministic rules, not model decisions)                 */
/* ------------------------------------------------------------------ */

export const FPS = 30;
export const OUTPUTS = {
  master: { aspect: "9:16", width: 1080, height: 1920, safeArea: "4:5" },
  desktop: { aspect: "16:9", width: 1920, height: 1080, safeArea: "16:9" },
  cut: { aspect: "9:16", width: 1080, height: 1920, safeArea: "4:5" },
} as const;
export type OutputName = keyof typeof OUTPUTS;

export const DURATION_RULES = {
  masterSeconds: { min: 285, max: 315 }, // 4:45 – 5:15
  cutSeconds: { min: 60, max: 90 },
  wordsPerMinute: 150,
} as const;

export const FACTUALITY_RULES = {
  minIndependentSources: 2,
  requirePrimarySource: true,
  maxEvidenceQuoteChars: 300,
} as const;

export const CLIP_RULES = {
  maxSecondsPerClip: 15,
  maxShareOfEpisode: 0.1,
} as const;

export const DESIGN_RULES = {
  minFontPx: 22,
  minStyles: 1,
  maxStyles: 3,
  maxVoicesPerEpisode: 2,
  /** hue ranges (degrees, OKLCH) that the personal brand never uses */
  forbiddenHueRanges: [
    { name: "orange", from: 30, to: 75 },
    { name: "purple", from: 285, to: 330 },
  ],
} as const;

export const GATE_RULES = { minScore: 4, maxRedoAttempts: 2, minRounds: 2 } as const;

export const PROFILE_URL = "https://www.linkedin.com/in/robertofrossard";
export const SERIES_NAME = "What's just now possible?";

/* ------------------------------------------------------------------ */
/* Primitives                                                          */
/* ------------------------------------------------------------------ */

export const Id = z.string().regex(/^[a-z0-9][a-z0-9._-]*$/, "lowercase id (a-z, 0-9, . _ -)");
export const IsoDateTime = z.string().datetime({ offset: true });
export const IsoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const Sha256 = z.string().regex(/^[a-f0-9]{64}$/);
export const HexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

export const ObjectState = z.enum(["draft", "validated", "approved", "locked"]);
export type ObjectState = z.infer<typeof ObjectState>;

export const ModelTier = z.enum(["frontier", "mid", "small", "code"]);
export type ModelTier = z.infer<typeof ModelTier>;

export const Tone = z.enum(["analytical", "didactic", "narrative", "energetic", "measured", "professional"]);
export type Tone = z.infer<typeof Tone>;

export const ModuleName = z.enum([
  "radar",
  "factuality",
  "voice",
  "compliance",
  "templates",
  "design",
  "audio",
  "gate",
  "publish",
  "orchestration",
  "styles",
]);
export type ModuleName = z.infer<typeof ModuleName>;

/** Modules that never change from a metrics-derived proposal — only by explicit owner instruction. */
export const PROTECTED_MODULES: readonly ModuleName[] = ["compliance", "factuality", "publish"] as const;

/* ------------------------------------------------------------------ */
/* Library assets                                                      */
/* ------------------------------------------------------------------ */

export const AssetType = z.enum([
  "voice",
  "pronunciation",
  "voice_spec",
  "skeleton",
  "design_tokens",
  "scene_template",
  "approved_scene",
  "source",
  "claim",
  "thesis",
  "visual",
  "clip",
  "dataset",
  "music",
  "sfx",
  "episode",
  "post",
  "entity",
  "plan",
]);
export type AssetType = z.infer<typeof AssetType>;

export const LicenseKind = z.enum([
  "own", // created by the owner
  "generated", // produced by a paid generator under the owner's account
  "cc0",
  "cc-by",
  "cc-by-sa",
  "permission", // explicit permission from the rights holder
  "standard", // e.g. standard YouTube licence: quote-only, needs owner OK per use
  "unknown", // reference only — can never enter a video
]);
export type LicenseKind = z.infer<typeof LicenseKind>;

export const License = z.object({
  kind: LicenseKind,
  attribution: z.string().optional(),
  url: z.string().url().optional(),
  note: z.string().optional(),
});
export type License = z.infer<typeof License>;

export const Blob = z.object({
  sha256: Sha256,
  path: z.string(), // relative to library/blobs
  mime: z.string(),
  bytes: z.number().int().nonnegative(),
});
export type Blob = z.infer<typeof Blob>;

export const Asset = z.object({
  id: Id,
  type: AssetType,
  title: z.string().min(1),
  tags: z.array(z.string()).default([]),
  origin: z.object({
    kind: z.enum(["paste", "url", "file", "generated", "system"]),
    url: z.string().url().optional(),
    capturedAt: IsoDateTime.optional(),
  }),
  license: License,
  createdAt: IsoDateTime,
  version: z.number().int().positive().default(1),
  state: z.enum(["draft", "approved", "retired"]).default("draft"),
  blob: Blob.optional(),
  data: z.record(z.unknown()).default({}),
  usedIn: z.array(Id).default([]), // episode ids
});
export type Asset = z.infer<typeof Asset>;

/* ------------------------------------------------------------------ */
/* Factuality: sources and claims                                      */
/* ------------------------------------------------------------------ */

export const SourceTier = z.enum(["primary", "tier1", "tier2", "reference_only"]);
export type SourceTier = z.infer<typeof SourceTier>;

export const Source = z.object({
  id: Id,
  url: z.string().url(),
  title: z.string(),
  publisher: z.string(), // used to judge independence between sources
  author: z.string().optional(),
  publishedAt: IsoDate.optional(),
  capturedAt: IsoDateTime,
  tier: SourceTier,
  kind: z.enum(["paper", "official_doc", "announcement", "press", "blog", "video", "dataset", "other"]),
  snapshotSha256: Sha256.optional(),
});
export type Source = z.infer<typeof Source>;

export const Evidence = z.object({
  sourceId: Id,
  quote: z.string().min(1).max(FACTUALITY_RULES.maxEvidenceQuoteChars),
  locator: z.string().optional(), // page, section, timestamp
});
export type Evidence = z.infer<typeof Evidence>;

export const ClaimKind = z.enum(["fact", "number", "quote", "interpretation"]);
export type ClaimKind = z.infer<typeof ClaimKind>;

export const ClaimVerdict = z.enum(["unverified", "verified", "partial", "rejected"]);
export type ClaimVerdict = z.infer<typeof ClaimVerdict>;

export const Claim = z.object({
  id: Id,
  text: z.string().min(1),
  kind: ClaimKind,
  /** for kind=number: the exact figure shown on screen comes from here, never from a model */
  value: z.object({ display: z.string(), number: z.number().optional(), unit: z.string().optional() }).optional(),
  /** for kind=quote: who said it */
  speaker: z.string().optional(),
  evidence: z.array(Evidence).default([]),
  verdict: ClaimVerdict.default("unverified"),
  verifier: z.object({ model: z.string(), at: IsoDateTime }).optional(),
  author: z.object({ model: z.string() }).optional(),
  validUntil: IsoDate.optional(),
  notes: z.string().optional(),
});
export type Claim = z.infer<typeof Claim>;

/* ------------------------------------------------------------------ */
/* Brief                                                               */
/* ------------------------------------------------------------------ */

export const Message = z.object({ id: Id, text: z.string().min(1), claimIds: z.array(Id).default([]) });
export type Message = z.infer<typeof Message>;

export const Brief = z.object({
  theme: z.string().min(1),
  thesis: z.string().min(1),
  messages: z.array(Message).length(3),
  angle: z.string().default(""),
  avoid: z.array(z.string()).default([]),
  tone: Tone,
  closingQuestion: z.string().default(""),
  /** Beto's manual pick from the voice menu (modules/audio/voices.json), made before narration.
   *  Omitted: falls back to the narrator clone + the tone-based cast lookup, as before. */
  voices: z
    .object({ narratorAssetId: z.string().min(1).optional(), castAssetId: z.string().min(1).optional() })
    .optional(),
  /** Beto's manual pick from the music menu (modules/audio/music.json), made before the music step.
   *  Omitted: falls back to the tone-matched menu track (generated once, then reused from the library). */
  music: z.object({ trackAssetId: z.string().min(1).optional() }).optional(),
});
export type Brief = z.infer<typeof Brief>;

/* ------------------------------------------------------------------ */
/* Scene templates (closed catalogue)                                  */
/* ------------------------------------------------------------------ */

const short = (max: number) => z.string().min(1).max(max);

export const OnScreen = z.discriminatedUnion("template", [
  z.object({ template: z.literal("title_hook"), kicker: short(40).optional(), headline: short(70) }),
  z.object({ template: z.literal("statement"), headline: short(80), body: short(180).optional() }),
  z.object({
    template: z.literal("stat"),
    claimId: Id, // must be a verified claim of kind=number; display value is read from the claim
    label: short(90),
    context: short(140).optional(),
  }),
  z.object({
    template: z.literal("comparison"),
    headline: short(70).optional(),
    left: z.object({ title: short(32), items: z.array(short(60)).min(1).max(4) }),
    right: z.object({ title: short(32), items: z.array(short(60)).min(1).max(4) }),
  }),
  z.object({ template: z.literal("bullets"), headline: short(70), bullets: z.array(short(80)).min(2).max(4) }),
  z.object({
    template: z.literal("timeline"),
    headline: short(70).optional(),
    steps: z.array(z.object({ label: short(24), text: short(70) })).min(2).max(5),
  }),
  z.object({
    template: z.literal("quote_card"),
    claimId: Id, // must be a verified claim of kind=quote
    quote: short(220),
    attribution: short(80),
    sourceLabel: short(60),
  }),
  z.object({
    template: z.literal("clip"),
    claimId: Id,
    clipAssetId: Id,
    startMs: z.number().int().nonnegative(),
    endMs: z.number().int().positive(),
    attribution: short(80),
    sourceLabel: short(60),
  }),
  z.object({ template: z.literal("personal_take"), headline: short(80), body: short(200).optional() }),
  z.object({ template: z.literal("end_card"), question: short(120) }),
]);
export type OnScreen = z.infer<typeof OnScreen>;
export type TemplateId = OnScreen["template"];
export const TEMPLATE_IDS = [
  "title_hook",
  "statement",
  "stat",
  "comparison",
  "bullets",
  "timeline",
  "quote_card",
  "clip",
  "personal_take",
  "end_card",
] as const satisfies readonly TemplateId[];

export const StyleId = z.enum([
  "editorial_data",
  "precise_stroke",
  "flat_science",
  "calm_demo",
  "screencast_zoom",
  "archival_bw",
]);
export type StyleId = z.infer<typeof StyleId>;

/* ------------------------------------------------------------------ */
/* Design presets & narrator tone                                       */
/* ------------------------------------------------------------------ */

/**
 * Five named design systems. Each bundles: font pair, corner radius, element
 * border style, transition style, accent placement, and caption default.
 * Recommended by the orchestrator based on the week's topic keywords.
 */
export const DesignPresetId = z.enum([
  "signal",      // Minimal, data-forward. Monospace headlines, tight grid. AI/data topics.
  "broadcast",   // Bold editorial. High contrast, strong horizontal rules. Breaking news.
  "studio",      // Warm editorial. Serif headlines, soft shadows. Human/society topics.
  "code",        // Terminal aesthetic. Mono everything, scanline feel. Dev/infra topics.
  "stage",       // Kinetic poster. Big moves, bold transitions. Product launches.
]);
export type DesignPresetId = z.infer<typeof DesignPresetId>;

export const PRESET_META: Record<DesignPresetId, {
  label: string;
  description: string;
  topicKeywords: string[];
  defaultCaptionStyle: "box" | "shadow";
  defaultTone: "light" | "dark";
}> = {
  signal: {
    label: "Signal",
    description: "Clean, data-forward. Monospace type, tight grid, no decoration.",
    topicKeywords: ["AI", "data", "model", "benchmark", "research", "LLM", "neural", "metric", "inference"],
    defaultCaptionStyle: "box",
    defaultTone: "dark",
  },
  broadcast: {
    label: "Broadcast",
    description: "Bold editorial. High contrast, strong rules, newspaper energy.",
    topicKeywords: ["news", "policy", "regulation", "law", "government", "announcement", "launch", "funding"],
    defaultCaptionStyle: "box",
    defaultTone: "light",
  },
  studio: {
    label: "Studio",
    description: "Warm and human. Serif headlines, editorial photography feel.",
    topicKeywords: ["health", "society", "people", "culture", "education", "future", "work", "ethics"],
    defaultCaptionStyle: "shadow",
    defaultTone: "light",
  },
  code: {
    label: "Code",
    description: "Terminal aesthetic. Monospace everything, developer energy.",
    topicKeywords: ["code", "developer", "open-source", "API", "infrastructure", "cloud", "security", "engineering"],
    defaultCaptionStyle: "box",
    defaultTone: "dark",
  },
  stage: {
    label: "Stage",
    description: "Kinetic and bold. Poster-like compositions, big transitions.",
    topicKeywords: ["product", "startup", "raise", "IPO", "release", "version", "announcement", "breakthrough"],
    defaultCaptionStyle: "shadow",
    defaultTone: "dark",
  },
};

/** Recommend up to 3 presets for a given set of topic keywords (lowercase). */
export function recommendPresets(topicWords: string[]): DesignPresetId[] {
  const lower = topicWords.map((w) => w.toLowerCase());
  const scores: [DesignPresetId, number][] = (Object.entries(PRESET_META) as [DesignPresetId, typeof PRESET_META[DesignPresetId]][]).map(
    ([id, meta]) => [id, meta.topicKeywords.filter((kw) => lower.some((w) => w.includes(kw.toLowerCase()))).length]
  );
  scores.sort((a, b) => b[1] - a[1]);
  const top = scores.filter(([, s]) => s > 0).slice(0, 3).map(([id]) => id);
  return top.length ? top : ["signal"]; // default fallback
}

export const NarratorTone = z.enum([
  "formal",    // Authoritative, structured, no contractions.
  "analytical",// Data-driven, precise, restrained enthusiasm.
  "conversational", // Warm, contractions ok, like a smart colleague.
  "energetic", // Fast-paced, punchy, short sentences.
  "playful",   // Light humour ok, wit, friendly provocation.
]);
export type NarratorTone = z.infer<typeof NarratorTone>;

export const NARRATOR_TONE_META: Record<NarratorTone, { label: string; description: string; elevenLabsStyle: number }> = {
  formal:        { label: "Formal",        description: "Authoritative and structured. No contractions.",        elevenLabsStyle: 0.0 },
  analytical:    { label: "Analytical",    description: "Data-driven, precise, restrained enthusiasm.",          elevenLabsStyle: 0.1 },
  conversational:{ label: "Conversational",description: "Warm and collegial. Contractions welcome.",             elevenLabsStyle: 0.3 },
  energetic:     { label: "Energetic",     description: "Punchy and fast-paced. Short, declarative sentences.",  elevenLabsStyle: 0.5 },
  playful:       { label: "Playful",       description: "Wit and friendly provocation. Light humour welcome.",   elevenLabsStyle: 0.7 },
};


/* ------------------------------------------------------------------ */
/* Narration, gate, scene                                              */
/* ------------------------------------------------------------------ */

export const WordTiming = z.object({ w: z.string(), startMs: z.number().nonnegative(), endMs: z.number().nonnegative() });
export type WordTiming = z.infer<typeof WordTiming>;

export const Narration = z.object({
  voiceId: Id, // library asset id of type "voice"
  text: z.string().min(1),
  audio: z
    .object({
      textSha256: Sha256, // cache key: sha256(voiceId + "\n" + text + "\n" + settings)
      path: z.string(),
      durationMs: z.number().positive(),
      words: z.array(WordTiming),
    })
    .optional(),
});
export type Narration = z.infer<typeof Narration>;

export const GateCheck = z.object({ id: z.string(), pass: z.boolean(), detail: z.string().optional() });
export type GateCheck = z.infer<typeof GateCheck>;

export const Critique = z.object({
  reviewerModel: z.string(),
  authorModel: z.string().optional(),
  /** defects are listed BEFORE scores; a score of 5 requires an empty defect list */
  defects: z.array(z.string()),
  scores: z.record(z.number().min(1).max(5)),
});
export type Critique = z.infer<typeof Critique>;

export const GateResult = z.object({
  checks: z.array(GateCheck),
  critique: Critique.optional(),
  attempts: z.number().int().nonnegative().default(0),
  pass: z.boolean(),
});
export type GateResult = z.infer<typeof GateResult>;

export const Scene = z.object({
  id: Id,
  order: z.number().int().nonnegative(),
  style: StyleId,
  onScreen: OnScreen,
  narration: Narration,
  claimIds: z.array(Id).default([]),
  visualAssetIds: z.array(Id).default([]),
  /** which brief message this scene serves (m1..m3), if any */
  messageId: Id.optional(),
  /** marks interpretation/opinion; shows the "My take" label and triggers the compliance lint */
  isOpinion: z.boolean().default(false),
  /** included in the short WhatsApp cut */
  inCut: z.boolean().default(false),
  durationFrames: z.number().int().positive().optional(), // derived from narration audio
  gate: GateResult.optional(),
  state: ObjectState.default("draft"),
});
export type Scene = z.infer<typeof Scene>;

/* ------------------------------------------------------------------ */
/* Plan (orchestration)                                                */
/* ------------------------------------------------------------------ */

export const TaskKind = z.enum([
  "brainstorm",
  "plan",
  "extract_claims",
  "verify_claims",
  "write_script",
  "fill_scene",
  "critique_scene",
  "write_post",
  "narrate",
  "render",
  "mix",
  "audit",
  "lint",
]);
export type TaskKind = z.infer<typeof TaskKind>;

export const PlanTask = z.object({
  id: Id,
  kind: TaskKind,
  tier: ModelTier,
  model: z.string().optional(), // resolved from modules/orchestration/routing.json
  sceneId: Id.optional(),
  dependsOn: z.array(Id).default([]),
});
export type PlanTask = z.infer<typeof PlanTask>;

export const Escalation = z.object({
  taskId: Id,
  from: ModelTier,
  to: ModelTier,
  reason: z.string(),
  at: IsoDateTime,
});
export type Escalation = z.infer<typeof Escalation>;

export const Plan = z.object({ tasks: z.array(PlanTask), escalations: z.array(Escalation).default([]) });
export type Plan = z.infer<typeof Plan>;

export const CostEntry = z.object({
  taskId: Id.optional(),
  provider: z.string(),
  model: z.string().optional(),
  usd: z.number().nonnegative(),
  at: IsoDateTime,
});
export type CostEntry = z.infer<typeof CostEntry>;

/* ------------------------------------------------------------------ */
/* Episode                                                             */
/* ------------------------------------------------------------------ */

export const Accent = z.object({ name: z.string(), hex: HexColor });
export type Accent = z.infer<typeof Accent>;

export const ClipDecision = z.object({
  clipAssetId: Id,
  /** asked on every generation for standard-licence clips */
  decision: z.enum(["short_quote", "quote_card", "both", "pending"]),
  decidedAt: IsoDateTime.optional(),
});
export type ClipDecision = z.infer<typeof ClipDecision>;

export const Post = z.object({
  text: z.string().min(1),
  hashtags: z.array(z.string().regex(/^#\w+$/)).max(3).default([]),
  firstComment: z.string().default(""), // sources + desktop link
  desktopUrl: z.string().url().optional(),
  disclaimer: z.string().default("Views are my own."),
  publishedAt: IsoDateTime.optional(),
  publishedUrl: z.string().url().optional(),
  /** publishing never happens without this being set by an explicit owner action */
  ownerConfirmedAt: IsoDateTime.optional(),
});
export type Post = z.infer<typeof Post>;

/** Owner approvals, written only by the core `approve` action (never taken from a client save). */
export const Approvals = z.object({
  brief: IsoDateTime.optional(),
  script: IsoDateTime.optional(),
  final: IsoDateTime.optional(),
  publish: IsoDateTime.optional(),
});
export type Approvals = z.infer<typeof Approvals>;

/** Frames of silence kept after each scene's narration. */
export const SCENE_TAIL_FRAMES = 20;

export const Episode = z.object({
  schemaVersion: z.literal(SCHEMA_VERSION),
  id: Id, // e.g. 2026-w46-agents-that-pay
  title: z.string().min(1),
  weekOf: IsoDate,
  state: ObjectState.default("draft"),
  brief: Brief,
  sources: z.array(Source).default([]),
  claims: z.array(Claim).default([]),
  scenes: z.array(Scene).default([]),
  design: z.object({
    profile: z.literal("personal"),
    accent: Accent,
    styles: z.array(StyleId).min(DESIGN_RULES.minStyles).max(DESIGN_RULES.maxStyles),
    captionStyle: z.enum(["box", "shadow"]).default("box"),
    preset: DesignPresetId.default("signal"),
    narratorTone: NarratorTone.default("conversational"),
    /** Override specific preset properties; null = use preset default */
    overrides: z.object({
      fontPair: z.enum(["serif-sans", "mono-sans", "sans-sans", "mono-mono"]).optional(),
      cornerRadius: z.number().int().min(0).max(32).optional(),
      transition: z.enum(["cut", "dissolve", "slide", "zoom", "wipe"]).optional(),
      tone: z.enum(["light", "dark"]).optional(),
    }).default({}),
    /** Narrator full name shown on end card */
    narratorName: z.string().default("Roberto Frossard"),
  }),
  audio: z.object({
    narratorVoiceId: Id,
    castVoiceIds: z.array(Id).max(DESIGN_RULES.maxVoicesPerEpisode - 1).default([]),
    musicAssetIds: z.array(Id).default([]),
  }),
  clipDecisions: z.array(ClipDecision).default([]),
  post: Post.optional(),
  plan: Plan.optional(),
  costs: z.array(CostEntry).default([]),
  /** module name -> version used; makes the episode reproducible and changes reversible */
  moduleVersions: z.record(z.string()).default({}),
  approvals: Approvals.default({}),
});
export type Episode = z.infer<typeof Episode>;

/* ------------------------------------------------------------------ */
/* Self-evolution: feedback, proposals, module manifests               */
/* ------------------------------------------------------------------ */

export const Feedback = z.object({
  id: Id,
  at: IsoDateTime,
  episodeId: Id.optional(),
  kind: z.enum(["comment", "script_edit", "scene_reject", "visual_swap", "metric", "chat"]),
  text: z.string(),
  before: z.string().optional(),
  after: z.string().optional(),
  target: z
    .object({
      module: ModuleName.optional(),
      sceneId: Id.optional(),
      timestampMs: z.number().nonnegative().optional(),
      file: z.string().optional(),
    })
    .default({}),
  scope: z.enum(["unclassified", "one_off", "standing"]).default("unclassified"),
  status: z.enum(["open", "proposed", "applied", "rejected"]).default("open"),
  proposalId: Id.optional(),
});
export type Feedback = z.infer<typeof Feedback>;

export const Proposal = z.object({
  id: Id,
  createdAt: IsoDateTime,
  feedbackIds: z.array(Id).min(1),
  module: ModuleName,
  file: z.string(), // path relative to repo root, inside modules/<module>/
  before: z.string(),
  after: z.string(),
  rationale: z.string(),
  /** proposals derived only from metrics can never touch PROTECTED_MODULES */
  derivedFromMetricsOnly: z.boolean().default(false),
  regression: z.object({ ran: z.boolean(), passed: z.boolean(), notes: z.string().default("") }).optional(),
  status: z.enum(["pending", "approved", "rejected", "applied"]).default("pending"),
  appliedVersion: z.string().optional(),
});
export type Proposal = z.infer<typeof Proposal>;

export const ModuleManifest = z.object({
  name: ModuleName,
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  description: z.string(),
  files: z.array(z.string()),
  protected: z.boolean().default(false),
});
export type ModuleManifest = z.infer<typeof ModuleManifest>;

/* ------------------------------------------------------------------ */
/* Lint / validation result shape shared by core validators            */
/* ------------------------------------------------------------------ */

export const Finding = z.object({
  rule: z.string(),
  severity: z.enum(["error", "warning", "info"]),
  message: z.string(),
  sceneId: Id.optional(),
  claimId: Id.optional(),
});
export type Finding = z.infer<typeof Finding>;
