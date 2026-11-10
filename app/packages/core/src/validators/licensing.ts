import { CLIP_RULES, type Episode, type Finding } from "@wjnp/contracts";
import { err, type ValidationContext } from "./context.ts";
import { episodeDurations } from "./timing.ts";

export function validateLicensing(ep: Episode, ctx: ValidationContext): Finding[] {
  const out: Finding[] = [];
  const decisions = new Map(ep.clipDecisions.map((d) => [d.clipAssetId, d]));

  const checkAsset = (id: string, use: string, sceneId?: string) => {
    const extra = sceneId ? { sceneId } : {};
    const a = ctx.getAsset(id);
    if (!a) return out.push(err("licensing.asset_missing", `${use} asset ${id} not found in library`, extra));
    if (a.license.kind === "unknown") return out.push(err("licensing.unknown_license", `${use} asset ${id} has licence "unknown" (reference only)`, extra));
    if (a.license.kind === "standard") {
      const d = decisions.get(id);
      if (!d || d.decision === "pending")
        out.push(err("licensing.clip_decision", `${use} asset ${id} has a standard licence: needs an owner ClipDecision (not pending)`, extra));
    }
    if ((a.license.kind === "cc-by" || a.license.kind === "cc-by-sa") && !a.license.attribution)
      out.push(err("licensing.attribution_missing", `${use} asset ${id} (${a.license.kind}) needs license.attribution`, extra));
  };

  let clipSeconds = 0;
  for (const s of ep.scenes) {
    for (const id of s.visualAssetIds) checkAsset(id, "visual", s.id);
    const os = s.onScreen;
    if (os.template === "clip") {
      checkAsset(os.clipAssetId, "clip", s.id);
      const secs = (os.endMs - os.startMs) / 1000;
      if (secs <= 0) out.push(err("licensing.clip_range", `clip scene ${s.id}: endMs must be after startMs`, { sceneId: s.id }));
      if (secs > CLIP_RULES.maxSecondsPerClip)
        out.push(err("licensing.clip_too_long", `clip scene ${s.id}: ${secs.toFixed(1)} s exceeds ${CLIP_RULES.maxSecondsPerClip} s`, { sceneId: s.id }));
      clipSeconds += Math.max(0, secs);
    }
  }
  for (const id of ep.audio.musicAssetIds) checkAsset(id, "music");

  const { masterSeconds } = episodeDurations(ep);
  if (clipSeconds > 0 && masterSeconds > 0 && clipSeconds / masterSeconds > CLIP_RULES.maxShareOfEpisode)
    out.push(err("licensing.clip_share", `clips are ${((clipSeconds / masterSeconds) * 100).toFixed(1)}% of the episode, max ${CLIP_RULES.maxShareOfEpisode * 100}%`));
  return out;
}
