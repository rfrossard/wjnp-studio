import { DURATION_RULES, FPS, type Claim, type Episode, type Scene, type Source } from "@wjnp/contracts";
import type { DesignTokens } from "./brand/tokens";

export type OutputKind = "master" | "desktop" | "cut";

/** Files resolved by scripts/render.ts (names inside the bundle's public dir). Absent => placeholders / silence. */
export type ResolvedAssets = {
  narration: Record<string, string>; // sceneId -> public file
  clips: Record<string, string>; // clipAssetId -> public file
  images?: Record<string, string>; // illustration asset id -> public file
  music: string[]; // public files, in episode.audio.musicAssetIds order
};

export type RenderProps = {
  episode: Episode;
  /** raw modules/design/tokens.json (optional) */
  tokens?: unknown;
  resolved?: ResolvedAssets;
};

export const NO_ASSETS: ResolvedAssets = { narration: {}, clips: {}, music: [] };

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Scene length in frames: durationFrames from the episode, else words at 150 wpm. */
export function sceneFrames(scene: Scene): number {
  if (scene.durationFrames && scene.durationFrames > 0) return scene.durationFrames;
  const seconds = (countWords(scene.narration.text) / DURATION_RULES.wordsPerMinute) * 60;
  return Math.max(FPS, Math.ceil(seconds * FPS));
}

export function scenesFor(episode: Episode, kind: OutputKind): Scene[] {
  const all = [...episode.scenes].sort((a, b) => a.order - b.order);
  return kind === "cut" ? all.filter((s) => s.inCut) : all;
}

export function totalFrames(scenes: Scene[]): number {
  return Math.max(1, scenes.reduce((n, s) => n + sceneFrames(s), 0));
}

export function claimOf(episode: Episode, id: string | undefined): Claim | undefined {
  return id ? episode.claims.find((c) => c.id === id) : undefined;
}

/** Claim ids shown by a scene: its claimIds plus the claim an on-screen template reads from. */
export function sceneClaimIds(scene: Scene): string[] {
  const ids = [...scene.claimIds];
  const o = scene.onScreen;
  if ((o.template === "stat" || o.template === "quote_card" || o.template === "clip") && !ids.includes(o.claimId)) ids.push(o.claimId);
  return ids;
}

/** Unique publisher names of the sources behind a scene's claims (stable order). */
export function scenePublishers(episode: Episode, scene: Scene): string[] {
  const out: string[] = [];
  for (const id of sceneClaimIds(scene)) {
    const claim = claimOf(episode, id);
    for (const ev of claim?.evidence ?? []) {
      const src: Source | undefined = episode.sources.find((s) => s.id === ev.sourceId);
      if (src && !out.includes(src.publisher)) out.push(src.publisher);
    }
  }
  return out;
}

export type { DesignTokens };
