import { Easing } from "remotion";

/** Fixed neutral scale. The only chromatic colour in any video is the episode accent. */
export const NEUTRALS = {
  ink: "#101214",
  ink2: "#1A1D20",
  grey900: "#2A2E33",
  grey700: "#4B5158",
  grey500: "#7A8089",
  grey300: "#B9BDC3",
  grey200: "#D8DADE",
  line: "#E1E1DC",
  paper: "#F5F3EE",
  paper2: "#EAE7E0",
  white: "#FFFFFF",
} as const;

export interface DesignTokens {
  neutrals: Record<string, string>;
  type: { display: string; text: string };
  motion: { enter: number; stagger: number; exit: number; hold: number };
  spacing: { safePad: number };
  // preset-driven visual properties (optional so existing code is unaffected)
  preset?: {
    defaultTone: "light" | "dark";
    cornerRadius: number;
    panelOpacity: number;
    displayLetterSpacing: string;
    labelUppercase: boolean;
    elementBorder: boolean;
    progressThick: number;
  };
}

export const DEFAULT_TOKENS: DesignTokens = {
  neutrals: { ...NEUTRALS },
  type: {
    // Local-only stacks: nothing is fetched from the network.
    display: `"Source Serif 4", "Charter", "Bitstream Charter", "Georgia", "Liberation Serif", "DejaVu Serif", serif`,
    text: `"Inter", "Helvetica Neue", "Arial", "Liberation Sans", "DejaVu Sans", sans-serif`,
  },
  motion: { enter: 16, stagger: 6, exit: 8, hold: 4 },
  spacing: { safePad: 64 },
};

/** Merge a (possibly partial / foreign-shaped) modules/design/tokens.json over the defaults. */
export function resolveTokens(raw?: unknown): DesignTokens {
  const r0 = raw as Record<string, any> | undefined;
  const t: DesignTokens = {
    neutrals: { ...DEFAULT_TOKENS.neutrals },
    type: { ...DEFAULT_TOKENS.type },
    motion: { ...DEFAULT_TOKENS.motion },
    spacing: { ...DEFAULT_TOKENS.spacing },
    // carry through preset config written by presetToTokens
    preset: r0?.preset,
  };
  if (!raw || typeof raw !== "object") return t;
  const r = r0!;
  const hex = /^#[0-9a-fA-F]{6}$/;
  if (r.neutrals && typeof r.neutrals === "object") {
    for (const [k, v] of Object.entries(r.neutrals)) if (typeof v === "string" && hex.test(v)) t.neutrals[k] = v;
  }
  if (r.type) {
    // font-family strings are accepted either plain or as { stack }, and are
    // prepended to the local fallbacks. Anything else is ignored.
    const stackOf = (v: unknown): string | null => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object" && typeof (v as any).stack === "string") return (v as any).stack;
      return null;
    };
    const d = stackOf(r.type.display);
    const x = stackOf(r.type.text);
    if (d) t.type.display = `${d}, ${DEFAULT_TOKENS.type.display}`;
    if (x) t.type.text = `${x}, ${DEFAULT_TOKENS.type.text}`;
  }
  for (const k of ["enter", "stagger", "exit", "hold"] as const) {
    const v = r.motion?.[k];
    if (typeof v === "number" && v >= 0 && v < 90) t.motion[k] = Math.round(v);
  }
  return t;
}

/** Three easing curves, used everywhere. */
export const EASE = {
  out: Easing.bezier(0.16, 1, 0.3, 1), // entrances
  inOut: Easing.bezier(0.65, 0, 0.35, 1), // lines / wipes
  standard: Easing.bezier(0.4, 0, 0.2, 1), // everything else
};

export const OUTPUT_SIZES = {
  master: { width: 1080, height: 1920 },
  desktop: { width: 1920, height: 1080 },
  cut: { width: 1080, height: 1920 },
} as const;

export function mix(a: string, b: string, t: number): string {
  const p = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [r1, g1, b1] = p(a);
  const [r2, g2, b2] = p(b);
  const c = (x: number, y: number) => Math.round(x! + (y! - x!) * t).toString(16).padStart(2, "0");
  return `#${c(r1!, r2!)}${c(g1!, g2!)}${c(b1!, b2!)}`;
}

/** Relative luminance (WCAG). */
export function luminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const v = parseInt(hex.slice(i, i + 2), 16) / 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * ch[0]! + 0.7152 * ch[1]! + 0.0722 * ch[2]!;
}
export function contrast(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)].sort((m, n) => n - m);
  return (x! + 0.05) / (y! + 0.05);
}

export const FALLBACK_ACCENT = "#1F7A8C";

function hue(hex: string): { h: number; s: number } {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];
  const mx = Math.max(r, g, b);
  const mn = Math.min(r, g, b);
  const d = mx - mn;
  if (d === 0) return { h: 0, s: 0 };
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return { h, s: d / (1 - Math.abs(mx + mn - 1) || 1) };
}

/** Hard rule: never orange, never purple. Falls back to the default teal if the episode accent breaks it. */
export function safeAccent(hex: string | undefined): string {
  if (!hex || !/^#[0-9a-fA-F]{6}$/.test(hex)) return FALLBACK_ACCENT;
  const { h, s } = hue(hex);
  if (s > 0.15 && ((h >= 12 && h <= 48) || (h >= 255 && h <= 335))) return FALLBACK_ACCENT;
  return hex;
}

/** Nudge `fg` toward white/ink until it reaches `min` contrast on `bg`. */
export function ensureContrast(fg: string, bg: string, min = 4.5): string {
  const toward = luminance(bg) < 0.4 ? "#FFFFFF" : "#101214";
  let c = fg;
  for (let t = 0; t <= 1.0001 && contrast(c, bg) < min; t += 0.05) c = mix(fg, toward, t);
  return c;
}
