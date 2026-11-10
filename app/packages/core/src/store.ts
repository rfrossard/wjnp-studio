import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import type { z } from "zod";
import {
  Asset,
  AssetType,
  Blob as BlobSchema,
  Brief,
  Episode,
  Feedback,
  ModuleManifest,
  ModuleName,
  Proposal,
  SCHEMA_VERSION,
} from "@wjnp/contracts";
import { pickAccent, sha256Hex } from "./accent.ts";
import { findRoot } from "./root.ts";
import {
  BlocklistFile,
  DEFAULT_BLOCKLIST,
  DEFAULT_DESIGN_TOKENS,
  DEFAULT_FACTUALITY,
  DEFAULT_POST_FORMAT,
  DEFAULT_VOICES,
  DesignTokensFile,
  FactualityRulesFile,
  PostFormatFile,
  RoutingFile,
  VoicesFile,
  defaultManifest,
  normalizeRouting,
  type Routing,
} from "./modules.ts";

export class NotFoundError extends Error {
  status = 404 as const;
}

export interface EpisodeSummary {
  id: string;
  title: string;
  weekOf: string;
  state: Episode["state"];
  golden: boolean;
}

export interface Approvals {
  brief?: string;
  script?: string;
  final?: string;
  publish?: string;
}

/** Ensure `p` is inside `base` (path traversal guard). Returns the resolved absolute path. */
export function safeJoin(base: string, ...parts: string[]): string {
  const b = resolve(base);
  const p = resolve(b, ...parts);
  if (p !== b && !p.startsWith(b + sep)) throw new Error(`Path escapes ${base}: ${parts.join("/")}`);
  return p;
}

function writeAtomic(path: string, content: string | Uint8Array) {
  mkdirSync(dirname(path), { recursive: true });
  const tmp = `${path}.tmp-${process.pid}-${Date.now()}`;
  writeFileSync(tmp, content);
  renameSync(tmp, path);
}

const json = (v: unknown) => JSON.stringify(v, null, 2) + "\n";

export class Store {
  readonly root: string;
  /** In-memory overrides of repo-relative files (used by regress to test a proposal without writing it). */
  private overrides: Map<string, string>;
  /** Problems met while loading module files (fell back to defaults). */
  readonly moduleWarnings: string[] = [];

  constructor(root: string = findRoot(), overrides: Map<string, string> = new Map()) {
    this.root = resolve(root);
    this.overrides = overrides;
  }

  /** A view of the same store where `relPath` reads as `content`. */
  withOverride(relPath: string, content: string): Store {
    const m = new Map(this.overrides);
    m.set(relPath.split(sep).join("/"), content);
    return new Store(this.root, m);
  }

  path(...parts: string[]) {
    return safeJoin(this.root, ...parts);
  }

  readText(relPath: string): string | undefined {
    const key = relPath.split(sep).join("/");
    if (this.overrides.has(key)) return this.overrides.get(key);
    const abs = this.path(relPath);
    return existsSync(abs) ? readFileSync(abs, "utf8") : undefined;
  }

  writeText(relPath: string, content: string) {
    writeAtomic(this.path(relPath), content);
  }

  /* ------------------------------ episodes ------------------------------ */

  private episodeLocation(id: string): { dir: string; golden: boolean } | undefined {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) return undefined;
    const normal = this.path("episodes", id);
    if (existsSync(join(normal, "episode.json"))) return { dir: normal, golden: false };
    const golden = this.path("episodes", "_golden", id);
    if (existsSync(join(golden, "episode.json"))) return { dir: golden, golden: true };
    return undefined;
  }

  episodeDir(id: string): string {
    const loc = this.episodeLocation(id);
    if (!loc) throw new NotFoundError(`Episode not found: ${id}`);
    return loc.dir;
  }

  isGolden(id: string): boolean {
    return this.episodeLocation(id)?.golden ?? false;
  }

  hasEpisode(id: string): boolean {
    return !!this.episodeLocation(id);
  }

  listEpisodes(): EpisodeSummary[] {
    const out: EpisodeSummary[] = [];
    const scan = (dir: string, golden: boolean) => {
      if (!existsSync(dir)) return;
      for (const name of readdirSync(dir).sort()) {
        if (name.startsWith("_") || name.startsWith(".")) continue;
        const f = join(dir, name, "episode.json");
        if (!existsSync(f)) continue;
        try {
          const ep = Episode.parse(JSON.parse(readFileSync(f, "utf8")));
          out.push({ id: ep.id, title: ep.title, weekOf: ep.weekOf, state: ep.state, golden });
        } catch {
          /* unparsable episodes are skipped from the list; `validate` reports them */
        }
      }
    };
    scan(this.path("episodes"), false);
    scan(this.path("episodes", "_golden"), true);
    return out;
  }

  goldenIds(): string[] {
    return this.listEpisodes().filter((e) => e.golden).map((e) => e.id);
  }

  getEpisode(id: string): Episode {
    const dir = this.episodeDir(id);
    const ep = Episode.parse(JSON.parse(readFileSync(join(dir, "episode.json"), "utf8")));
    ep.approvals = this.readApprovals(dir); // approvals.json is the source of truth
    return ep;
  }

  private readApprovals(dir: string): Approvals {
    const f = join(dir, "approvals.json");
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Approvals) : {};
  }

  /** What the owner approved in the script: every narration and on-screen text, in order. */
  private scriptFingerprint(ep: Episode): string {
    return JSON.stringify(ep.scenes.map((s) => [s.id, s.order, s.narration.voiceId, s.narration.text, s.onScreen]));
  }

  private existingConfirmation(id: string): string | undefined {
    try {
      return this.getEpisode(id).post?.ownerConfirmedAt;
    } catch {
      return undefined;
    }
  }

  /**
   * Save an episode. `post.ownerConfirmedAt` is never taken from the input: the stored value is kept.
   * Only `approve(..., "publish")` sets it (through `saveEpisodeWithConfirmation`).
   */
  saveEpisode(input: unknown): Episode {
    const ep = Episode.parse(input);
    if (this.hasEpisode(ep.id)) {
      const stored = this.getEpisode(ep.id);
      if (stored.state === "locked") throw new Error(`Episode ${ep.id} is locked (publish was confirmed) and cannot be changed`);
      // Editing the script after it was approved withdraws the script and final approvals.
      if ((stored.approvals.script || stored.approvals.final) && this.scriptFingerprint(stored) !== this.scriptFingerprint(ep)) {
        const a = { ...stored.approvals };
        delete a.script;
        delete a.final;
        this.saveApprovals(ep.id, a);
        if (ep.state === "approved") ep.state = "validated";
      }
    }
    const keep = this.hasEpisode(ep.id) ? this.existingConfirmation(ep.id) : undefined;
    if (ep.post) {
      if (keep) ep.post.ownerConfirmedAt = keep;
      else delete ep.post.ownerConfirmedAt;
    }
    return this.writeEpisode(ep);
  }

  /** @internal used only by approve.ts for the publish approval. */
  saveEpisodeWithConfirmation(ep: Episode, confirmedAt: string): Episode {
    const parsed = Episode.parse(ep);
    if (!parsed.post) throw new Error("Episode has no post to confirm");
    parsed.post.ownerConfirmedAt = confirmedAt;
    return this.writeEpisode(parsed);
  }

  private writeEpisode(ep: Episode): Episode {
    const loc = this.episodeLocation(ep.id);
    const dir = loc?.dir ?? this.path("episodes", ep.id);
    ep.approvals = this.readApprovals(dir); // never taken from the caller
    writeAtomic(join(dir, "episode.json"), json(ep));
    return ep;
  }

  createEpisode(input: { id: string; title: string; weekOf: string; brief: unknown }): Episode {
    if (this.hasEpisode(input.id)) throw new Error(`Episode already exists: ${input.id}`);
    const accent = pickAccent(input.id, this.designTokens().accents);
    const ep = Episode.parse({
      schemaVersion: SCHEMA_VERSION,
      id: input.id,
      title: input.title,
      weekOf: input.weekOf,
      state: "draft",
      brief: Brief.parse(input.brief),
      design: { profile: "personal", accent, styles: ["editorial_data"] },
      audio: { narratorVoiceId: this.voices().narrator.assetId, castVoiceIds: [], musicAssetIds: [] },
      moduleVersions: Object.fromEntries(this.listModules().map((m) => [m.name, m.version])),
    });
    mkdirSync(this.path("episodes", ep.id), { recursive: true });
    return this.writeEpisode(ep);
  }

  getApprovals(id: string): Approvals {
    const f = join(this.episodeDir(id), "approvals.json");
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as Approvals) : {};
  }

  saveApprovals(id: string, a: Approvals) {
    writeAtomic(join(this.episodeDir(id), "approvals.json"), json(a));
  }

  /* ------------------------------ library ------------------------------ */

  listAssets(type?: AssetType): Asset[] {
    const base = this.path("library", "assets");
    if (!existsSync(base)) return [];
    const types = type ? [type] : readdirSync(base).filter((t) => AssetType.safeParse(t).success);
    const out: Asset[] = [];
    for (const t of types.sort()) {
      const dir = join(base, t);
      if (!existsSync(dir) || !statSync(dir).isDirectory()) continue;
      for (const f of readdirSync(dir).sort()) {
        if (!f.endsWith(".json")) continue;
        out.push(Asset.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
      }
    }
    return out;
  }

  getAsset(id: string, type?: AssetType): Asset | undefined {
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(id)) return undefined;
    const types = type ? [type] : AssetType.options;
    for (const t of types) {
      const f = this.path("library", "assets", t, `${id}.json`);
      if (existsSync(f)) return Asset.parse(JSON.parse(readFileSync(f, "utf8")));
    }
    return undefined;
  }

  saveAsset(input: unknown): Asset {
    const a = Asset.parse(input);
    writeAtomic(this.path("library", "assets", a.type, `${a.id}.json`), json(a));
    return a;
  }

  /** Content-addressed blob write; idempotent. */
  putBlob(bytes: Uint8Array | string, mime: string): z.infer<typeof BlobSchema> {
    const buf = typeof bytes === "string" ? Buffer.from(bytes, "utf8") : Buffer.from(bytes);
    const sha = sha256Hex(buf);
    const abs = this.path("library", "blobs", sha);
    if (!existsSync(abs)) writeAtomic(abs, buf);
    return BlobSchema.parse({ sha256: sha, path: sha, mime, bytes: buf.byteLength });
  }

  readBlob(sha: string): Buffer {
    return readFileSync(this.path("library", "blobs", sha));
  }

  /* ------------------------------ feedback ------------------------------ */

  private feedbackFile() {
    return this.path("feedback", "feedback.jsonl");
  }

  /** Append-only: an update is a new line with the same id; the latest line wins. */
  appendFeedback(input: unknown): Feedback {
    const fb = Feedback.parse(input);
    mkdirSync(dirname(this.feedbackFile()), { recursive: true });
    appendFileSync(this.feedbackFile(), JSON.stringify(fb) + "\n");
    return fb;
  }

  listFeedback(): Feedback[] {
    const f = this.feedbackFile();
    if (!existsSync(f)) return [];
    const byId = new Map<string, Feedback>();
    for (const line of readFileSync(f, "utf8").split("\n")) {
      if (!line.trim()) continue;
      const fb = Feedback.parse(JSON.parse(line));
      byId.delete(fb.id); // keep insertion order of the latest version
      byId.set(fb.id, fb);
    }
    return [...byId.values()];
  }

  getFeedback(id: string): Feedback | undefined {
    return this.listFeedback().find((f) => f.id === id);
  }

  /* ------------------------------ proposals ------------------------------ */

  listProposals(): Proposal[] {
    const dir = this.path("feedback", "proposals");
    if (!existsSync(dir)) return [];
    return readdirSync(dir)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .map((f) => Proposal.parse(JSON.parse(readFileSync(join(dir, f), "utf8"))));
  }

  getProposal(id: string): Proposal {
    const f = this.path("feedback", "proposals", `${id}.json`);
    if (!/^[a-z0-9][a-z0-9._-]*$/.test(id) || !existsSync(f)) throw new NotFoundError(`Proposal not found: ${id}`);
    return Proposal.parse(JSON.parse(readFileSync(f, "utf8")));
  }

  saveProposal(input: unknown): Proposal {
    const p = Proposal.parse(input);
    writeAtomic(this.path("feedback", "proposals", `${p.id}.json`), json(p));
    return p;
  }

  /* ------------------------------ modules ------------------------------ */

  moduleRel(name: ModuleName, file: string) {
    return `modules/${name}/${file}`;
  }

  getManifest(name: ModuleName): ModuleManifest {
    const text = this.readText(this.moduleRel(name, "manifest.json"));
    if (text === undefined) return defaultManifest(name);
    const r = ModuleManifest.safeParse(safeJson(text));
    if (!r.success) {
      this.moduleWarnings.push(`modules/${name}/manifest.json does not parse; using default`);
      return defaultManifest(name);
    }
    return r.data;
  }

  listModules(): ModuleManifest[] {
    return ModuleName.options.map((n) => this.getManifest(n));
  }

  /** Read `modules/<name>/<file>` as JSON parsed with `schema`; missing or invalid ⇒ `fallback`. */
  readModuleJson<S extends z.ZodTypeAny>(name: ModuleName, file: string, schema: S, fallback: z.output<S>): z.output<S> {
    const text = this.readText(this.moduleRel(name, file));
    if (text === undefined) return fallback;
    const r = schema.safeParse(safeJson(text));
    if (!r.success) {
      this.moduleWarnings.push(`modules/${name}/${file} does not parse (${r.error.issues[0]?.message ?? "invalid"}); using built-in default`);
      return fallback;
    }
    return r.data;
  }

  factualityRules() {
    return this.readModuleJson("factuality", "rules.json", FactualityRulesFile, DEFAULT_FACTUALITY);
  }
  blocklist() {
    return this.readModuleJson("compliance", "blocklist.json", BlocklistFile, DEFAULT_BLOCKLIST);
  }
  designTokens() {
    return this.readModuleJson("design", "tokens.json", DesignTokensFile, DEFAULT_DESIGN_TOKENS);
  }
  voices() {
    return this.readModuleJson("audio", "voices.json", VoicesFile, DEFAULT_VOICES);
  }
  postFormat() {
    return this.readModuleJson("publish", "post-format.json", PostFormatFile, DEFAULT_POST_FORMAT);
  }
  routing(): Routing {
    return normalizeRouting(this.readModuleJson("orchestration", "routing.json", RoutingFile.optional(), undefined));
  }

  relative(abs: string) {
    return relative(this.root, abs).split(sep).join("/");
  }
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
