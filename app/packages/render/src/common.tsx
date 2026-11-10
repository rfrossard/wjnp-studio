import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Episode, Scene } from "@wjnp/contracts";
import { type DesignTokens, EASE, ensureContrast, NEUTRALS, mix } from "./brand/tokens";
import { fitText, type FontRole } from "./layout-check";
import type { Geometry, Layout } from "./layout";
import type { ResolvedAssets } from "./model";

export type Tone = "light" | "dark";

export interface Theme {
  tone: Tone;
  bg: string;
  fg: string;
  muted: string;
  rule: string;
  panel: string;
  accent: string; // fills, lines
  accentText: string; // legible as text on bg
}

export function makeTheme(tone: Tone, accent: string): Theme {
  const n = NEUTRALS;
  const bg = tone === "light" ? n.paper : n.ink;
  return {
    tone,
    bg,
    fg: tone === "light" ? n.ink : n.paper,
    muted: tone === "light" ? n.grey700 : n.grey300,
    rule: tone === "light" ? n.grey300 : n.grey700,
    panel: tone === "light" ? n.paper2 : n.ink2,
    accent,
    accentText: ensureContrast(accent, bg, 4.5),
  };
}

export interface SceneProps {
  scene: Scene;
  episode: Episode;
  layout: Layout;
  geo: Geometry;
  theme: Theme;
  tokens: DesignTokens;
  resolved: ResolvedAssets;
}

export const SCENE_TONE: Record<string, Tone> = {
  title_hook: "dark",
  statement: "light",
  stat: "light",
  comparison: "light",
  bullets: "light",
  timeline: "light",
  quote_card: "light",
  clip: "dark",
  personal_take: "dark",
  end_card: "dark",
};

/** Progress 0..1 of an entrance that starts at `delay` frames (scene-local). */
export function useProgress(delay: number, duration: number, ease: (t: number) => number = EASE.out): number {
  const frame = useCurrentFrame();
  return interpolate(frame, [delay, delay + duration], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: ease });
}

/** The i-th element of a scene enters along ONE axis. */
export function enterStyle(p: number, axis: "x" | "y", dist = 28): React.CSSProperties {
  const d = (1 - p) * dist;
  return {
    opacity: Math.min(1, p * 2.2),
    transform: axis === "y" ? `translate3d(0, ${d}px, 0)` : `translate3d(${d}px, 0, 0)`,
  };
}

export const Enter: React.FC<{
  i: number;
  tokens: DesignTokens;
  axis?: "x" | "y";
  dist?: number;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}> = ({ i, tokens, axis = "y", dist = 28, style, children }) => {
  const p = useProgress(tokens.motion.hold + i * tokens.motion.stagger, tokens.motion.enter);
  return <div style={{ ...enterStyle(p, axis, dist), ...style }}>{children}</div>;
};

/** A rule that grows along one axis. */
export const Rule: React.FC<{
  tokens: DesignTokens;
  delay?: number;
  color: string;
  length: number | string;
  thickness: number;
  axis?: "x" | "y";
  style?: React.CSSProperties;
}> = ({ tokens, delay = 0, color, length, thickness, axis = "x", style }) => {
  const p = useProgress(delay, tokens.motion.enter + 6, EASE.inOut);
  return (
    <div
      style={{
        width: axis === "x" ? length : thickness,
        height: axis === "x" ? thickness : length,
        background: color,
        transformOrigin: axis === "x" ? "left center" : "center top",
        transform: axis === "x" ? `scaleX(${p})` : `scaleY(${p})`,
        flex: "none",
        ...style,
      }}
    />
  );
};

export interface FitTextProps {
  text: string;
  width: number;
  height: number;
  maxFont: number;
  minFont?: number;
  role?: FontRole;
  tokens: DesignTokens;
  color: string;
  weight?: number;
  lineHeight?: number;
  italic?: boolean;
  maxLines?: number;
  letterSpacing?: string;
  uppercase?: boolean;
  align?: "left" | "center";
  fontSize?: number; // force (for shared sizes)
  style?: React.CSSProperties;
}

/** Text whose font size is computed from its length and box (layout-check), so it never overflows. */
export const FitText: React.FC<FitTextProps> = (p) => {
  const role = p.role ?? "text";
  const lh = p.lineHeight ?? (role === "display" ? 1.05 : 1.2);
  const family = role === "display" ? p.tokens.type.display : p.tokens.type.text;
  // the first face in the stack decides the metrics; a mono stack starts with a mono face
  const mono = /mono|menlo|consolas|courier/i.test(family.split(",")[0] ?? "");
  const fit = fitText({ text: p.text, boxWidth: p.width, boxHeight: p.height, maxFont: p.maxFont, minFont: p.minFont ?? 24, role, lineHeight: lh, maxLines: p.maxLines, mono });
  const fs = p.fontSize ?? fit.fontSize;
  return (
    <div
      data-fit-font={fs}
      style={{
        width: p.width,
        fontFamily: role === "display" ? p.tokens.type.display : p.tokens.type.text,
        fontSize: fs,
        lineHeight: lh,
        fontWeight: p.weight ?? (role === "display" ? 600 : 500),
        fontStyle: p.italic ? "italic" : "normal",
        letterSpacing: p.letterSpacing ?? (role === "display" ? (p.tokens.preset?.displayLetterSpacing ?? "-0.015em") : "0"),
        textTransform: p.uppercase ? "uppercase" : "none",
        textAlign: p.align ?? "left",
        color: p.color,
        textWrap: "balance" as any,
        overflowWrap: "normal",
        ...p.style,
      }}
    >
      {p.text}
    </div>
  );
};

export function lighten(hex: string, t: number) {
  return mix(hex, "#FFFFFF", t);
}
