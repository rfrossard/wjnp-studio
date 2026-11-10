import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

export const sha256Hex = (data: string | Buffer): string => createHash("sha256").update(data).digest("hex");

/** Repo root: WJNP_ROOT, else the nearest ancestor containing CLAUDE.md. */
export function findRoot(start: string = process.cwd()): string {
  const env = process.env.WJNP_ROOT;
  if (env) return resolve(env);
  let dir = resolve(start);
  for (;;) {
    if (existsSync(join(dir, "CLAUDE.md"))) return dir;
    const up = dirname(dir);
    if (up === dir) return resolve(start);
    dir = up;
  }
}

export function readJsonIfExists<T = unknown>(path: string): T | undefined {
  if (!existsSync(path)) return undefined;
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

export const wordCount = (s: string): number => (s.trim() ? s.trim().split(/\s+/).length : 0);

/** ISO-8601 week key, e.g. 2026-W46 (UTC). */
export function isoWeekKey(d: Date): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = Date.UTC(t.getUTCFullYear(), 0, 1);
  const week = Math.ceil(((t.getTime() - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

/** Extract the first complete JSON object/array from model text (handles ``` fences and prose around it). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const candidates = fenced?.[1] ? [fenced[1].trim(), trimmed] : [trimmed];
  for (const c of candidates) {
    try {
      return JSON.parse(c);
    } catch {
      /* fall through to balanced scan */
    }
    const sub = balancedSlice(c);
    if (sub !== undefined) {
      try {
        return JSON.parse(sub);
      } catch {
        /* try next */
      }
    }
  }
  throw new Error("no parseable JSON found in model output");
}

function balancedSlice(s: string): string | undefined {
  const start = s.search(/[{[]/);
  if (start < 0) return undefined;
  const open = s[start]!;
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i]!;
    if (inStr) {
      if (ch === "\\") i++;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return s.slice(start, i + 1);
  }
  return undefined;
}
