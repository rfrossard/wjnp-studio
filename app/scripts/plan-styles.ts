/**
 * npm run styles -- <episodeId> [--available footage,manim] [--engines wjnp,kit2] [--no-drafts] [--json]
 * Picks a coherent style set for an episode from modules/styles/catalog.json (see packages/core/src/styles.ts)
 * and prints, per scene, the style, the reason, and whether this studio can render it today.
 */
import fs from "node:fs";
import path from "node:path";
import { loadStyleLibrary, planStyles } from "../packages/core/src/styles.ts";
import type { NarratorTone } from "@wjnp/contracts";

const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith("--"));
if (!id) { console.error("usage: npm run styles -- <episodeId> [--available a,b] [--engines wjnp,kit2] [--no-drafts] [--json]"); process.exit(2); }
const opt = (k: string) => { const i = args.indexOf(`--${k}`); return i >= 0 ? args[i + 1] : undefined; };
const root = process.cwd();
const dir = [path.join(root, "episodes", id), path.join(root, "episodes", "_golden", id)].find((d) => fs.existsSync(path.join(d, "episode.json")));
if (!dir) { console.error(`episode ${id} not found`); process.exit(2); }
const ep = JSON.parse(fs.readFileSync(path.join(dir, "episode.json"), "utf8"));

// brief tones are the script's register; map them onto the narrator scale the catalog uses
const BRIEF_TO_TONE: Record<string, NarratorTone> = { analytical: "analytical", didactic: "conversational", narrative: "conversational", energetic: "energetic", measured: "formal", professional: "formal" };
const tone: NarratorTone = ep.design?.narratorTone ?? BRIEF_TO_TONE[ep.brief?.tone] ?? "conversational";
const STOP = new Set("the a an and or of to in on for with that this is are was be it as at by from your you we our their its into about what just now possible will can how why when".split(" "));
const text = [ep.title, ep.brief?.theme, ep.brief?.thesis, ...(ep.brief?.messages ?? []).map((m: { text: string }) => m.text)].filter(Boolean).join(" ");
const topicWords = [...new Set(text.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((w) => w.length > 3 && !STOP.has(w)))];

const lib = loadStyleLibrary(root);
const plan = planStyles(lib, {
  topicWords, tone,
  scenes: ep.scenes.map((s: { id: string; onScreen: { template: string } }) => ({ id: s.id, template: s.onScreen.template })),
  available: (opt("available") ?? "").split(",").filter(Boolean),
  engines: (opt("engines")?.split(",") as ("wjnp" | "kit2")[] | undefined) ?? ["wjnp", "kit2"],
  allowDraft: !args.includes("--no-drafts"),
});
if (args.includes("--json")) { console.log(JSON.stringify({ tone, topicWords, ...plan, contractStyles: [...new Set([plan.base, ...plan.accents].map((s) => ({ datastory: "editorial_data", stroke: "precise_stroke", flat: "flat_science", demo: "calm_demo", screencast: "screencast_zoom", archival: "archival_bw" } as Record<string,string>)[s] ?? "editorial_data"))] }, null, 2)); process.exit(0); }
const byId = new Map(lib.map((s) => [s.id, s]));
console.log(`tone ${tone} · topic words: ${topicWords.slice(0, 14).join(", ")}`);
console.log(`base ${plan.base}${plan.accents.length ? ` · accents ${plan.accents.join(", ")}` : " · no accents"}`);
for (const s of plan.scenes) {
  const st = byId.get(s.style)!;
  console.log(`  ${s.sceneId.padEnd(5)} ${s.template.padEnd(14)} ${s.style.padEnd(11)}${s.drawAs ? ` as ${s.drawAs}` : ""}  — ${s.why}`);
}
console.log("joins: " + plan.joins.map((j) => `${j.from}→${j.to} ${j.transition}`).join(", "));
// episode.json only accepts the contract's six StyleIds; map the plan onto them
const CONTRACT: Record<string, string> = { datastory: "editorial_data", stroke: "precise_stroke", flat: "flat_science", demo: "calm_demo", screencast: "screencast_zoom", archival: "archival_bw" };
const contractStyles = [...new Set([plan.base, ...plan.accents].map((s) => CONTRACT[s] ?? "editorial_data"))];
const unmapped = [plan.base, ...plan.accents].filter((s) => !CONTRACT[s]);
console.log(`\nepisode.json design.styles: ${JSON.stringify(contractStyles)}${unmapped.length ? `  (${unmapped.join(", ")} has no contract id yet; scenes use editorial_data and the library look enters only as a clip)` : ""}`);
console.log("scene.style per scene: " + plan.scenes.map((s) => `${s.sceneId}=${CONTRACT[s.style] ?? "editorial_data"}`).join(" "));
console.log("\nrender today: scenes are drawn by this studio's templates and preset; a library style enters as a clip:");
for (const sid of [plan.base, ...plan.accents]) {
  const st = byId.get(sid)!;
  console.log(`  ${sid}: ${st.engine === "wjnp" ? "native component (packages/render/src/library), content not yet parameterised" : "motion-director kit 2 project, rendered there and imported as a clip"}${st.needs.length ? `; needs ${st.needs.join(", ")}` : ""}`);
}
