/**
 * Pure text-fitting helpers. No DOM, no measurement APIs: widths are estimated from
 * per-character average advance factors so that results are deterministic and testable.
 * Estimates are deliberately conservative (slightly wide) so text never overflows its box.
 */

export type FontRole = "display" | "text";

/** Average advance width in em, kept for coarse budgets (chips, captions chunking). */
export const CHAR_WIDTH_EM: Record<FontRole, number> = { display: 0.54, text: 0.58 };

/** Safety margin on top of the per-glyph table so estimates err on the wide side. */
export const SAFETY = 1.06;

/** Estimated advance of one character in em (semi-bold sans for "text", bold serif for "display"). */
export function glyphEm(ch: string, role: FontRole = "text"): number {
  const d = role === "display";
  if (ch === " ") return d ? 0.26 : 0.29;
  if (ch === "%") return d ? 0.92 : 0.95;
  if (/[0-9]/.test(ch)) return d ? 0.58 : 0.63;
  if (/[WM]/.test(ch)) return d ? 0.98 : 0.98;
  if (/[A-Z]/.test(ch)) return d ? 0.72 : 0.7;
  if (/[il.,;:'’‘!|]/.test(ch)) return d ? 0.3 : 0.3;
  if (/[fjrt“”"()\-–—]/.test(ch)) return d ? 0.38 : 0.4;
  if (/[mw]/.test(ch)) return d ? 0.84 : 0.88;
  if (/[a-z]/.test(ch)) return d ? 0.52 : 0.58;
  return 0.6; // symbols, other scripts: be generous
}

/** Estimated width of a single line of text at fontSize px. */
/** Monospace advance: every glyph is the same width (Menlo, JetBrains Mono, SF Mono all sit at ~0.60 em). */
export const MONO_EM = 0.61;

export function textWidth(text: string, fontSize: number, role: FontRole = "text", mono = false): number {
  let em = 0;
  for (const ch of text) em += mono ? MONO_EM : glyphEm(ch, role);
  return em * fontSize * SAFETY;
}

export interface FitInput {
  text: string;
  boxWidth: number;
  boxHeight: number;
  maxFont: number;
  minFont?: number;
  lineHeight?: number;
  role?: FontRole;
  maxLines?: number;
  /** font size step when searching downwards */
  step?: number;
  /** the face is monospaced: measure every glyph at MONO_EM */
  mono?: boolean;
}

export interface FitResult {
  fontSize: number;
  lines: string[];
  lineHeight: number;
  width: number;
  height: number;
  /** true when even minFont does not fit; callers should shorten/clamp */
  overflow: boolean;
}

export function charsPerLine(boxWidth: number, fontSize: number, role: FontRole = "text"): number {
  return Math.max(1, Math.floor(boxWidth / (fontSize * CHAR_WIDTH_EM[role])));
}

/**
 * Greedy word wrap by estimated pixel width. Over-long words are hard-broken.
 * Signature: wrapText(text, maxWidthPx, fontSize, role).
 */
export function wrapText(text: string, maxWidth: number, fontSize: number, role: FontRole = "text", mono = false): string[] {
  const w = (t: string) => textWidth(t, fontSize, role, mono);
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (let word of words) {
    while (w(word) > maxWidth && word.length > 1) {
      let k = word.length - 1;
      while (k > 1 && w(word.slice(0, k)) > maxWidth) k--;
      if (cur) {
        lines.push(cur);
        cur = "";
      }
      lines.push(word.slice(0, k));
      word = word.slice(k);
    }
    if (!cur) cur = word;
    else if (w(cur + " " + word) <= maxWidth) cur += " " + word;
    else {
      lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines.length ? lines : [""];
}

/** Largest font size (<= maxFont) such that the wrapped text fits boxWidth x boxHeight. */
export function fitText(input: FitInput): FitResult {
  const { text, boxWidth, boxHeight, maxFont } = input;
  const minFont = input.minFont ?? 22;
  const lh = input.lineHeight ?? 1.15;
  const role = input.role ?? "text";
  const step = input.step ?? 2;
  const maxLines = input.maxLines ?? Infinity;
  const mono = input.mono ?? false;
  const words = text.replace(/\s+/g, " ").trim().split(" ").filter(Boolean);
  const measure = (fs: number): FitResult => {
    const lines = wrapText(text, boxWidth, fs, role, mono);
    return { fontSize: fs, lines, lineHeight: lh, width: Math.max(...lines.map((l) => textWidth(l, fs, role, mono))), height: lines.length * fs * lh, overflow: false };
  };
  // A size that only fits by splitting a word in the middle does not fit.
  const wholeWords = (fs: number) => words.every((w) => textWidth(w, fs, role, mono) <= boxWidth);
  for (let fs = Math.max(maxFont, minFont); fs > minFont; fs -= step) {
    if (!wholeWords(fs)) continue;
    const r = measure(fs);
    if (r.lines.length <= maxLines && r.height <= boxHeight && r.width <= boxWidth) return r;
  }
  const r = measure(minFont);
  return { ...r, overflow: !(r.lines.length <= maxLines && r.height <= boxHeight && r.width <= boxWidth) };
}

/** Rectangles */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Centred 4:5 safe area of a portrait frame; full frame for landscape. */
export function safeArea(width: number, height: number): Rect {
  if (width >= height) return { x: 0, y: 0, w: width, h: height };
  const h = Math.min(height, Math.round((width * 5) / 4));
  return { x: 0, y: Math.round((height - h) / 2), w: width, h };
}

export function insideRect(inner: Rect, outer: Rect, tol = 0.5): boolean {
  return (
    inner.x >= outer.x - tol &&
    inner.y >= outer.y - tol &&
    inner.x + inner.w <= outer.x + outer.w + tol &&
    inner.y + inner.h <= outer.y + outer.h + tol
  );
}

/** Split a box into n equal cells along an axis with a gap. */
export function splitBox(box: Rect, n: number, axis: "row" | "col", gap: number): Rect[] {
  const out: Rect[] = [];
  if (axis === "row") {
    const cw = (box.w - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) out.push({ x: box.x + i * (cw + gap), y: box.y, w: cw, h: box.h });
  } else {
    const ch = (box.h - gap * (n - 1)) / n;
    for (let i = 0; i < n; i++) out.push({ x: box.x, y: box.y + i * (ch + gap), w: box.w, h: ch });
  }
  return out;
}

/** Fit several strings to one shared font size (the smallest that every one needs). */
export function fitShared(texts: string[], boxWidth: number, boxHeight: number, base: Omit<FitInput, "text" | "boxWidth" | "boxHeight">): number {
  return Math.min(...texts.map((t) => fitText({ ...base, text: t, boxWidth, boxHeight }).fontSize));
}
