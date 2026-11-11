import { type Rect, safeArea } from "./layout-check";

export type Layout = "vertical" | "horizontal";

export interface Geometry {
  layout: Layout;
  isV: boolean;
  W: number;
  H: number;
  safe: Rect;
  pad: number;
  chip: Rect;
  content: Rect;
  captions: Rect;
  progress: Rect;
  /** Tiny persistent brand mark, right-aligned on the progress row. */
  footerMark: Rect;
}

export function geometry(layout: Layout): Geometry {
  if (layout === "vertical") {
    const W = 1080;
    const H = 1920;
    const safe = safeArea(W, H); // 4:5 -> y 285, h 1350
    const pad = 64;
    const chip: Rect = { x: pad, y: safe.y + 12, w: W - 2 * pad, h: 52 }; // 28 px higher: closer to the 4:5 edge, still inside it
    const capH = 98; // 2 lines at the minimum caption font + inner padding
    // bottom band, top to bottom: content | progress row (with the mark) | captions, with air between each
    const captions: Rect = { x: pad, y: safe.y + safe.h - 8 - capH, w: W - 2 * pad, h: capH };
    const markSize = 44;
    const markGap = 18;
    const progressY = captions.y - 40 - 4;
    const progress: Rect = { x: pad, y: progressY, w: W - 2 * pad - markSize - markGap, h: 4 };
    const footerMark: Rect = { x: W - pad - markSize, y: progressY + 2 - markSize / 2, w: markSize, h: markSize };
    const top = chip.y + chip.h + 24;
    const content: Rect = { x: pad, y: top, w: W - 2 * pad, h: progressY - markSize / 2 - 40 - top };
    return { layout, isV: true, W, H, safe, pad, chip, content, captions, progress, footerMark };
  }
  const W = 1920;
  const H = 1080;
  const safe = safeArea(W, H);
  const pad = 96;
  const chip: Rect = { x: pad, y: 44, w: W - 2 * pad, h: 52 };
  const capH = 96; // 2 lines at the minimum caption font + inner padding
  const captions: Rect = { x: pad, y: H - 40 - capH, w: W - 2 * pad, h: capH }; // caption text keeps the 60px frame margin
  const markSize = 40;
  const markGap = 18;
  const progressY = captions.y - 32 - 4;
  const progress: Rect = { x: pad, y: progressY, w: W - 2 * pad - markSize - markGap, h: 4 };
  const footerMark: Rect = { x: W - pad - markSize, y: progressY + 2 - markSize / 2, w: markSize, h: markSize };
  const top = chip.y + chip.h + 24;
  const content: Rect = { x: pad, y: top, w: W - 2 * pad, h: progressY - markSize / 2 - 32 - top };
  return { layout, isV: false, W, H, safe, pad, chip, content, captions, progress, footerMark };
}
