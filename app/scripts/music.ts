/**
 * npm run music -- <id>                       : show the music menu + the episode's current pick + whether
 *                                                each track is already generated (cached) in the library
 * npm run music -- <id> --set <trackId>        : pick a specific track instead of the tone-matched default
 * npm run music -- <id> --clear                : go back to the default (tone-matched menu track)
 * npm run music -- <id> --pregenerate [--mock] [--ok-spend]
 *                                               : generate (and cache in library/assets/music/) the track
 *                                                 this episode would use, right now, without running the
 *                                                 rest of the pipeline. Once cached, `npm run step -- music`
 *                                                 and the full pipeline reuse it for free.
 * Writes episodes/<id>/episode.json brief.music. A track is generated once per id (content-addressed in
 * library/blobs/), so picking the same id again on another episode never costs anything.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Episode } from "@wjnp/contracts";
import { Store } from "@wjnp/core";
import { LyriaMusic, MockMusic, MusicLibrary, loadModules, pickMusic } from "@wjnp/providers";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) {
  console.error("usage: npm run music -- <episodeId> [--set trackId] [--clear] [--pregenerate] [--mock] [--ok-spend]");
  process.exit(2);
}
const opt = (k: string) => {
  const i = args.indexOf(`--${k}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const has = (k: string) => args.includes(`--${k}`);

const root = process.cwd();
const modules = loadModules(root);
const menu = modules.music?.menu ?? [];
if (!menu.length) {
  console.error("modules/audio/music.json has no menu configured yet.");
  process.exit(2);
}

const epDir = [join(root, "episodes", id), join(root, "episodes", "_golden", id)].find((d) => existsSync(join(d, "episode.json")));
if (!epDir) {
  console.error(`episode ${id} not found`);
  process.exit(2);
}
const epPath = join(epDir, "episode.json");
const ep = JSON.parse(readFileSync(epPath, "utf8"));

const setId = opt("set");
if (setId || has("clear")) {
  ep.brief.music = ep.brief.music ?? {};
  if (setId) {
    const m = menu.find((t) => t.id === setId);
    if (!m) {
      console.error(`unknown track id "${setId}". Known: ${menu.map((t) => t.id).join(", ")}`);
      process.exit(2);
    }
    ep.brief.music.trackAssetId = setId;
  }
  if (has("clear")) delete ep.brief.music.trackAssetId;
  if (!ep.brief.music.trackAssetId) delete ep.brief.music;
  writeFileSync(epPath, JSON.stringify(ep, null, 2) + "\n");
  console.log(`saved. brief.music = ${JSON.stringify(ep.brief.music ?? {})}`);
  console.log(`run \`npm run wjnp -- validate ${id}\` then \`npm run step -- music ${id}\` (or --pregenerate here) to apply it.`);
  process.exit(0);
}

const lib = new MusicLibrary(root);
const curId = ep.brief.music?.trackAssetId;
const curTrack = (curId && menu.find((t) => t.id === curId)) || menu.find((t) => t.tone === ep.brief.tone) || menu[0];

if (has("pregenerate")) {
  const mock = has("mock");
  const store = new Store(root);
  const deps = {
    llm: undefined as never,
    verifierLlm: undefined as never,
    tts: undefined as never,
    music: mock ? new MockMusic() : new LyriaMusic(),
    modules,
    router: undefined as never,
    now: () => new Date(),
    root,
    otherEpisodeCosts: [],
    ownerApprovedSpend: has("ok-spend"),
  };
  const before = store.getEpisode(id);
  const after = await pickMusic(before, deps as Parameters<typeof pickMusic>[1]);
  const spent = after.costs.slice(before.costs.length).reduce((a, c) => a + c.usd, 0);
  store.saveEpisode(Episode.parse(after));
  console.log(`music done for ${id}${mock ? " (mock provider)" : ""} · track ${after.audio.musicAssetIds[0]} · cost $${spent.toFixed(2)}`);
  process.exit(0);
}

console.log(`episode ${id} — current track: ${curTrack.id} (${curTrack.name})\n`);
console.log("Music menu (pick with --set, or --pregenerate to warm the cache now):\n");
for (const t of menu) {
  const mark = t.id === curTrack.id ? " [current]" : "";
  const cached = lib.has(t.id) ? "cached" : "not generated yet";
  console.log(`  ${t.id.padEnd(18)} ${t.name.padEnd(12)} tone=${t.tone.padEnd(13)} ${cached}${mark}`);
  console.log(`    ${t.mood}`);
}
console.log("\nexample: npm run music -- " + id + " --set music-energetic");
console.log("example: npm run music -- " + id + " --pregenerate --mock   (warms the cache for free, for testing)");
