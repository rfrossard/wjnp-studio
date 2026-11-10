import { DESIGN_RULES, type Episode, type Finding } from "@wjnp/contracts";
import { hexToOklchHue, pickAccent } from "../accent.ts";
import { err, sortedScenes, warn, type ValidationContext } from "./context.ts";

export function forbiddenHue(hex: string): { name: string; hue: number } | undefined {
  const hue = hexToOklchHue(hex);
  const r = DESIGN_RULES.forbiddenHueRanges.find((r) => hue >= r.from && hue <= r.to);
  return r ? { name: r.name, hue } : undefined;
}

export function validateDesign(ep: Episode, ctx: ValidationContext): Finding[] {
  const out: Finding[] = [];
  const styles = new Set(ep.design.styles);
  for (const s of ep.scenes)
    if (!styles.has(s.style)) out.push(err("design.style_not_declared", `scene ${s.id} uses style ${s.style}, not in design.styles`, { sceneId: s.id }));

  const bad = forbiddenHue(ep.design.accent.hex);
  if (bad) out.push(err("design.forbidden_hue", `accent ${ep.design.accent.hex} has OKLCH hue ${bad.hue.toFixed(1)}° inside the forbidden ${bad.name} range`));

  if (ctx.accents.length) {
    const expected = pickAccent(ep.id, ctx.accents);
    if (expected.hex.toLowerCase() !== ep.design.accent.hex.toLowerCase())
      out.push(warn("design.accent_not_picked", `accent ${ep.design.accent.name} ${ep.design.accent.hex} differs from pickAccent → ${expected.name} ${expected.hex}`));
  }

  const voices = new Set(ep.scenes.map((s) => s.narration.voiceId));
  if (voices.size > DESIGN_RULES.maxVoicesPerEpisode)
    out.push(err("design.too_many_voices", `${voices.size} narration voices (${[...voices].join(", ")}), max ${DESIGN_RULES.maxVoicesPerEpisode}`));
  const declared = new Set([ep.audio.narratorVoiceId, ...ep.audio.castVoiceIds]);
  for (const v of voices) if (!declared.has(v)) out.push(warn("design.voice_not_declared", `voice ${v} is not in audio.narratorVoiceId/castVoiceIds`));

  const sorted = sortedScenes(ep);
  for (const [label, s] of [["first", sorted[0]], ["last", sorted[sorted.length - 1]]] as const) {
    if (s && s.narration.voiceId !== ep.audio.narratorVoiceId)
      out.push(err("design.narrator_bookends", `${label} scene ${s.id} must be narrated by the narrator (${ep.audio.narratorVoiceId}), not ${s.narration.voiceId}`, { sceneId: s.id }));
  }
  return out;
}
