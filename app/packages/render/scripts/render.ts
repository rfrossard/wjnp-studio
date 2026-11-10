/**
 * npx tsx packages/render/scripts/render.ts <episodeId> <master|desktop|cut> [--stills]
 *
 * Without --stills: renders episodes/<id>/out/<composition>.mp4 (h264).
 * With --stills:    writes one PNG per scene (mid-scene frame) to
 *                   episodes/<id>/out/stills/<vertical|horizontal>/<sceneId>.png
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
import { Episode, FPS, OUTPUTS } from "@wjnp/contracts";
import { type OutputKind, type ResolvedAssets, sceneFrames, scenesFor } from "../src/model";

const here = path.dirname(fileURLToPath(import.meta.url));

function findRoot(): string {
  if (process.env.WJNP_ROOT) return path.resolve(process.env.WJNP_ROOT);
  let d = here;
  for (let i = 0; i < 8; i++) {
    if (fs.existsSync(path.join(d, "CLAUDE.md"))) return d;
    d = path.dirname(d);
  }
  throw new Error("Cannot find repo root (no CLAUDE.md above scripts/). Set WJNP_ROOT.");
}

function findEpisodeDir(root: string, id: string): string {
  for (const d of [path.join(root, "episodes", id), path.join(root, "episodes", "_golden", id)]) {
    if (fs.existsSync(path.join(d, "episode.json"))) return d;
  }
  throw new Error(`Episode "${id}" not found in episodes/ or episodes/_golden/`);
}

/** Copy resolvable files into a temp public dir so the bundle can serve them via staticFile(). */
function resolveAssets(root: string, epDir: string, episode: Episode, kind: OutputKind, pub: string): ResolvedAssets {
  const res: ResolvedAssets = { narration: {}, clips: {}, music: [] };
  const take = (candidates: string[], name: string): string | null => {
    for (const c of candidates) {
      if (c && fs.existsSync(c) && fs.statSync(c).isFile()) {
        const ext = path.extname(c);
        const rel = `${name}${ext}`;
        fs.mkdirSync(path.dirname(path.join(pub, rel)), { recursive: true });
        fs.copyFileSync(c, path.join(pub, rel));
        return rel;
      }
    }
    return null;
  };
  const asset = (type: string, id: string) => {
    const f = path.join(root, "library", "assets", type, `${id}.json`);
    if (!fs.existsSync(f)) return null;
    try {
      return JSON.parse(fs.readFileSync(f, "utf8")) as { blob?: { path: string; sha256: string } };
    } catch {
      return null;
    }
  };
  const blobCandidates = (a: { blob?: { path: string; sha256: string } } | null) =>
    a?.blob ? [path.join(root, "library", "blobs", a.blob.path), path.join(root, "library", "blobs", a.blob.sha256)] : [];

  for (const s of scenesFor(episode, kind)) {
    const p = s.narration.audio?.path;
    if (p) {
      const rel = take([path.isAbsolute(p) ? p : "", path.join(epDir, p), path.join(root, p), path.join(epDir, "cache", p), path.join(epDir, "cache", path.basename(p))], `narration/${s.id}`);
      if (rel) res.narration[s.id] = rel;
    }
    if (s.onScreen.template === "clip") {
      const id = s.onScreen.clipAssetId;
      const rel = take(blobCandidates(asset("clip", id)), `clips/${id}`);
      if (rel) res.clips[id] = rel;
    }
  }
  for (const id of episode.audio.musicAssetIds) {
    const rel = take(blobCandidates(asset("music", id)), `music/${id}`);
    if (rel) res.music.push(rel);
  }
  return res;
}

async function main() {
  const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
  const stills = process.argv.includes("--stills");
  const [id, comp] = args;
  if (!id || !comp || !(comp in OUTPUTS)) {
    console.error("usage: npx tsx packages/render/scripts/render.ts <episodeId> <master|desktop|cut> [--stills]");
    process.exit(2);
  }
  const kind = comp as OutputKind;
  const root = findRoot();
  const epDir = findEpisodeDir(root, id);
  const episode = Episode.parse(JSON.parse(fs.readFileSync(path.join(epDir, "episode.json"), "utf8")));
  const outDir = path.join(epDir, "out");
  fs.mkdirSync(outDir, { recursive: true });

  const pub = fs.mkdtempSync(path.join(os.tmpdir(), "wjnp-public-"));
  const resolved = resolveAssets(root, epDir, episode, kind, pub);
  const tokensFile = path.join(root, "modules", "design", "tokens.json");
  const tokens = fs.existsSync(tokensFile) ? JSON.parse(fs.readFileSync(tokensFile, "utf8")) : undefined;
  const inputProps = { episode, tokens, resolved };

  const chrome = process.env.CHROME_PATH || (fs.existsSync("/usr/bin/google-chrome") ? "/usr/bin/google-chrome" : undefined);
  const browserExecutable = chrome ?? null;
  const chromiumOptions = { gl: "swangle" as const, disableWebSecurity: false };

  console.log(`bundling (${Object.keys(resolved.narration).length} narration, ${Object.keys(resolved.clips).length} clips, ${resolved.music.length} music files resolved)...`);
  const serveUrl = await bundle({ entryPoint: path.join(here, "..", "src", "index.ts"), publicDir: pub });

  if (stills) {
    // vertical stills from the 9:16 master, horizontal stills from the 16:9 desktop composition; all scenes.
    for (const [compId, layoutDir] of [["master", "vertical"], ["desktop", "horizontal"]] as const) {
      const composition = await selectComposition({ serveUrl, id: compId, inputProps, browserExecutable, chromiumOptions });
      const dir = path.join(outDir, "stills", layoutDir);
      fs.mkdirSync(dir, { recursive: true });
      let at = 0;
      for (const s of scenesFor(episode, compId)) {
        const dur = sceneFrames(s);
        const frame = at + Math.floor(dur / 2);
        at += dur;
        const output = path.join(dir, `${s.id}.png`);
        await renderStill({ composition, serveUrl, output, frame, inputProps, browserExecutable, chromiumOptions, imageFormat: "png" });
        console.log("still", path.relative(root, output));
      }
    }
    return;
  }

  const composition = await selectComposition({ serveUrl, id: kind, inputProps, browserExecutable, chromiumOptions });
  const output = path.join(outDir, `${kind}.mp4`);
  console.log(`rendering ${kind}: ${composition.durationInFrames} frames @ ${FPS}fps -> ${path.relative(root, output)}`);
  let last = -1;
  await renderMedia({
    composition,
    serveUrl,
    codec: "h264",
    outputLocation: output,
    inputProps,
    browserExecutable,
    chromiumOptions,
    onProgress: ({ progress }) => {
      const pct = Math.floor(progress * 10);
      if (pct !== last) {
        last = pct;
        console.log(`  ${pct * 10}%`);
      }
    },
  });
  console.log("done", path.relative(root, output));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
