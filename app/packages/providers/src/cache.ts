import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { WordTiming } from "@wjnp/contracts";
import type { TTS, VoiceSettings } from "./interfaces";
import { sha256Hex } from "./util";

/** sha256(voiceId \n text \n JSON(settings)); voiceId is the library voice asset id. */
export function narrationKey(voiceId: string, text: string, settings?: VoiceSettings): string {
  return sha256Hex(`${voiceId}\n${text}\n${JSON.stringify(settings ?? {})}`);
}

export interface CacheEntry {
  key: string;
  audio: Buffer;
  mime: string;
  durationMs: number;
  words: WordTiming[];
  /** file name inside the cache dir */
  file: string;
}

const EXT: Record<string, string> = { "audio/mpeg": "mp3", "audio/wav": "wav", "audio/pcm": "pcm", "audio/ogg": "ogg", "audio/basic": "ulaw" };

/** Cache under episodes/<id>/cache/. Cached audio is the reference: an existing key is never re-synthesized. */
export class NarrationCache {
  constructor(readonly dir: string) {}

  private meta(key: string) {
    return join(this.dir, `${key}.json`);
  }

  read(key: string): CacheEntry | null {
    if (!existsSync(this.meta(key))) return null;
    const m = JSON.parse(readFileSync(this.meta(key), "utf8")) as { mime: string; durationMs: number; words: WordTiming[]; file: string };
    const p = join(this.dir, m.file);
    if (!existsSync(p)) return null;
    return { key, audio: readFileSync(p), mime: m.mime, durationMs: m.durationMs, words: m.words, file: m.file };
  }

  write(key: string, e: { audio: Buffer; mime: string; durationMs: number; words: WordTiming[] }): CacheEntry {
    mkdirSync(this.dir, { recursive: true });
    const file = `${key}.${EXT[e.mime] ?? "bin"}`;
    const tmp = join(this.dir, `${file}.tmp`);
    writeFileSync(tmp, e.audio);
    renameSync(tmp, join(this.dir, file));
    writeFileSync(this.meta(key), JSON.stringify({ mime: e.mime, durationMs: e.durationMs, words: e.words, file }, null, 2));
    return { key, ...e, file };
  }
}

export interface CachedSynthesis {
  entry: CacheEntry;
  hit: boolean;
  usd: number;
}

export async function synthesizeCached(args: {
  cache: NarrationCache;
  tts: TTS;
  voiceId: string; // library asset id (part of the key)
  elevenVoiceId: string;
  text: string;
  settings?: VoiceSettings;
  seed?: number;
  /** called before a paid call; may throw (budget) */
  beforeSynthesis?: () => void;
}): Promise<CachedSynthesis> {
  const key = narrationKey(args.voiceId, args.text, args.settings);
  const cached = args.cache.read(key);
  if (cached) return { entry: cached, hit: true, usd: 0 };
  args.beforeSynthesis?.();
  const r = await args.tts.synthesize({
    elevenVoiceId: args.elevenVoiceId,
    text: args.text,
    ...(args.settings ? { settings: args.settings } : {}),
    ...(args.seed !== undefined ? { seed: args.seed } : {}),
  });
  const entry = args.cache.write(key, r);
  return { entry, hit: false, usd: r.usd };
}
