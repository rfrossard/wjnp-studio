import { FPS, type Scene } from "@wjnp/contracts";
import { sceneFrames } from "./model";

export const MUSIC_VOLUME = { open: 0.14, ducked: 0.045, rampFrames: 10 };

export interface Window {
  from: number;
  to: number;
}

/** Narration windows in episode frames (scenes that have narration audio). */
export function narrationWindows(scenes: Scene[], hasAudio: (s: Scene) => boolean): Window[] {
  const out: Window[] = [];
  let at = 0;
  for (const s of scenes) {
    const dur = sceneFrames(s);
    if (hasAudio(s)) {
      const len = s.narration.audio ? Math.min(dur, Math.ceil((s.narration.audio.durationMs / 1000) * FPS)) : dur;
      out.push({ from: at, to: at + len });
    }
    at += dur;
  }
  return out;
}

/** Music level at an episode frame: ducked under narration, eased in/out over rampFrames. Pure. */
export function musicVolumeAt(frame: number, windows: Window[], total: number): number {
  const { open, ducked, rampFrames } = MUSIC_VOLUME;
  let duck = 0;
  for (const w of windows) {
    const rampIn = Math.min(1, Math.max(0, (frame - (w.from - rampFrames)) / rampFrames));
    const rampOut = Math.min(1, Math.max(0, (w.to + rampFrames - frame) / rampFrames));
    duck = Math.max(duck, Math.min(rampIn, rampOut));
  }
  const fadeOut = Math.min(1, Math.max(0, (total - frame) / (FPS * 1.5)));
  return (open + (ducked - open) * duck) * fadeOut;
}
