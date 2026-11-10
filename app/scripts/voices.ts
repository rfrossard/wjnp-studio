/**
 * npm run voices -- <id>                                  : show the voice menu + the episode's current picks
 * npm run voices -- <id> --set-narrator <assetId>          : pick who narrates (overrides the clone)
 * npm run voices -- <id> --set-cast <assetId>              : pick the co-voice for quote/clip scenes
 * npm run voices -- <id> --clear-narrator --clear-cast     : go back to the defaults (clone + tone lookup)
 * Writes episodes/<id>/episode.json brief.voices. Changing a pick invalidates that scene's narration
 * cache automatically (the cache key includes the voice id), so the next `npm run step -- narrate <id>`
 * re-synthesizes only what changed.
 */
import fs from "node:fs";
import path from "node:path";

const PREVIEW: Record<string, string> = {
  "voice-river": "https://storage.googleapis.com/eleven-public-prod/premade/voices/SAz9YHcvj6GT2YYXdXww/e6c95f0b-2227-491a-b3d7-2249240decb7.mp3",
  "voice-alice": "https://storage.googleapis.com/eleven-public-prod/premade/voices/Xb7hH8MSUJpSbSDYk0k2/d10f7534-11f6-41fe-a012-2de1e482d336.mp3",
  "voice-george": "https://api.us.elevenlabs.io/v1/voices/JBFqnCBsd6RMkjVDRZzb/previews/audio",
  "voice-liam": "https://storage.googleapis.com/eleven-public-prod/premade/voices/TX3LPaxmHKxFdv7VOQHJ/63148076-6363-42db-aea8-31424308b92c.mp3",
  "voice-bill": "https://storage.googleapis.com/eleven-public-prod/premade/voices/pqHfZKP75CvOlQylNhV4/d782b3ff-84ba-4029-848c-acf01285524d.mp3",
  "voice-sarah": "https://storage.googleapis.com/eleven-public-prod/premade/voices/EXAVITQu4vr4xnSDxMaL/01a3e33c-6e99-4ee7-8543-ff2216a32186.mp3",
};

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) { console.error("usage: npm run voices -- <episodeId> [--set-narrator id] [--set-cast id] [--clear-narrator] [--clear-cast]"); process.exit(2); }
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const has = (k: string) => args.includes(`--${k}`);

const root = process.cwd();
const voices = JSON.parse(fs.readFileSync(path.join(root, "modules", "audio", "voices.json"), "utf8"));
const menu: Array<{ assetId: string; name: string; elevenVoiceId: string; roles: string[]; desc: string }> = voices.menu ?? [];

const epDir = [path.join(root, "episodes", id), path.join(root, "episodes", "_golden", id)].find((d) => fs.existsSync(path.join(d, "episode.json")));
if (!epDir) { console.error(`episode ${id} not found`); process.exit(2); }
const epPath = path.join(epDir, "episode.json");
const ep = JSON.parse(fs.readFileSync(epPath, "utf8"));

const setNarrator = opt("set-narrator"), setCast = opt("set-cast");
if (setNarrator || setCast || has("clear-narrator") || has("clear-cast")) {
  ep.brief.voices = ep.brief.voices ?? {};
  for (const [flag, assetId, role] of [["set-narrator", setNarrator, "narrator"], ["set-cast", setCast, "cast"]] as const) {
    if (!assetId) continue;
    const m = menu.find((v) => v.assetId === assetId);
    if (!m) { console.error(`unknown assetId "${assetId}". Known: ${menu.map((v) => v.assetId).join(", ")}`); process.exit(2); }
    if (!m.roles.includes(role)) { console.error(`${m.name} (${assetId}) isn't offered for ${role}`); process.exit(2); }
  }
  if (setNarrator) ep.brief.voices.narratorAssetId = setNarrator;
  if (setCast) ep.brief.voices.castAssetId = setCast;
  if (has("clear-narrator")) delete ep.brief.voices.narratorAssetId;
  if (has("clear-cast")) delete ep.brief.voices.castAssetId;
  if (!ep.brief.voices.narratorAssetId && !ep.brief.voices.castAssetId) delete ep.brief.voices;
  fs.writeFileSync(epPath, JSON.stringify(ep, null, 2) + "\n");
  console.log(`saved. brief.voices = ${JSON.stringify(ep.brief.voices ?? {})}`);
  console.log("run `npm run wjnp -- validate " + id + "` then re-narrate the affected scenes.");
  process.exit(0);
}

const curNarrator = ep.brief.voices?.narratorAssetId ?? voices.narrator.assetId;
const curCast = ep.brief.voices?.castAssetId ?? `(auto by tone: ${ep.brief.tone})`;
console.log(`episode ${id} — current narrator: ${curNarrator}   current co-voice: ${curCast}\n`);
console.log("Voice menu (play the preview, then pick with --set-narrator / --set-cast):\n");
for (const v of menu) {
  const mark = v.assetId === curNarrator ? " [narrator]" : v.assetId === curCast ? " [cast]" : "";
  console.log(`  ${v.assetId.padEnd(14)} ${v.name.padEnd(16)} roles=${v.roles.join("+").padEnd(13)}${mark}`);
  console.log(`    ${v.desc}`);
  if (PREVIEW[v.assetId]) console.log(`    preview: ${PREVIEW[v.assetId]}`);
}
console.log("\nexample: npm run voices -- " + id + " --set-cast voice-george");
