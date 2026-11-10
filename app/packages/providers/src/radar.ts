import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RadarSources } from "./modules";
import { findRoot, sha256Hex } from "./util";

export interface RadarItem {
  title: string;
  url: string;
  publisher: string;
  publishedAt: string; // ISO
  summary: string;
}

/** Shape documented for GET /api/radar. */
export interface RadarTheme {
  id: string;
  title: string;
  thesis: string;
  messages: string[];
  sources: { title: string; url: string; publisher: string }[];
}
export interface Radar {
  generatedAt: string;
  themes: RadarTheme[];
}

/* ---------------- minimal RSS / Atom parsing ---------------- */

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

function decode(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&#x([0-9a-f]+);/gi, (_, h: string) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d: string) => String.fromCodePoint(parseInt(d, 10)))
    .replace(/&([a-z]+);/gi, (m, n: string) => ENTITIES[n.toLowerCase()] ?? m);
}

const stripTags = (s: string) => decode(decode(s).replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();

function tagText(block: string, names: string[]): string | undefined {
  for (const n of names) {
    const m = new RegExp(`<${n}(?:\\s[^>]*)?>([\\s\\S]*?)</${n}>`, "i").exec(block);
    if (m && m[1]!.trim()) return m[1]!;
  }
  return undefined;
}

function linkOf(block: string): string | undefined {
  const tags = [...block.matchAll(/<link\b([^>]*?)(?:\/>|>([\s\S]*?)<\/link>)/gi)];
  for (const t of tags) {
    const text = t[2] ? stripTags(t[2]) : "";
    if (/^https?:\/\//i.test(text)) return text;
  }
  for (const t of tags) {
    const attrs = t[1] ?? "";
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1];
    if (href && (!rel || rel === "alternate")) return decode(href);
  }
  const guid = tagText(block, ["guid", "id"]);
  const g = guid ? stripTags(guid) : "";
  return /^https?:\/\//i.test(g) ? g : undefined;
}

export interface ParsedEntry {
  title: string;
  url: string;
  date?: Date;
  summary: string;
}

/** Parses RSS 2.0 `<item>` and Atom `<entry>` blocks. Entries without a title or URL are skipped. */
export function parseFeed(xml: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  for (const m of xml.matchAll(/<(item|entry)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const block = m[2]!;
    const title = stripTags(tagText(block, ["title"]) ?? "");
    const url = linkOf(block);
    if (!title || !url) continue;
    const dateRaw = tagText(block, ["pubDate", "published", "updated", "dc:date"]);
    const t = dateRaw ? Date.parse(stripTags(dateRaw)) : NaN;
    const summary = stripTags(tagText(block, ["description", "summary", "content:encoded", "content"]) ?? "").slice(0, 600);
    out.push({ title, url, summary, ...(Number.isNaN(t) ? {} : { date: new Date(t) }) });
  }
  return out;
}

/* ---------------- dedupe and clustering ---------------- */

export function normalizeUrl(u: string): string {
  try {
    const url = new URL(u);
    url.hash = "";
    for (const k of [...url.searchParams.keys()]) if (/^(utm_|fbclid$|gclid$|ref$)/i.test(k)) url.searchParams.delete(k);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return `${host}${url.pathname.replace(/\/+$/, "")}${url.search}`;
  } catch {
    return u.trim().toLowerCase();
  }
}

const normTitle = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();

const STOP = new Set("the and for with that this from are was were has have had not but you your our its into over after about than then them they their will can could would should more most new how what why who when which while also just now one two out all any his her she him who whom been being per via vs".split(" "));

export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const w of text.toLowerCase().split(/[^\p{L}\p{N}]+/u)) {
    if (w.length < 3 || STOP.has(w)) continue;
    out.add(w.length > 4 && w.endsWith("s") ? w.slice(0, -1) : w);
  }
  return out;
}

function overlap(a: Set<string>, b: Set<string>): { shared: number; jaccard: number } {
  let shared = 0;
  for (const t of a) if (b.has(t)) shared++;
  const union = a.size + b.size - shared;
  return { shared, jaccard: union === 0 ? 0 : shared / union };
}

/** Drops duplicates by normalised URL or title; the surviving item keeps the longest summary seen. */
export function dedupe(items: RadarItem[]): RadarItem[] {
  const byKey = new Map<string, RadarItem>();
  const out: RadarItem[] = [];
  for (const it of items) {
    const keys = [`u:${normalizeUrl(it.url)}`, `t:${normTitle(it.title)}`];
    const hit = keys.map((k) => byKey.get(k)).find((x): x is RadarItem => !!x);
    if (hit) {
      if (it.summary.length > hit.summary.length) hit.summary = it.summary;
      keys.forEach((k) => byKey.set(k, hit));
      continue;
    }
    const copy = { ...it };
    keys.forEach((k) => byKey.set(k, copy));
    out.push(copy);
  }
  return out;
}

/** Single-link clustering by token overlap (Jaccard >= similarity and >= 2 shared tokens). */
export function clusterItems(items: RadarItem[], similarity = 0.2): RadarItem[][] {
  const toks = items.map((i) => tokens(`${i.title} ${i.title} ${i.summary.slice(0, 200)}`));
  const parent = items.map((_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x]!)));
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const o = overlap(toks[i]!, toks[j]!);
      if (o.shared >= 2 && o.jaccard >= similarity) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, RadarItem[]>();
  items.forEach((it, i) => {
    const r = find(i);
    groups.set(r, [...(groups.get(r) ?? []), it]);
  });
  return [...groups.values()];
}

function toTheme(cluster: RadarItem[]): RadarTheme {
  const toks = cluster.map((i) => tokens(`${i.title} ${i.summary.slice(0, 200)}`));
  let best = 0;
  let bestScore = -1;
  cluster.forEach((_, i) => {
    const score = toks.reduce((s, t, j) => (j === i ? s : s + overlap(toks[i]!, t).jaccard), 0);
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  });
  const c = cluster[best]!;
  const thesis = (c.summary.split(/(?<=[.!?])\s/)[0] ?? c.title).slice(0, 220) || c.title;
  const sorted = [...cluster].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url));
  return {
    id: `t-${sha256Hex(normalizeUrl(c.url)).slice(0, 8)}`,
    title: c.title,
    thesis,
    messages: [], // messages are written by the frontier brainstorm step, never by the radar
    sources: sorted.map((i) => ({ title: i.title, url: i.url, publisher: i.publisher })),
  };
}

/* ---------------- collection ---------------- */

export interface CollectOptions {
  sources: RadarSources;
  fetch: typeof fetch;
  now: Date;
  windowDays?: number;
  maxThemes?: number;
  similarity?: number;
  /** write episodes/_radar/latest.json (default true) */
  write?: boolean;
  root?: string;
}

export async function collectRadar(opts: CollectOptions): Promise<{ radar: Radar; errors: { feed: string; error: string }[]; itemCount: number }> {
  const windowMs = (opts.windowDays ?? 7) * 86400000;
  const from = opts.now.getTime() - windowMs;
  const to = opts.now.getTime() + 86400000; // tolerate small clock skew on feeds
  const errors: { feed: string; error: string }[] = [];
  const items: RadarItem[] = [];

  const pub = (url: string, feedName: string): string => {
    try {
      const host = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
      const p = opts.sources.publishers.find((x) => host === x.domain.toLowerCase() || host.endsWith(`.${x.domain.toLowerCase()}`));
      return p?.name ?? feedName;
    } catch {
      return feedName;
    }
  };

  for (const feed of opts.sources.feeds) {
    try {
      const res = await opts.fetch(feed.url, { headers: { "user-agent": "wjnp-radar/0.1", accept: "application/rss+xml, application/atom+xml, text/xml, */*" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      for (const e of parseFeed(await res.text())) {
        // an item without a date cannot be shown to be inside the window, so it is dropped
        if (!e.date) continue;
        const t = e.date.getTime();
        if (t < from || t > to) continue;
        items.push({ title: e.title, url: e.url, publisher: pub(e.url, feed.name), publishedAt: e.date.toISOString(), summary: e.summary });
      }
    } catch (err) {
      errors.push({ feed: feed.name, error: (err as Error).message });
    }
  }

  const unique = dedupe([...items].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || a.url.localeCompare(b.url)));
  const themes = clusterItems(unique, opts.similarity ?? 0.2)
    .map((cl) => ({ cl, publishers: new Set(cl.map((i) => i.publisher)).size, newest: cl.reduce((m, i) => (i.publishedAt > m ? i.publishedAt : m), "") }))
    .sort((a, b) => b.publishers - a.publishers || b.cl.length - a.cl.length || b.newest.localeCompare(a.newest))
    .slice(0, opts.maxThemes ?? 12)
    .map((x) => toTheme(x.cl));

  const radar: Radar = { generatedAt: opts.now.toISOString(), themes };
  if (opts.write !== false) {
    const dir = join(opts.root ?? findRoot(), "episodes", "_radar");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "latest.json"), JSON.stringify(radar, null, 2));
  }
  return { radar, errors, itemCount: unique.length };
}
