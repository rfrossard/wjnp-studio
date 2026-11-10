import { FPS, type Episode, type Scene, type Tone } from "@wjnp/contracts";
import { join } from "node:path";
import { BudgetExceededError, ConfigError } from "../errors";
import { NarrationCache, synthesizeCached, narrationKey } from "../cache";
import type { VoicesFile } from "../modules";
import { checkBudget } from "../router";
import { clone, DEFAULT_TAIL_FRAMES, type PipelineDeps } from "./common";

export interface PickedVoice {
  assetId: string;
  elevenVoiceId: string;
  settings?: Record<string, number | boolean | string> | undefined;
}

/**
 * Narrator reads the first, the last and every opinion scene. A cast voice chosen by brief.tone may read
 * quote scenes. At most 2 voices per episode (narrator + one cast voice).
 *
 * If `brief.voices` was set (Beto picked from the menu before narration, see `npm run voices`), those
 * picks override the narrator clone and/or the tone-based cast lookup; anything left unset still falls
 * back to the defaults, unchanged.
 */
export function pickVoice(
  scene: Scene,
  index: number,
  total: number,
  tone: Tone,
  voices: VoicesFile,
  picked?: { narratorAssetId?: string; castAssetId?: string },
): PickedVoice {
  const findMenu = (assetId: string): PickedVoice | undefined => {
    const m = voices.menu?.find((v) => v.assetId === assetId);
    return m ? { assetId: m.assetId, elevenVoiceId: m.elevenVoiceId } : undefined;
  };
  const narrator: PickedVoice = (picked?.narratorAssetId && findMenu(picked.narratorAssetId)) || voices.narrator;
  if (index === 0 || index === total - 1 || scene.isOpinion) return narrator;
  if (scene.onScreen.template === "quote_card" || scene.onScreen.template === "clip") {
    if (picked?.castAssetId) {
      const chosen = findMenu(picked.castAssetId);
      if (chosen) return chosen;
    }
    const cast = voices.cast.find((c) => c.tone === tone);
    if (cast) return cast;
  }
  return narrator;
}

/** TTS + cache: fills narration.audio and durationFrames = ceil(durationMs/1000*FPS) + tail. */
export async function narrate(episode: Episode, deps: PipelineDeps): Promise<Episode> {
  const ep = clone(episode);
  const voices = deps.modules.voices;
  if (!voices) throw new ConfigError("modules/audio/voices.json is missing; cannot pick narration voices");
  const cache = new NarrationCache(join(deps.root, "episodes", ep.id, "cache"));
  const tail = deps.tailFrames ?? DEFAULT_TAIL_FRAMES;
  const estimate = deps.estimateTtsUsd ?? ((t: string) => (t.length / 1000) * 0.12);
  const used = new Set<string>();

  const picked = ep.brief.voices;
  ep.scenes.forEach((s, i) => {
    const v = pickVoice(s, i, ep.scenes.length, ep.brief.tone, voices, picked);
    s.narration.voiceId = v.assetId;
    used.add(v.assetId);
  });
  const narratorAssetId = picked?.narratorAssetId ?? voices.narrator.assetId;
  const cast = [...used].filter((id) => id !== narratorAssetId);
  if (cast.length > 1) throw new Error("more than one cast voice selected");

  for (const [i, s] of ep.scenes.entries()) {
    const v = pickVoice(s, i, ep.scenes.length, ep.brief.tone, voices, picked);
    const r = await synthesizeCached({
      cache,
      tts: deps.tts,
      voiceId: v.assetId,
      elevenVoiceId: v.elevenVoiceId,
      text: s.narration.text,
      ...(v.settings ? { settings: v.settings } : {}),
      beforeSynthesis: () => {
        if (deps.ownerApprovedSpend) return;
        const spent = [...(deps.otherEpisodeCosts ?? []), ...ep.costs];
        const b = checkBudget(spent, deps.modules.routing.weeklyBudgetUsd, estimate(s.narration.text), deps.now());
        if (b.status === "needs_owner_ok") throw new BudgetExceededError(b.amountUsd, b.spentUsd, b.weeklyBudgetUsd);
      },
    });
    if (!r.hit) ep.costs.push({ taskId: `narrate-${s.id}`, provider: "elevenlabs", usd: r.usd, at: deps.now().toISOString() });
    s.narration.audio = {
      textSha256: narrationKey(v.assetId, s.narration.text, v.settings),
      path: `episodes/${ep.id}/cache/${r.entry.file}`,
      durationMs: r.entry.durationMs,
      words: r.entry.words,
    };
    s.durationFrames = Math.ceil((r.entry.durationMs / 1000) * FPS) + tail;
  }
  ep.audio.narratorVoiceId = narratorAssetId;
  ep.audio.castVoiceIds = cast;
  return ep;
}
