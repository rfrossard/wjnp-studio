import { existsSync, readFileSync } from "node:fs";
import { basename, extname, resolve } from "node:path";
import { Asset, License, type AssetType } from "@wjnp/contracts";
import { sha256Hex } from "./accent.ts";
import type { Store } from "./store.ts";

export type InputKind =
  | "article_url"
  | "arxiv"
  | "doi"
  | "youtube"
  | "video_url"
  | "image_file"
  | "csv"
  | "text"
  | "theme_list";

export interface Classified {
  kind: InputKind;
  /** normalised value: URL, arXiv id, DOI, file path, or the text itself */
  value: string;
  /** for csv: whether `value` is a file path or inline text */
  source?: "file" | "inline";
  themes?: string[];
}

const IMAGE_EXT = [".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".avif"];
const VIDEO_EXT = [".mp4", ".mov", ".webm", ".m4v", ".mkv"];
const VIDEO_HOSTS = ["vimeo.com", "loom.com", "tiktok.com", "twitch.tv", "dailymotion.com", "wistia.com"];
const ARXIV_ID = /^(\d{4}\.\d{4,5})(v\d+)?$/;
const DOI = /^10\.\d{4,9}\/\S+$/;

function asUrl(s: string): URL | undefined {
  if (!/^https?:\/\//i.test(s)) return undefined;
  try {
    return new URL(s);
  } catch {
    return undefined;
  }
}

function looksLikeCsv(lines: string[]): boolean {
  if (lines.length < 2) return false;
  const delim = lines[0]!.includes("\t") ? "\t" : ",";
  const counts = lines.slice(0, 5).map((l) => l.split(delim).length);
  return counts[0]! >= 2 && counts.every((c) => c === counts[0]);
}

const BULLET = /^\s*(?:[-*•]|\d+[.)])\s+/;

export function classifyInput(raw: string): Classified {
  const input = raw.trim();
  const url = asUrl(input);
  if (url && !/\s/.test(input)) {
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "arxiv.org" || host === "export.arxiv.org") {
      const m = /\/(?:abs|pdf|html)\/([^/?#]+?)(?:\.pdf)?$/.exec(url.pathname);
      return { kind: "arxiv", value: (m?.[1] ?? url.pathname.split("/").pop() ?? "").replace(/v\d+$/, "") };
    }
    if (host === "doi.org" || host === "dx.doi.org") return { kind: "doi", value: decodeURIComponent(url.pathname.slice(1)) };
    if (host === "youtube.com" || host === "youtu.be" || host === "youtube-nocookie.com" || host === "music.youtube.com")
      return { kind: "youtube", value: input };
    if (VIDEO_HOSTS.some((h) => host === h || host.endsWith("." + h)) || VIDEO_EXT.includes(extname(url.pathname).toLowerCase()))
      return { kind: "video_url", value: input };
    return { kind: "article_url", value: input };
  }
  const arx = /^arxiv:\s*(\S+)$/i.exec(input)?.[1] ?? (ARXIV_ID.test(input) ? input : undefined);
  if (arx && ARXIV_ID.test(arx)) return { kind: "arxiv", value: arx.replace(/v\d+$/, "") };
  const doi = /^doi:\s*(\S+)$/i.exec(input)?.[1] ?? input;
  if (DOI.test(doi)) return { kind: "doi", value: doi };

  const lines = input.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 1) {
    const ext = extname(input).toLowerCase();
    if (IMAGE_EXT.includes(ext)) return { kind: "image_file", value: input };
    if (ext === ".csv" || ext === ".tsv") return { kind: "csv", value: input, source: "file" };
  }
  if (looksLikeCsv(lines)) return { kind: "csv", value: input, source: "inline" };
  if (lines.length >= 2) {
    const bulleted = lines.filter((l) => BULLET.test(l)).length;
    const short = lines.every((l) => l.length <= 100);
    const sentences = lines.filter((l) => /[.!?]$/.test(l)).length;
    if (short && (bulleted === lines.length || sentences <= lines.length / 2))
      return { kind: "theme_list", value: input, themes: lines.map((l) => l.replace(BULLET, "").trim()).filter(Boolean) };
  }
  return { kind: "text", value: input };
}

/* ------------------------------ import ------------------------------ */

export interface FetchResult {
  status: number;
  contentType?: string;
  body: string;
}
export type Fetcher = (url: string) => Promise<FetchResult>;

/** Default fetcher (network). Tests inject their own. Only text bodies; never used for video bytes. */
export const httpFetcher: Fetcher = async (url) => {
  const r = await fetch(url, { redirect: "follow", headers: { "user-agent": "wjnp-importer/0.1" } });
  return { status: r.status, contentType: r.headers.get("content-type") ?? undefined, body: await r.text() };
};

export interface ImportOptions {
  title?: string;
  license?: unknown;
  fetcher?: Fetcher;
  now?: Date;
  tags?: string[];
}

const PREFIX: Record<InputKind, string> = {
  article_url: "src",
  arxiv: "arxiv",
  doi: "doi",
  youtube: "yt",
  video_url: "video",
  image_file: "img",
  csv: "csv",
  text: "note",
  theme_list: "themes",
};

const TYPE: Record<InputKind, AssetType> = {
  article_url: "source",
  arxiv: "source",
  doi: "source",
  youtube: "clip",
  video_url: "clip",
  image_file: "visual",
  csv: "dataset",
  text: "source",
  theme_list: "thesis",
};

const decodeEntities = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/\s+/g, " ").trim();

export function htmlTitle(html: string): string | undefined {
  const og = /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i.exec(html)?.[1];
  const t = og ?? /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  return t ? decodeEntities(t) : undefined;
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
  ".avif": "image/avif",
};

async function tryFetch(fetcher: Fetcher | undefined, url: string): Promise<FetchResult | undefined> {
  if (!fetcher) return undefined;
  try {
    const r = await fetcher(url);
    return r.status >= 200 && r.status < 300 ? r : undefined;
  } catch {
    return undefined;
  }
}

/** Create a draft Asset from any input. Licence defaults to "unknown" (reference only). Videos: metadata only. */
export async function importInput(store: Store, input: string, opts: ImportOptions = {}): Promise<Asset> {
  const c = classifyInput(input);
  const now = (opts.now ?? new Date()).toISOString();
  const license = opts.license ? License.parse(opts.license) : { kind: "unknown" as const };
  let id = `${PREFIX[c.kind]}-${sha256Hex(c.value).slice(0, 12)}`;
  let title = opts.title;
  let origin: Asset["origin"] = { kind: "paste", capturedAt: now };
  let blob: Asset["blob"];
  const data: Record<string, unknown> = { inputKind: c.kind };

  switch (c.kind) {
    case "article_url": {
      origin = { kind: "url", url: c.value, capturedAt: now };
      data.publisher = new URL(c.value).hostname.replace(/^www\./, "");
      const r = await tryFetch(opts.fetcher, c.value);
      if (r) {
        title ??= htmlTitle(r.body);
        blob = store.putBlob(r.body, r.contentType?.split(";")[0] ?? "text/html");
        data.snapshotSha256 = blob.sha256;
      } else data.fetched = false;
      title ??= c.value;
      break;
    }
    case "arxiv": {
      const abs = `https://arxiv.org/abs/${c.value}`;
      origin = { kind: "url", url: abs, capturedAt: now };
      Object.assign(data, { arxivId: c.value, publisher: "arXiv", pdfUrl: `https://arxiv.org/pdf/${c.value}` });
      const r = await tryFetch(opts.fetcher, abs);
      if (r) {
        title ??= htmlTitle(r.body)?.replace(/^\[[^\]]+\]\s*/, "");
        blob = store.putBlob(r.body, "text/html");
        data.snapshotSha256 = blob.sha256;
      }
      title ??= `arXiv:${c.value}`;
      break;
    }
    case "doi": {
      const url = `https://doi.org/${c.value}`;
      origin = { kind: "url", url, capturedAt: now };
      data.doi = c.value;
      title ??= `doi:${c.value}`;
      break;
    }
    case "youtube":
    case "video_url": {
      // metadata only — the video itself is never downloaded
      origin = { kind: "url", url: c.value, capturedAt: now };
      data.url = c.value;
      data.downloaded = false;
      if (c.kind === "youtube") {
        const u = new URL(c.value);
        const vid = u.hostname.endsWith("youtu.be") ? u.pathname.slice(1) : u.searchParams.get("v") ?? u.pathname.split("/").pop();
        if (vid) {
          data.videoId = vid;
          id = `yt-${vid.toLowerCase().replace(/[^a-z0-9._-]/g, "-")}`.replace(/-+$/, "");
        }
        const r = await tryFetch(opts.fetcher, `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(c.value)}`);
        if (r) {
          try {
            const meta = JSON.parse(r.body) as { title?: string; author_name?: string; author_url?: string };
            title ??= meta.title;
            if (meta.author_name) data.channel = meta.author_name;
            if (meta.author_url) data.channelUrl = meta.author_url;
          } catch {
            /* ignore malformed oEmbed */
          }
        }
      }
      title ??= c.value;
      break;
    }
    case "image_file": {
      const p = resolve(c.value);
      if (!existsSync(p)) throw new Error(`Image file not found: ${c.value}`);
      origin = { kind: "file", capturedAt: now };
      blob = store.putBlob(readFileSync(p), MIME[extname(p).toLowerCase()] ?? "application/octet-stream");
      id = `img-${blob.sha256.slice(0, 12)}`;
      data.fileName = basename(p);
      title ??= basename(p);
      break;
    }
    case "csv": {
      let text = c.value;
      if (c.source === "file") {
        const p = resolve(c.value);
        if (!existsSync(p)) throw new Error(`CSV file not found: ${c.value}`);
        text = readFileSync(p, "utf8");
        origin = { kind: "file", capturedAt: now };
        data.fileName = basename(p);
        title ??= basename(p);
      }
      const lines = text.split(/\r?\n/).filter((l) => l.trim());
      const delim = lines[0]?.includes("\t") ? "\t" : ",";
      data.columns = (lines[0] ?? "").split(delim).map((h) => h.trim());
      data.rows = Math.max(0, lines.length - 1);
      blob = store.putBlob(text, "text/csv");
      id = `csv-${blob.sha256.slice(0, 12)}`;
      title ??= `Dataset (${(data.columns as string[]).join(", ").slice(0, 60)})`;
      break;
    }
    case "theme_list": {
      data.themes = c.themes;
      title ??= `Themes: ${(c.themes ?? []).slice(0, 3).join(" · ").slice(0, 80)}`;
      break;
    }
    case "text": {
      data.text = c.value;
      title ??= c.value.split(/\r?\n/)[0]!.slice(0, 80);
      break;
    }
  }

  const asset = Asset.parse({
    id,
    type: TYPE[c.kind],
    title,
    tags: opts.tags ?? [],
    origin,
    license,
    createdAt: now,
    state: "draft",
    ...(blob ? { blob } : {}),
    data,
  });
  return store.saveAsset(asset);
}
