/**
 * packages/render/src/brand/presets.ts
 */
import type { DesignPresetId } from "@wjnp/contracts";
import { NEUTRALS, type DesignTokens, DEFAULT_TOKENS } from "./tokens";

export type TransitionKind = "cut" | "dissolve" | "slide" | "zoom" | "wipe";
export type FontPair = "serif-sans" | "mono-sans" | "sans-sans" | "mono-mono";
export type AccentPlacement = "full" | "line-only" | "gradient";

export interface PresetConfig {
  fontPair: FontPair;
  cornerRadius: number;
  transition: TransitionKind;
  elementBorder: boolean;
  accentPlacement: AccentPlacement;
  progressThick: number;
  showMark: boolean;
  captionStyle: "box" | "shadow" | "accent" | "highlight";
  defaultTone: "light" | "dark";
  displayLetterSpacing: string;
  labelUppercase: boolean;
  panelOpacity: number;
}

const SYS = {
  serif: `"Source Serif 4","Charter","Bitstream Charter",Georgia,"Liberation Serif",serif`,
  mono:  `"JetBrains Mono","SF Mono","Fira Mono","Menlo","Consolas","Liberation Mono",monospace`,
  sans:  `"Inter","Helvetica Neue",Arial,"Liberation Sans",sans-serif`,
};

export const FONT_PAIRS: Record<FontPair, { display: string; text: string }> = {
  "serif-sans": { display: SYS.serif, text: SYS.sans },
  "mono-sans":  { display: SYS.mono,  text: SYS.sans },
  "sans-sans":  { display: SYS.sans,  text: SYS.sans },
  "mono-mono":  { display: SYS.mono,  text: SYS.mono },
};

export const PRESET_CONFIGS: Record<DesignPresetId, PresetConfig> = {
  signal:    { fontPair:"mono-sans",  cornerRadius:2,  transition:"cut",     elementBorder:true,  accentPlacement:"line-only", progressThick:2, showMark:true,  captionStyle:"box",    defaultTone:"dark",  displayLetterSpacing:"-0.02em", labelUppercase:true,  panelOpacity:0.95 },
  broadcast: { fontPair:"serif-sans", cornerRadius:0,  transition:"wipe",    elementBorder:false, accentPlacement:"full",      progressThick:4, showMark:true,  captionStyle:"box",    defaultTone:"light", displayLetterSpacing:"-0.03em", labelUppercase:true,  panelOpacity:1    },
  studio:    { fontPair:"serif-sans", cornerRadius:6,  transition:"dissolve",elementBorder:false, accentPlacement:"line-only", progressThick:3, showMark:false, captionStyle:"shadow", defaultTone:"light", displayLetterSpacing:"-0.01em", labelUppercase:false, panelOpacity:0.88 },
  code:      { fontPair:"mono-mono",  cornerRadius:2,  transition:"slide",   elementBorder:true,  accentPlacement:"full",      progressThick:2, showMark:true,  captionStyle:"box",    defaultTone:"dark",  displayLetterSpacing:"0em",     labelUppercase:false, panelOpacity:0.97 },
  stage:     { fontPair:"sans-sans",  cornerRadius:4,  transition:"zoom",    elementBorder:false, accentPlacement:"gradient",  progressThick:5, showMark:false, captionStyle:"shadow", defaultTone:"dark",  displayLetterSpacing:"-0.04em", labelUppercase:false, panelOpacity:0.82 },
};

export function resolvePreset(
  presetId: DesignPresetId,
  overrides?: { fontPair?: FontPair; cornerRadius?: number; transition?: TransitionKind; tone?: "light" | "dark" },
  captionStyleOverride?: "box" | "shadow",
): PresetConfig {
  const base = { ...PRESET_CONFIGS[presetId] };
  if (overrides?.fontPair)           base.fontPair      = overrides.fontPair;
  if (overrides?.cornerRadius != null) base.cornerRadius = overrides.cornerRadius;
  if (overrides?.transition)         base.transition    = overrides.transition;
  if (overrides?.tone)               base.defaultTone   = overrides.tone;
  if (captionStyleOverride)          base.captionStyle  = captionStyleOverride;
  return base;
}

export function presetToTokens(cfg: PresetConfig): DesignTokens {
  const fp = FONT_PAIRS[cfg.fontPair];
  return {
    neutrals: { ...NEUTRALS },
    type: { display: fp.display, text: fp.text },
    motion: DEFAULT_TOKENS.motion,
    spacing: DEFAULT_TOKENS.spacing,
    preset: {
      defaultTone:         cfg.defaultTone,
      cornerRadius:        cfg.cornerRadius,
      panelOpacity:        cfg.panelOpacity,
      displayLetterSpacing: cfg.displayLetterSpacing,
      labelUppercase:      cfg.labelUppercase,
      elementBorder:       cfg.elementBorder,
      progressThick:       cfg.progressThick,
    },
  };
}
