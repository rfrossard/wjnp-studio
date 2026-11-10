import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Resolve the repo root: `WJNP_ROOT`, else walk up from `start` (then from this file) to the folder containing CLAUDE.md. */
export function findRoot(start: string = process.cwd()): string {
  const env = process.env.WJNP_ROOT;
  if (env && env.trim()) return resolve(env);
  const fromStart = walkUp(resolve(start));
  if (fromStart) return fromStart;
  const fromHere = walkUp(dirname(fileURLToPath(import.meta.url)));
  if (fromHere) return fromHere;
  throw new Error(`Cannot find repo root (no CLAUDE.md above ${start}); set WJNP_ROOT`);
}

function walkUp(dir: string): string | undefined {
  let cur = dir;
  for (;;) {
    if (existsSync(join(cur, "CLAUDE.md"))) return cur;
    const parent = dirname(cur);
    if (parent === cur) return undefined;
    cur = parent;
  }
}
