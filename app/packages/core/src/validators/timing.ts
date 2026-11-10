import { DURATION_RULES, FPS, type Episode, type Finding, type Scene } from "@wjnp/contracts";
import { err, info, type ValidationContext } from "./context.ts";

export const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

/** Scene seconds: from durationFrames, else estimated from narration words at wordsPerMinute. */
export function sceneSeconds(s: Scene): { seconds: number; estimated: boolean } {
  if (s.durationFrames) return { seconds: s.durationFrames / FPS, estimated: false };
  return { seconds: (wordCount(s.narration.text) / DURATION_RULES.wordsPerMinute) * 60, estimated: true };
}

export function episodeDurations(ep: Episode): { masterSeconds: number; cutSeconds: number } {
  let master = 0;
  let cut = 0;
  for (const s of ep.scenes) {
    const { seconds } = sceneSeconds(s);
    master += seconds;
    if (s.inCut) cut += seconds;
  }
  const r = (n: number) => Math.round(n * 100) / 100;
  return { masterSeconds: r(master), cutSeconds: r(cut) };
}

export function validateTiming(ep: Episode, _ctx?: ValidationContext): Finding[] {
  const out: Finding[] = [];
  const { masterSeconds, cutSeconds } = episodeDurations(ep);
  const m = DURATION_RULES.masterSeconds;
  const c = DURATION_RULES.cutSeconds;
  if (masterSeconds < m.min || masterSeconds > m.max)
    out.push(err("timing.master_duration", `master is ${masterSeconds.toFixed(1)} s, must be ${m.min}–${m.max} s`));
  if (cutSeconds < c.min || cutSeconds > c.max) out.push(err("timing.cut_duration", `cut is ${cutSeconds.toFixed(1)} s, must be ${c.min}–${c.max} s`));
  if (!ep.scenes.some((s) => s.inCut && s.onScreen.template === "end_card")) out.push(err("timing.cut_end_card", "the cut must include the end_card scene"));

  for (const s of ep.scenes) {
    const { seconds, estimated } = sceneSeconds(s);
    if (estimated) out.push(info("timing.estimated", `scene ${s.id}: duration estimated from words (${seconds.toFixed(1)} s)`, { sceneId: s.id }));
    const audio = s.narration.audio;
    if (audio && audio.durationMs > seconds * 1000 + 0.5)
      out.push(err("timing.audio_overflow", `scene ${s.id}: narration audio ${(audio.durationMs / 1000).toFixed(2)} s is longer than the scene (${seconds.toFixed(2)} s)`, { sceneId: s.id }));
  }
  return out;
}
