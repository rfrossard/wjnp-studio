import { DURATION_RULES, FPS, type Claim, type Episode, type Scene, type Source } from "@wjnp/contracts";
import type { DesignTokens } from "./brand/tokens";

export type OutputKind = "master" | "desktop" | "cut" | "cut-horizontal";

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
  if (kind === "cut" || kind === "cut-horizontal") {
    const short = (episode as { short?: { beats: { sceneId: string; caption: string; highlight?: string; seconds: number }[] } }).short;
    if (short?.beats?.length) {
      // each beat is a silent copy of its scene, with its own id so no narration is found for it
      return short.beats.flatMap((b0, k) => {
        const card = b0 as unknown as { kind?: string; text?: string; illustration?: string; variant?: "day" | "night"; seconds: number };
        if (card.kind === "card") {
          // a teaser card: the statement template on the papercut look with its own illustration, no narration
          const base = all[0]!;
          return [{
            ...base, id: `card-b${k}`, order: k, durationFrames: Math.round(card.seconds * FPS), claimIds: [], isOpinion: false,
            onScreen: { template: "statement", headline: card.text! },
            narration: { voiceId: base.narration.voiceId, text: card.text! },
            skin: { kind: "papercut", variant: card.variant ?? "night", illustration: card.illustration },
            press: undefined, shortCaption: { text: "" },
          } as unknown as Scene];
        }
        const b = b0 as { sceneId: string; caption: string; highlight?: string; seconds: number };
        const src = all.find((s) => s.id === b.sceneId);
        if (!src) return [];
        return [{ ...src, id: `${src.id}-b${k}`, order: k, durationFrames: Math.round(b.seconds * FPS), narration: { ...src.narration, audio: undefined }, shortCaption: { text: b.caption, highlight: b.highlight } } as Scene];
      });
    }
    return all.filter((s) => s.inCut);
  }
  return all;
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
