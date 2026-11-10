import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FPS, type Episode, type WordTiming } from "@wjnp/contracts";
import type { Store } from "./store.ts";
import { contextFromStore } from "./validators/context.ts";
import { runGate, type GateReport } from "./validators/gate.ts";
import { sortedScenes } from "./validators/context.ts";

export interface Kit {
  postText: string;
  firstComment: string;
  credits: string;
  captions: string;
  checklist: string;
}

export interface KitResult {
  postText: string;
  firstComment: string;
  credits: string;
  files: string[];
  dir: string;
}

export function buildPostText(ep: Episode, requiredDisclaimer?: string): string {
  if (!ep.post) throw new Error(`Episode ${ep.id} has no post yet`);
  const parts = [ep.post.text.trim()];
  if (ep.post.hashtags.length) parts.push(ep.post.hashtags.join(" "));
  const disclaimer = (ep.post.disclaimer || requiredDisclaimer || "").trim();
  if (disclaimer && !ep.post.text.toLowerCase().includes(disclaimer.toLowerCase())) parts.push(disclaimer);
  return parts.join("\n\n") + "\n";
}

export function buildFirstComment(ep: Episode): string {
  const lines = ["Sources:"];
  ep.sources
    .filter((s) => s.tier !== "reference_only")
    .forEach((s, i) => lines.push(`${i + 1}. ${s.title} (${s.publisher}) ${s.url}`));
  if (ep.post?.desktopUrl) lines.push("", `Desktop version: ${ep.post.desktopUrl}`);
  return lines.join("\n") + "\n";
}

export function buildCredits(ep: Episode, getAsset: Store["getAsset"]): string {
  const L: string[] = [`# Credits — ${ep.title}`, ""];
  L.push("## Sources", "");
  if (!ep.sources.length) L.push("_none_");
  for (const s of ep.sources) L.push(`- ${s.title} — ${s.publisher}${s.publishedAt ? `, ${s.publishedAt}` : ""} — ${s.url} (${s.tier})`);
  L.push("", "## Assets", "");
  const assetIds = [
    ...new Set(
      ep.scenes.flatMap((s) => [...s.visualAssetIds, ...(s.onScreen.template === "clip" ? [s.onScreen.clipAssetId] : [])]),
    ),
  ];
  if (!assetIds.length) L.push("_none_");
  for (const id of assetIds) {
    const a = getAsset(id);
    if (!a) L.push(`- ${id} — MISSING from library`);
    else L.push(`- ${a.title} (${id}) — licence: ${a.license.kind}${a.license.attribution ? ` — ${a.license.attribution}` : ""}${a.license.url ? ` — ${a.license.url}` : ""}`);
  }
  L.push("", "## Voices", "");
  const voices = [...new Set([ep.audio.narratorVoiceId, ...ep.audio.castVoiceIds, ...ep.scenes.map((s) => s.narration.voiceId)])];
  for (const v of voices) {
    const a = getAsset(v);
    L.push(`- ${a ? `${a.title} (${v})` : v}${v === ep.audio.narratorVoiceId ? " — narrator" : ""}${a ? ` — licence: ${a.license.kind}` : ""}`);
  }
  L.push("", "## Music", "");
  if (!ep.audio.musicAssetIds.length) L.push("_none_");
  for (const id of ep.audio.musicAssetIds) {
    const a = getAsset(id);
    L.push(a ? `- ${a.title} (${id}) — licence: ${a.license.kind}${a.license.attribution ? ` — ${a.license.attribution}` : ""}` : `- ${id} — MISSING from library`);
  }
  return L.join("\n") + "\n";
}

const srtTime = (ms: number) => {
  const t = Math.max(0, Math.round(ms));
  const h = Math.floor(t / 3600000);
  const m = Math.floor((t % 3600000) / 60000);
  const s = Math.floor((t % 60000) / 1000);
  const r = t % 1000;
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(h)}:${p(m)}:${p(s)},${p(r, 3)}`;
};

/** SRT across scenes (master timeline). Uses word timings when present, else an even split over the scene duration. */
export function buildCaptions(ep: Episode, maxWords = 7): string {
  const cues: { start: number; end: number; text: string }[] = [];
  let offset = 0;
  for (const s of sortedScenes(ep)) {
    const words: string[] = s.narration.text.trim().split(/\s+/).filter(Boolean);
    const sceneMs = s.durationFrames
      ? (s.durationFrames / FPS) * 1000
      : s.narration.audio?.durationMs ?? (words.length / 150) * 60000;
    let timings: WordTiming[];
    if (s.narration.audio?.words.length) timings = s.narration.audio.words;
    else {
      const per = words.length ? sceneMs / words.length : 0;
      timings = words.map((w, i) => ({ w, startMs: i * per, endMs: (i + 1) * per }));
    }
    for (let i = 0; i < timings.length; i += maxWords) {
      const chunk = timings.slice(i, i + maxWords);
      cues.push({ start: offset + chunk[0]!.startMs, end: offset + chunk[chunk.length - 1]!.endMs, text: chunk.map((c) => c.w).join(" ") });
    }
    offset += sceneMs;
  }
  return cues.map((c, i) => `${i + 1}\n${srtTime(c.start)} --> ${srtTime(c.end)}\n${c.text}\n`).join("\n");
}

export function buildChecklist(ep: Episode, gate: GateReport, approvals: Record<string, string | undefined>): string {
  const box = (ok: boolean) => (ok ? "[x]" : "[ ]");
  const errors = gate.findings.filter((f) => f.severity === "error");
  const L = [
    `# Publish checklist — ${ep.title}`,
    "",
    `${box(gate.gatePass)} Gate passes (${errors.length} error(s); master ${gate.durations.masterSeconds.toFixed(1)} s, cut ${gate.durations.cutSeconds.toFixed(1)} s)`,
    `${box(!!approvals.brief)} Brief approved`,
    `${box(!!approvals.script)} Script approved`,
    `${box(!!approvals.final)} Final video approved`,
    `${box(!!ep.post?.ownerConfirmedAt)} Owner confirmed publication (post.ownerConfirmedAt)`,
    "[ ] Upload master.mp4 to LinkedIn with post.txt",
    "[ ] Post first-comment.txt as the first comment",
    "[ ] Attach captions.srt",
    "[ ] Share cut.mp4 where needed",
  ];
  if (errors.length) L.push("", "## Open errors", "", ...errors.map((f) => `- ${f.rule}: ${f.message}`));
  return L.join("\n") + "\n";
}

export function writeKit(store: Store, episodeId: string): KitResult {
  const ep = store.getEpisode(episodeId);
  const ctx = contextFromStore(store);
  const postText = buildPostText(ep, store.postFormat().disclaimer);
  const firstComment = buildFirstComment(ep);
  const credits = buildCredits(ep, (id) => store.getAsset(id));
  const captions = buildCaptions(ep);
  const checklist = buildChecklist(ep, runGate(ep, ctx), { ...store.getApprovals(ep.id) });
  const dir = join(store.episodeDir(ep.id), "out", "kit");
  mkdirSync(dir, { recursive: true });
  const files: Record<string, string> = {
    "post.txt": postText,
    "first-comment.txt": firstComment,
    "CREDITS.md": credits,
    "captions.srt": captions,
    "checklist.md": checklist,
  };
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return { postText, firstComment, credits, files: Object.keys(files).map((f) => `kit/${f}`), dir };
}
