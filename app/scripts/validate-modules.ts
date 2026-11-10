/**
 * Validates the rules-as-data files: modules/, library/assets/ and the cross-references between them.
 *
 * Run: npx tsx scripts/validate-modules.ts
 * Exit code 0 when every check passes, 1 otherwise. Warnings do not fail the run.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { basename, dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Asset,
  DURATION_RULES,
  FACTUALITY_RULES,
  HexColor,
  ModelTier,
  ModuleManifest,
  ModuleName,
  PROTECTED_MODULES,
  StyleId,
  TEMPLATE_IDS,
  TaskKind,
  Tone,
} from "@wjnp/contracts";

const ROOT = process.env.WJNP_ROOT
  ? resolve(process.env.WJNP_ROOT)
  : resolve(dirname(fileURLToPath(import.meta.url)), "..");

const abs = (...parts: string[]): string => join(ROOT, ...parts);
const rel = (p: string): string => relative(ROOT, p);

interface CheckResult {
  name: string;
  problems: string[];
  warnings: string[];
}
const results: CheckResult[] = [];

function record(name: string, problems: string[], warnings: string[] = []): void {
  results.push({ name, problems, warnings });
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

function readJson(path: string, problems: string[]): unknown {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    problems.push(`${rel(path)}: ${(err as Error).message}`);
    return undefined;
  }
}

function issuesOf(error: { issues: { path: (string | number)[]; message: string }[] }): string {
  return error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
}

const inList = (list: readonly string[], value: string): boolean => list.includes(value);

/* ------------------------------------------------------------------ */
/* 1. Every JSON file under modules/ and library/assets/ parses        */
/* ------------------------------------------------------------------ */
const jsonFiles = [...walk(abs("modules")), ...walk(abs("library", "assets"))].filter((p) => p.endsWith(".json"));
{
  const problems: string[] = [];
  for (const file of jsonFiles) readJson(file, problems);
  record(`every JSON file parses (${jsonFiles.length} files)`, problems);
}

/* ------------------------------------------------------------------ */
/* 2. Module manifests parse, files exist, protected flags are right   */
/* ------------------------------------------------------------------ */
{
  const problems: string[] = [];
  const modulesDir = abs("modules");
  for (const entry of readdirSync(modulesDir)) {
    if (statSync(join(modulesDir, entry)).isDirectory() && !inList(ModuleName.options, entry)) {
      problems.push(`modules/${entry}: folder is not a ModuleName`);
    }
  }
  for (const name of ModuleName.options) {
    const dir = abs("modules", name);
    const manifestPath = join(dir, "manifest.json");
    if (!existsSync(manifestPath)) {
      problems.push(`${name}: manifest.json missing`);
      continue;
    }
    const parsed = ModuleManifest.safeParse(readJson(manifestPath, problems));
    if (!parsed.success) {
      problems.push(`${name}: manifest invalid: ${issuesOf(parsed.error)}`);
      continue;
    }
    if (parsed.data.name !== name) problems.push(`${name}: manifest name is "${parsed.data.name}"`);
    const isProtected = (PROTECTED_MODULES as readonly string[]).includes(name);
    if (parsed.data.protected !== isProtected) {
      problems.push(`${name}: protected is ${parsed.data.protected}, contracts say ${isProtected}`);
    }
    if (!existsSync(join(dir, "CHANGELOG.md"))) problems.push(`${name}: CHANGELOG.md missing`);
    for (const file of parsed.data.files) {
      if (!existsSync(join(dir, file))) problems.push(`${name}: listed file missing: ${file}`);
    }
  }
  record(`${ModuleName.options.length} module manifests parse, listed files exist, protected flags match`, problems);
}

/* ------------------------------------------------------------------ */
/* 3. Library assets parse and sit in the folder for their type       */
/* ------------------------------------------------------------------ */
const assetsRoot = abs("library", "assets");
const assetsById = new Map<string, Asset>();
{
  const problems: string[] = [];
  const files = walk(assetsRoot).filter((p) => p.endsWith(".json"));
  for (const file of files) {
    const parsed = Asset.safeParse(readJson(file, problems));
    if (!parsed.success) {
      problems.push(`${rel(file)}: ${issuesOf(parsed.error)}`);
      continue;
    }
    const folder = relative(assetsRoot, dirname(file)).split(sep)[0];
    if (folder !== parsed.data.type) problems.push(`${rel(file)}: type "${parsed.data.type}" is in folder "${folder}"`);
    if (basename(file, ".json") !== parsed.data.id) problems.push(`${rel(file)}: id "${parsed.data.id}" does not match file name`);
    assetsById.set(parsed.data.id, parsed.data);
  }
  record(`${files.length} library assets parse as Asset and sit in their type folder`, problems);
}

/* ------------------------------------------------------------------ */
/* 4. Voices: cast covers every Tone, voice assets exist and agree     */
/* ------------------------------------------------------------------ */
interface VoicesFile {
  narrator: { assetId: string; elevenVoiceId: string };
  cast: { tone: string; assetId: string; name: string; elevenVoiceId: string }[];
}
{
  const problems: string[] = [];
  const voices = readJson(abs("modules", "audio", "voices.json"), problems) as VoicesFile | undefined;
  if (voices) {
    for (const tone of Tone.options) {
      const matches = voices.cast.filter((c) => c.tone === tone);
      if (matches.length !== 1) problems.push(`cast has ${matches.length} entries for tone "${tone}" (need exactly 1)`);
    }
    for (const entry of voices.cast) {
      if (!inList(Tone.options, entry.tone)) problems.push(`cast entry ${entry.name}: unknown tone "${entry.tone}"`);
    }
    const voiceCheck = (label: string, assetId: string, elevenVoiceId: string): void => {
      const asset = assetsById.get(assetId);
      if (!asset) {
        problems.push(`${label}: no library asset "${assetId}"`);
        return;
      }
      if (asset.type !== "voice") problems.push(`${label}: asset "${assetId}" is type "${asset.type}", not voice`);
      if (asset.data["elevenVoiceId"] !== elevenVoiceId) {
        problems.push(`${label}: elevenVoiceId differs between voices.json and library asset "${assetId}"`);
      }
    };
    voiceCheck("narrator", voices.narrator.assetId, voices.narrator.elevenVoiceId);
    for (const entry of voices.cast) voiceCheck(`cast ${entry.name}`, entry.assetId, entry.elevenVoiceId);
  }
  record(`voices.json: cast covers all ${Tone.options.length} tones, voice assets exist and agree`, problems);
}

/* ------------------------------------------------------------------ */
/* 5. Routing maps every TaskKind to a real tier                       */
/* ------------------------------------------------------------------ */
interface RoutingFile {
  tiers: Record<string, { model: string }>;
  verifier: { model: string };
  critic: { model: string };
  tasks: Record<string, string>;
  escalation: string[];
  weeklyBudgetUsd: number;
}
{
  const problems: string[] = [];
  const warnings: string[] = [];
  const routing = readJson(abs("modules", "orchestration", "routing.json"), problems) as RoutingFile | undefined;
  if (routing) {
    const tierNames = Object.keys(routing.tiers);
    for (const name of tierNames) {
      if (!inList(ModelTier.options, name)) problems.push(`tiers: "${name}" is not a ModelTier`);
    }
    for (const kind of TaskKind.options) {
      const tier = routing.tasks[kind];
      if (tier === undefined) {
        problems.push(`tasks: TaskKind "${kind}" is not mapped`);
      } else if (!inList(ModelTier.options, tier)) {
        problems.push(`tasks: "${kind}" maps to "${tier}", which is not a ModelTier`);
      } else if (tier !== "code" && !tierNames.includes(tier)) {
        problems.push(`tasks: "${kind}" maps to tier "${tier}" with no model in tiers`);
      }
    }
    for (const key of Object.keys(routing.tasks)) {
      if (!inList(TaskKind.options, key)) problems.push(`tasks: "${key}" is not a TaskKind`);
    }
    for (const tier of routing.escalation) {
      if (!inList(ModelTier.options, tier)) problems.push(`escalation: "${tier}" is not a ModelTier`);
    }
    for (const role of ["verifier", "critic"] as const) {
      if (routing[role].model.startsWith("CONFIGURE_ME")) {
        warnings.push(`${role} model is still a placeholder ("${routing[role].model}"); set it before the first run`);
      }
    }
  }
  record(`routing.json maps all ${TaskKind.options.length} TaskKinds to tiers`, problems, warnings);
}

/* ------------------------------------------------------------------ */
/* 6. Template catalogue has all ten template ids                      */
/* ------------------------------------------------------------------ */
interface CatalogEntry {
  id: string;
  styles: string[];
  useFor: string[];
  avoidFor: string[];
}
{
  const problems: string[] = [];
  const catalog = readJson(abs("modules", "templates", "catalog.json"), problems) as CatalogEntry[] | undefined;
  if (catalog) {
    const ids = catalog.map((e) => e.id);
    for (const id of TEMPLATE_IDS) {
      const count = ids.filter((x) => x === id).length;
      if (count !== 1) problems.push(`template "${id}" appears ${count} times (need exactly 1)`);
    }
    for (const id of ids) {
      if (!(TEMPLATE_IDS as readonly string[]).includes(id)) problems.push(`catalog id "${id}" is not a TemplateId`);
    }
    for (const entry of catalog) {
      for (const style of entry.styles) {
        if (!inList(StyleId.options, style)) problems.push(`${entry.id}: style "${style}" is not a StyleId`);
      }
      if (entry.useFor.length === 0 || entry.avoidFor.length === 0) problems.push(`${entry.id}: useFor and avoidFor must not be empty`);
    }
  }
  record(`templates/catalog.json has all ${TEMPLATE_IDS.length} template ids`, problems);
}

/* ------------------------------------------------------------------ */
/* 7. Voice skeletons: valid templates, beat timing near master length */
/* ------------------------------------------------------------------ */
interface Skeleton {
  id: string;
  beats: { id: string; targetSeconds: number; templates: string[] }[];
}
{
  const problems: string[] = [];
  const skeletons = readJson(abs("modules", "voice", "skeletons.json"), problems) as Skeleton[] | undefined;
  if (skeletons) {
    for (const skeleton of skeletons) {
      const total = skeleton.beats.reduce((sum, b) => sum + b.targetSeconds, 0);
      const { min, max } = DURATION_RULES.masterSeconds;
      if (total < min || total > max) problems.push(`${skeleton.id}: beats total ${total}s, outside ${min}-${max}s`);
      const beatIds = skeleton.beats.map((b) => b.id);
      if (new Set(beatIds).size !== beatIds.length) problems.push(`${skeleton.id}: duplicate beat ids`);
      for (const beat of skeleton.beats) {
        for (const t of beat.templates) {
          if (!(TEMPLATE_IDS as readonly string[]).includes(t)) problems.push(`${skeleton.id}/${beat.id}: "${t}" is not a TemplateId`);
        }
      }
    }
  }
  record("voice skeletons: templates are valid and beats total the master length", problems);
}

/* ------------------------------------------------------------------ */
/* 8. Regex patterns compile                                           */
/* ------------------------------------------------------------------ */
{
  const problems: string[] = [];
  const compile = (label: string, regex: string): void => {
    try {
      new RegExp(regex, "i");
    } catch (err) {
      problems.push(`${label}: ${(err as Error).message}`);
    }
  };
  const banned = readJson(abs("modules", "voice", "banned-phrases.json"), problems) as
    | { patterns: { id: string; regex: string }[] }
    | undefined;
  for (const p of banned?.patterns ?? []) compile(`banned-phrases/${p.id}`, p.regex);

  const blocklist = readJson(abs("modules", "compliance", "blocklist.json"), problems) as
    | { patterns: { id: string; regex: string; severity: string }[] }
    | undefined;
  for (const p of blocklist?.patterns ?? []) {
    compile(`blocklist/${p.id}`, p.regex);
    if (!["error", "warning", "info"].includes(p.severity)) problems.push(`blocklist/${p.id}: severity "${p.severity}"`);
  }
  record("voice and compliance regex patterns compile", problems);
}

/* ------------------------------------------------------------------ */
/* 9. Compliance blocklist covers the required categories              */
/* ------------------------------------------------------------------ */
interface BlocklistFile {
  entities: { name: string; aliases: string[]; category: string }[];
}
{
  const problems: string[] = [];
  const blocklist = readJson(abs("modules", "compliance", "blocklist.json"), problems) as BlocklistFile | undefined;
  if (blocklist) {
    const names = (category: string): string[] =>
      blocklist.entities.filter((e) => e.category === category).map((e) => e.name);
    if (names("employer").length < 4) problems.push("expected at least 4 employer entries (the owner's employer and its programmes)");
    for (const category of ["bank", "regulator"]) {
      if (names(category).length === 0) problems.push(`no ${category} entries`);
    }
    for (const e of blocklist.entities) {
      if (!["employer", "bank", "regulator"].includes(e.category)) problems.push(`${e.name}: unknown category "${e.category}"`);
    }
  }
  record("compliance blocklist: employer, bank and regulator entries present", problems);
}

/* ------------------------------------------------------------------ */
/* 10. Branding: employer names appear only in the compliance blocklist */
/* ------------------------------------------------------------------ */
{
  const problems: string[] = [];
  const blocklist = readJson(abs("modules", "compliance", "blocklist.json"), problems) as BlocklistFile | undefined;
  const terms = (blocklist?.entities ?? [])
    .filter((e) => e.category === "employer")
    .flatMap((e) => [e.name, ...e.aliases])
    .map((t) => t.toLowerCase());
  const scanned = [
    ...walk(abs("modules")),
    ...walk(abs("library", "assets")),
    ...walk(abs("skill")),
    abs("README.md"),
    abs("docs", "SELF-REVIEW.md"),
    abs("scripts", "validate-modules.ts"),
  ].filter((p) => existsSync(p) && /\.(json|md|ts)$/.test(p) && rel(p) !== join("modules", "compliance", "blocklist.json"));
  for (const file of scanned) {
    const text = readFileSync(file, "utf8").toLowerCase();
    for (const term of terms) {
      if (text.includes(term)) problems.push(`${rel(file)} contains employer term "${term}"`);
    }
  }
  record(`employer branding absent outside the blocklist (${scanned.length} files scanned)`, problems);
}

/* ------------------------------------------------------------------ */
/* 11. Factuality, publish, design and gate data match contracts        */
/* ------------------------------------------------------------------ */
{
  const problems: string[] = [];
  const rules = readJson(abs("modules", "factuality", "rules.json"), problems) as
    | { minIndependentSources: number; requirePrimarySource: boolean; validityDays: Record<string, number> }
    | undefined;
  if (rules) {
    if (rules.minIndependentSources !== FACTUALITY_RULES.minIndependentSources) problems.push("minIndependentSources differs from contracts");
    if (rules.requirePrimarySource !== FACTUALITY_RULES.requirePrimarySource) problems.push("requirePrimarySource differs from contracts");
    for (const key of ["fact", "number", "quote", "interpretation"]) {
      if (typeof rules.validityDays[key] !== "number") problems.push(`validityDays.${key} missing`);
    }
  }
  record("factuality rules agree with contracts", problems);
}
{
  const problems: string[] = [];
  const post = readJson(abs("modules", "publish", "post-format.json"), problems) as
    | { hookLines: number; maxHashtags: number; firstCommentTemplate: string }
    | undefined;
  if (post) {
    if (post.maxHashtags > 3) problems.push("maxHashtags above the Post schema limit of 3");
    for (const token of ["{{sources}}", "{{desktopUrl}}"]) {
      if (!post.firstCommentTemplate.includes(token)) problems.push(`firstCommentTemplate lacks ${token}`);
    }
  }
  record("publish format within the Post schema", problems);
}
{
  const problems: string[] = [];
  const tokens = readJson(abs("modules", "design", "tokens.json"), problems) as
    | { base: string; accents: { name: string; hex: string }[] }
    | undefined;
  if (tokens) {
    if (tokens.accents.length !== 8) problems.push(`expected 8 accents, found ${tokens.accents.length}`);
    for (const a of tokens.accents) {
      if (!HexColor.safeParse(a.hex).success) problems.push(`accent ${a.name}: invalid hex ${a.hex}`);
    }
    if (!HexColor.safeParse(tokens.base).success) problems.push(`base: invalid hex ${tokens.base}`);
  }
  record("design tokens: base and accents are valid hex colours", problems);
}
{
  const problems: string[] = [];
  const criteria = readJson(abs("modules", "gate", "criteria.json"), problems) as
    | { criteria: unknown[]; hardRules: { id: string }[]; process?: { steps: unknown[] }; scoring?: { minScore: number; minRounds: number }; audit?: unknown }
    | undefined;
  if (criteria) {
    if (criteria.criteria.length !== 6) problems.push(`expected 6 criteria, found ${criteria.criteria.length}`);
    if (criteria.hardRules.length !== 12) problems.push(`expected 12 hard rules, found ${criteria.hardRules.length}`);
    // the three rules the render audit depends on
    for (const id of ["passage_both_sides", "visible_motion", "audio_measured"]) {
      if (!criteria.hardRules.some((r) => r.id === id)) problems.push(`missing hard rule ${id}`);
    }
    if (!criteria.process?.steps?.length) problems.push("gate process is missing its steps");
    if (criteria.scoring?.minScore !== 4) problems.push(`scoring.minScore must be 4, found ${criteria.scoring?.minScore}`);
    if ((criteria.scoring?.minRounds ?? 0) < 2) problems.push("scoring.minRounds must be at least 2");
    if (!criteria.audit) problems.push("gate audit block is missing");
  }
  record("gate criteria: 6 criteria, 12 hard rules, process, scoring and audit", problems);
}
{
  const problems: string[] = [];
  const sources = readJson(abs("modules", "radar", "sources.json"), problems) as
    | { publishers: { tier: string }[]; feeds: unknown[] }
    | undefined;
  const warnings: string[] = [];
  if (sources) {
    const n = sources.publishers.length;
    if (n < 15 || n > 20) problems.push(`publishers: ${n}, expected 15 to 20`);
    for (const p of sources.publishers) {
      if (!["primary", "tier1", "tier2"].includes(p.tier)) problems.push(`publisher tier "${p.tier}" is not primary, tier1 or tier2`);
    }
    if (sources.feeds.length === 0) warnings.push("feeds is empty: owner must confirm feed URLs before radar can run");
  }
  record("radar sources: 15 to 20 publishers with valid tiers", problems, warnings);
}

/* ------------------------------------------------------------------ */
/* Report                                                              */
/* ------------------------------------------------------------------ */
let failed = 0;
let warned = 0;
for (const r of results) {
  const status = r.problems.length === 0 ? "PASS" : "FAIL";
  if (status === "FAIL") failed += 1;
  console.log(`${status}  ${r.name}`);
  for (const p of r.problems) console.log(`      - ${p}`);
  for (const w of r.warnings) {
    warned += 1;
    console.log(`WARN  ${r.name}: ${w}`);
  }
}
console.log("");
console.log(`${results.length} checks, ${results.length - failed} passed, ${failed} failed, ${warned} warnings`);
process.exitCode = failed === 0 ? 0 : 1;
