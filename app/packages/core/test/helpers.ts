import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { Episode, FPS } from "@wjnp/contracts";
import { Store } from "../src/store.ts";
import { defaultContext, type ValidationContext } from "../src/validators/context.ts";

const REPO = fileURLToPath(new URL("../../../", import.meta.url));
export const GOLDEN_PATH = join(REPO, "episodes/_golden/sample-illustrative/episode.json");

export function golden(): Episode {
  return Episode.parse(JSON.parse(readFileSync(GOLDEN_PATH, "utf8")));
}

/** Golden fixture with durations stretched into the master/cut windows (master 300 s, cut 75 s). */
export function goldenTimed(): Episode {
  const ep = golden();
  const cut = ep.scenes.filter((s) => s.inCut);
  const rest = ep.scenes.filter((s) => !s.inCut);
  for (const s of cut) s.durationFrames = Math.round((75 / cut.length) * FPS);
  for (const s of rest) s.durationFrames = Math.round((225 / rest.length) * FPS);
  return ep;
}

export const ctx = (over: Partial<ValidationContext> = {}) => defaultContext({ today: "2026-11-09", ...over });

/** A throwaway repo root containing CLAUDE.md and the golden episode; sets WJNP_ROOT. No modules/ ⇒ built-in defaults. */
export function tempRoot(opts: { withGoldenTimed?: boolean } = {}): { root: string; store: Store } {
  const root = mkdtempSync(join(tmpdir(), "wjnp-core-"));
  writeFileSync(join(root, "CLAUDE.md"), "# temp root\n");
  const dir = join(root, "episodes/_golden/sample-illustrative");
  mkdirSync(dir, { recursive: true });
  const ep = opts.withGoldenTimed ? goldenTimed() : golden();
  writeFileSync(join(dir, "episode.json"), JSON.stringify(ep, null, 2));
  process.env.WJNP_ROOT = root;
  return { root, store: new Store(root) };
}

export function writeModuleFile(root: string, rel: string, content: string) {
  const p = join(root, rel);
  mkdirSync(join(p, ".."), { recursive: true });
  writeFileSync(p, content);
}
