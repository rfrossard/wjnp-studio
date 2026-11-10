import type { Scene, WordTiming } from "@wjnp/contracts";
import { FPS } from "@wjnp/contracts";
import { countWords, sceneFrames } from "./model";

export interface CaptionWord {
  w: string;
  startFrame: number;
  endFrame: number;
}
export interface CaptionChunk {
  words: CaptionWord[];
  startFrame: number;
  endFrame: number; // exclusive; extends to the start of the next chunk
  text: string;
}

/** Words with scene-local frame timing: real timings if present, else an even spread. */
export function captionWords(scene: Scene): CaptionWord[] {
  const total = sceneFrames(scene);
  const timed: WordTiming[] | undefined = scene.narration.audio?.words;
  if (timed && timed.length > 0) {
    return timed.map((t) => ({ w: t.w, startFrame: Math.round((t.startMs / 1000) * FPS), endFrame: Math.round((t.endMs / 1000) * FPS) }));
  }
  const words = scene.narration.text.trim().split(/\s+/).filter(Boolean);
  const n = Math.max(1, countWords(scene.narration.text));
  const span = Math.max(n, total - Math.min(12, Math.floor(total * 0.1))); // leave a short tail
  const lead = Math.min(6, Math.floor(total * 0.05));
  return words.map((w, i) => ({
    w,
    startFrame: lead + Math.round(((span - lead) * i) / n),
    endFrame: lead + Math.round(((span - lead) * (i + 1)) / n),
  }));
}

/** Group words into display chunks of at most maxChars, preferring breaks after punctuation. */
export function chunkCaptions(words: CaptionWord[], maxChars: number): CaptionChunk[] {
  const chunks: CaptionChunk[] = [];
  let cur: CaptionWord[] = [];
  const len = (ws: CaptionWord[]) => ws.map((x) => x.w).join(" ").length;
  const flush = () => {
    if (!cur.length) return;
    chunks.push({ words: cur, startFrame: cur[0]!.startFrame, endFrame: cur[cur.length - 1]!.endFrame, text: cur.map((x) => x.w).join(" ") });
    cur = [];
  };
  for (const word of words) {
    if (cur.length && len([...cur, word]) > maxChars) flush();
    cur.push(word);
    if (/[.!?]$/.test(word.w) && len(cur) >= 14) flush();
    else if (/[,;:]$/.test(word.w) && len(cur) >= Math.round(maxChars * 0.6)) flush();
  }
  flush();
  for (let i = 0; i < chunks.length - 1; i++) chunks[i]!.endFrame = Math.max(chunks[i]!.endFrame, chunks[i + 1]!.startFrame);
  return chunks;
}

export function activeChunk(chunks: CaptionChunk[], frame: number): CaptionChunk | undefined {
  let found: CaptionChunk | undefined;
  for (const c of chunks) if (frame >= c.startFrame) found = c;
  if (found && frame >= found.endFrame + FPS * 0.5) return undefined; // after a long pause show nothing
  return found;
}
