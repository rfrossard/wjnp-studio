/**
 * Shared, content-addressed store for generated background-music tracks, laid out exactly like
 * @wjnp/core's Store library (library/assets/<type>/<id>.json + library/blobs/<sha256>) so
 * packages/render's existing asset resolution (render.ts's asset("music", id)) needs no changes.
 * providers has no dependency on @wjnp/core, so this is a small, deliberately duplicate writer —
 * same convention as the two VoicesFile schemas.
 */
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { sha256Hex } from "./util";

export interface MusicLibraryEntry {
  id: string;
  type: "music";
  title: string;
  tags: string[];
  origin: { kind: "generated" };
  license: { kind: "generated"; note: string };
  createdAt: string;
  version: 1;
  state: "approved";
  blob: { sha256: string; path: string; mime: string; bytes: number };
  data: Record<string, unknown>;
  usedIn: string[];
}

export class MusicLibrary {
  constructor(private readonly root: string) {}

  private assetPath(id: string): string {
    return join(this.root, "library", "assets", "music", `${id}.json`);
  }

  has(id: string): boolean {
    return existsSync(this.assetPath(id));
  }

  read(id: string): MusicLibraryEntry | null {
    const f = this.assetPath(id);
    return existsSync(f) ? (JSON.parse(readFileSync(f, "utf8")) as MusicLibraryEntry) : null;
  }

  private putBlob(bytes: Buffer, mime: string) {
    const sha = sha256Hex(bytes);
    const dir = join(this.root, "library", "blobs");
    mkdirSync(dir, { recursive: true });
    const abs = join(dir, sha);
    if (!existsSync(abs)) {
      const tmp = `${abs}.tmp`;
      writeFileSync(tmp, bytes);
      renameSync(tmp, abs);
    }
    return { sha256: sha, path: sha, mime, bytes: bytes.byteLength };
  }

  /** Writes (or overwrites) the track asset + its blob. Idempotent: same bytes never duplicate the blob. */
  save(id: string, title: string, audio: Buffer, mime: string, tags: string[] = [], now: Date = new Date()): MusicLibraryEntry {
    const blob = this.putBlob(audio, mime);
    const entry: MusicLibraryEntry = {
      id,
      type: "music",
      title,
      tags,
      origin: { kind: "generated" },
      license: { kind: "generated", note: "Generated instrumental track (Lyria); no vocals, personal-brand use only." },
      createdAt: now.toISOString(),
      version: 1,
      state: "approved",
      blob,
      data: {},
      usedIn: [],
    };
    mkdirSync(join(this.root, "library", "assets", "music"), { recursive: true });
    const f = this.assetPath(id);
    const tmp = `${f}.tmp`;
    writeFileSync(tmp, JSON.stringify(entry, null, 2));
    renameSync(tmp, f);
    return entry;
  }
}
