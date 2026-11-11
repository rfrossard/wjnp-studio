/**
 * Scene skins: optional visual treatments layered over a template, driven by `scene.skin` in
 * episode.json (same JSON => same video).
 *
 *  - comic:    paper panel with halftone, bold frame, caption box (dateline) and a speech balloon
 *              (text). The template still draws its own content, in the lower part of the panel.
 *  - newscast: lower third (dateline tag + story slug), a sweep band on entry, and an
 *              episode-wide ticker drawn once over the whole newscast block (see NewscastTicker).
 *
 * Generic look only: no real broadcaster's name, logo, colours or layout.
 */
import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { Episode, Scene } from "@wjnp/contracts";
import { NEUTRALS } from "./brand/tokens";
import type { DesignTokens } from "./brand/tokens";
import { FitText, type Theme } from "./common";
import type { Geometry } from "./layout";
import type { Rect } from "./layout-check";
import { textWidth } from "./layout-check";
import { papercutLayout } from "./papercut";

export type SkinKind = "comic" | "newscast" | "papercut";
export const skinOf = (scene: Scene): SkinKind | undefined => (scene as { skin?: { kind: SkinKind } }).skin?.kind;
const skinData = (scene: Scene) => (scene as { skin?: { text?: string; dateline?: string } }).skin ?? {};

/* ------------------------------------------------------------------ */
/* Geometry                                                            */
/* ------------------------------------------------------------------ */

export interface NewsRects {
  lowerThird: Rect;
  ticker: Rect;
}

export function newsRects(geo: Geometry): NewsRects {
  if (geo.isV) {
    const ticker: Rect = { x: 0, y: geo.footerMark.y - 36 - 64, w: geo.W, h: 64 };
    const lowerThird: Rect = { x: geo.pad, y: ticker.y - 22 - 150, w: geo.W - 2 * geo.pad, h: 150 };
    return { lowerThird, ticker };
  }
  const ticker: Rect = { x: 0, y: geo.footerMark.y - 28 - 54, w: geo.W, h: 54 };
  const lowerThird: Rect = { x: geo.pad, y: ticker.y - 18 - 118, w: Math.min(1240, geo.W - 2 * geo.pad), h: 118 };
  return { lowerThird, ticker };
}

export interface ComicRects {
  panel: Rect;
  captionBox: Rect;
  balloon: Rect;
}

export function comicRects(geo: Geometry): ComicRects {
  if (geo.isV) {
    const panel: Rect = { x: 40, y: geo.safe.y + 12, w: geo.W - 80, h: geo.footerMark.y - 36 - (geo.safe.y + 12) };
    const captionBox: Rect = { x: panel.x + 32, y: panel.y + 32, w: Math.round(panel.w * 0.74), h: 76 };
    const balloon: Rect = { x: panel.x + 56, y: captionBox.y + captionBox.h + 44, w: panel.w - 112, h: 400 };
    return { panel, captionBox, balloon };
  }
  const panel: Rect = { x: 56, y: 36, w: geo.W - 112, h: geo.footerMark.y - 28 - 36 };
  const captionBox: Rect = { x: panel.x + 32, y: panel.y + 32, w: 820, h: 66 };
  const bh = 420;
  const balloon: Rect = { x: panel.x + 64, y: Math.max(captionBox.y + captionBox.h + 48, panel.y + Math.round((panel.h - bh - 70) / 2) + 20), w: 900, h: bh };
  return { panel, captionBox, balloon };
}

/** The content box a template may use once the skin has taken its share of the frame. */
/** Where the template draws inside a comic panel (shared by the layout and the emblem wallpaper). */
function comicContent(geo: Geometry): Rect {
  const { panel, balloon } = comicRects(geo);
  if (geo.isV) {
    const top = balloon.y + balloon.h + 130; // room for the tail, clear of the kicker
    // the right gutter is kept for the BOOM! burst
    return { x: panel.x + 56, y: top, w: panel.w - 112 - 250, h: panel.y + panel.h - 48 - top };
  }
  const left = balloon.x + balloon.w + 80;
  return { x: left, y: panel.y + 80, w: panel.x + panel.w - 64 - left, h: panel.h - 160 };
}

export function skinGeometry(geo: Geometry, scene: Scene): Geometry {
  const kind = skinOf(scene);
  if (kind === "newscast") {
    const { lowerThird } = newsRects(geo);
    const bottom = lowerThird.y - (geo.isV ? 36 : 28);
    return { ...geo, content: { ...geo.content, h: Math.max(200, bottom - geo.content.y) } };
  }
  if (kind === "papercut") {
    // with no illustration (a chart, a pure statement) the text may use the whole sheet above the strip
    const hasPicture = Boolean((scene as { skin?: { illustration?: string } }).skin?.illustration);
    if (!hasPicture) {
      const { bandTop } = papercutLayout(geo);
      return { ...geo, content: { ...geo.content, h: bandTop - (geo.isV ? 50 : 36) - geo.content.y } };
    }
    return { ...geo, content: papercutLayout(geo).content };
  }
  if (kind === "comic") {
    return { ...geo, content: comicContent(geo) };
  }
  return geo;
}

/* ------------------------------------------------------------------ */
/* Comic                                                               */
/* ------------------------------------------------------------------ */

const hexToRgb = (hex: string) => {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
};

/** Painted behind the template: gutter, panel, halftone, frame. */
export const ComicPanel: React.FC<{ geo: Geometry; accent: string }> = ({ geo, accent }) => {
  const { panel } = comicRects(geo);
  const frame = useCurrentFrame();
  // the dots drift slowly, so the page never sits still
  const shift = (frame * 0.35) % 22;
  const rgb = hexToRgb(accent);
  return (
    <>
      <div style={{ position: "absolute", inset: 0, background: NEUTRALS.paper2 }} />
      <div
        data-skin="comic-panel"
        style={{
          position: "absolute",
          left: panel.x,
          top: panel.y,
          width: panel.w,
          height: panel.h,
          background: NEUTRALS.paper,
          boxSizing: "border-box",
          border: `8px solid ${NEUTRALS.ink}`,
          boxShadow: `14px 14px 0 ${NEUTRALS.ink}`,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `radial-gradient(circle, rgba(${rgb}, 0.30) 3.2px, transparent 3.8px)`,
            backgroundSize: "22px 22px",
            backgroundPosition: `${shift}px ${shift}px`,
            WebkitMaskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 70%)",
            maskImage: "linear-gradient(to bottom, black 0%, black 42%, transparent 70%)",
          }}
        />
        <Emblems w={panel.w} h={panel.h} frame={frame} isV={geo.isV} avoid={(() => { const c = comicContent(geo); return { x: c.x - panel.x, y: c.y - panel.y, w: c.w, h: c.h }; })()} />
      </div>
    </>
  );
};

/**
 * Invented hero emblems for the comic background (owner request 2026-11-10). Never a real
 * character's symbol: shield and bolt, winged star, comet ring, chevron hexagon, all generic shapes.
 */
const Emblems: React.FC<{ w: number; h: number; frame: number; isV: boolean; avoid?: Rect }> = ({ w, h, frame, isV, avoid }) => {
  // a loose wallpaper of emblems so some always show between the balloon, text and bursts
  const s = isV ? 1 : 0.9;
  const kinds = ["bolt", "star", "comet", "hex"] as const;
  const cols = ["#2A5CAA", "#7FA36B", "#2E4766", "#E9C46A"];
  const stepX = isV ? 250 : 270;
  const stepY = isV ? 230 : 250;
  const items: { k: (typeof kinds)[number]; x: number; y: number; r: number; c: string; a: number }[] = [];
  let n = 0;
  for (let row = 0, y = 70; y < h + 60; row++, y += stepY) {
    for (let x = row % 2 ? stepX / 2 + 40 : 60; x < w + 60; x += stepX) {
      const inText = avoid && x > avoid.x - 70 && x < avoid.x + avoid.w + 20 && y > avoid.y - 60 && y < avoid.y + avoid.h + 60;
      if (inText) { n++; continue; }
      const k = kinds[(n + row) % 4]!;
      items.push({ k, x, y, r: (n % 3 === 0 ? 74 : 58), c: cols[(n + row) % 4]!, a: ((n * 37) % 30) - 15 });
      n++;
    }
  }
  return (
    <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0 }} opacity={0.4}>
      {items.map((it, i) => {
        const rot = it.a + Math.sin(frame / 40 + i) * 3;
        const r = it.r * s;
        let shape: React.ReactNode;
        if (it.k === "bolt")
          shape = (
            <>
              <path d={`M ${-r * 0.8} ${-r} L ${r * 0.8} ${-r} L ${r * 0.8} ${r * 0.2} Q 0 ${r * 1.15} ${-r * 0.8} ${r * 0.2} Z`} fill={it.c} />
              <path d={`M ${r * 0.15} ${-r * 0.75} L ${-r * 0.35} ${r * 0.05} L ${r * 0.02} ${r * 0.05} L ${-r * 0.18} ${r * 0.7} L ${r * 0.42} ${-r * 0.15} L ${r * 0.05} ${-r * 0.15} Z`} fill="#F6F1E6" />
            </>
          );
        else if (it.k === "star") {
          const pts = Array.from({ length: 10 }, (_, j) => {
            const ang = (Math.PI / 5) * j - Math.PI / 2;
            const rr = j % 2 === 0 ? r * 0.62 : r * 0.26;
            return `${(rr * Math.cos(ang)).toFixed(1)},${(rr * Math.sin(ang)).toFixed(1)}`;
          }).join(" ");
          shape = (
            <>
              <path d={`M ${-r * 0.3} 0 Q ${-r} ${-r * 0.6} ${-r * 1.15} ${-r * 0.1} Q ${-r * 0.8} ${r * 0.1} ${-r * 0.3} ${r * 0.15} Z`} fill={it.c} />
              <path d={`M ${r * 0.3} 0 Q ${r} ${-r * 0.6} ${r * 1.15} ${-r * 0.1} Q ${r * 0.8} ${r * 0.1} ${r * 0.3} ${r * 0.15} Z`} fill={it.c} />
              <polygon points={pts} fill={it.c} />
            </>
          );
        } else if (it.k === "comet")
          shape = (
            <>
              <circle r={r} fill="none" stroke={it.c} strokeWidth={r * 0.18} />
              <circle cx={r * 0.25} cy={-r * 0.2} r={r * 0.3} fill={it.c} />
              <path d={`M ${r * 0.05} ${-r * 0.05} L ${-r * 0.7} ${r * 0.5} L ${-r * 0.55} ${r * 0.2} Z`} fill={it.c} />
            </>
          );
        else {
          const pts = Array.from({ length: 6 }, (_, j) => {
            const ang = (Math.PI / 3) * j;
            return `${(r * Math.cos(ang)).toFixed(1)},${(r * Math.sin(ang)).toFixed(1)}`;
          }).join(" ");
          shape = (
            <>
              <polygon points={pts} fill={it.c} />
              <path d={`M ${-r * 0.45} ${r * 0.2} L 0 ${-r * 0.3} L ${r * 0.45} ${r * 0.2}`} fill="none" stroke="#1A1A1A" strokeWidth={r * 0.14} strokeLinecap="round" strokeLinejoin="round" />
            </>
          );
        }
        return (
          <g key={i} transform={`translate(${it.x} ${it.y}) rotate(${rot})`}>
            {shape}
          </g>
        );
      })}
    </svg>
  );
};

/** A comic sound-effect burst: starburst plate with outlined, tilted lettering. */
const Burst: React.FC<{ x: number; y: number; w: number; h: number; text: string; fill: string; delay: number; tilt: number; fs: number; tokens: DesignTokens }> = ({ x, y, w, h, text, fill, delay, tilt, fs, tokens }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 9, stiffness: 190, mass: 0.6 } });
  const spikes = 14;
  const pts = Array.from({ length: spikes * 2 }, (_, j) => {
    const ang = (Math.PI / spikes) * j;
    const rx = (j % 2 === 0 ? 0.5 : 0.36) * w;
    const ry = (j % 2 === 0 ? 0.5 : 0.36) * h;
    return `${(w / 2 + rx * Math.cos(ang)).toFixed(1)},${(h / 2 + ry * Math.sin(ang)).toFixed(1)}`;
  }).join(" ");
  return (
    <div data-skin="comic-sfx" style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `rotate(${tilt}deg) scale(${pop})`, opacity: Math.min(1, pop * 1.5) }}>
      <svg width={w} height={h} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <polygon points={pts} fill={fill} stroke={NEUTRALS.ink} strokeWidth={5} strokeLinejoin="round" />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.type.text, fontWeight: 900, fontStyle: "italic", fontSize: fs, color: NEUTRALS.white, WebkitTextStroke: `${Math.round(fs / 14)}px ${NEUTRALS.ink}`, paintOrder: "stroke fill", letterSpacing: "0.02em" }}>
        {text}
      </div>
    </div>
  );
};

/** A small chat balloon (no tail drama), for side remarks. */
const ChatBubble: React.FC<{ x: number; y: number; w: number; h: number; text: string; delay: number; tokens: DesignTokens; fs: number }> = ({ x, y, w, h, text, delay, tokens, fs }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - delay, fps, config: { damping: 12, stiffness: 160, mass: 0.7 } });
  return (
    <div data-skin="comic-chat" style={{ position: "absolute", left: x, top: y, width: w, height: h, transform: `scale(${pop})`, transformOrigin: "80% 100%", opacity: Math.min(1, pop * 1.5) }}>
      <svg width={w} height={h + 28} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - 3} ry={h / 2 - 3} fill={NEUTRALS.white} stroke={NEUTRALS.ink} strokeWidth={4} />
        <path d={`M ${w * 0.68} ${h - 8} L ${w * 0.8} ${h + 24} L ${w * 0.58} ${h - 4}`} fill={NEUTRALS.white} stroke={NEUTRALS.ink} strokeWidth={4} strokeLinejoin="round" />
        <rect x={w * 0.58} y={h - 12} width={w * 0.12} height={8} fill={NEUTRALS.white} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: tokens.type.text, fontWeight: 800, fontSize: fs, color: NEUTRALS.ink }}>{text}</div>
    </div>
  );
};

/** Painted over the template: caption box and speech balloon. */
export const ComicOverlay: React.FC<{ scene: Scene; geo: Geometry; tokens: DesignTokens }> = ({ scene, geo, tokens }) => {
  const { captionBox, balloon } = comicRects(geo);
  const { text, dateline } = skinData(scene);
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 11, stiffness: 170, mass: 0.7 } });
  const cap = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tailW = geo.isV ? 70 : 64;
  const { panel } = comicRects(geo);
  const tailH = geo.isV ? 80 : 70;
  const fx = geo.isV
    ? {
        zap: { x: panel.x + panel.w - 250, y: panel.y - 26, w: 270, h: 170, fs: 64 },
        boom: { x: panel.x + panel.w - 300, y: panel.y + panel.h - 230, w: 300, h: 200, fs: 72 },
        chat: { x: panel.x + panel.w - 230, y: balloon.y + balloon.h + 18, w: 180, h: 100, fs: 44 },
      }
    : {
        zap: { x: panel.x + panel.w - 310, y: panel.y - 18, w: 300, h: 180, fs: 66 },
        boom: { x: panel.x + 560, y: panel.y + panel.h - 210, w: 300, h: 190, fs: 70 },
        chat: { x: panel.x + panel.w - 560, y: panel.y + 40, w: 180, h: 96, fs: 42 },
      };
  return (
    <>
      <Burst {...fx.zap} text="ZAP!" fill="#E9C46A" delay={14} tilt={-12} tokens={tokens} />
      <Burst {...fx.boom} text="BOOM!" fill="#2A5CAA" delay={34} tilt={9} tokens={tokens} />
      <ChatBubble {...fx.chat} text="?!" delay={50} tokens={tokens} />
      {dateline ? (
        <div
          data-skin="comic-caption"
          style={{
            position: "absolute",
            left: captionBox.x,
            top: captionBox.y,
            maxWidth: captionBox.w,
            height: captionBox.h,
            display: "flex",
            alignItems: "center",
            padding: "0 26px",
            boxSizing: "border-box",
            background: NEUTRALS.white,
            border: `5px solid ${NEUTRALS.ink}`,
            opacity: cap,
            transform: `translateX(${(1 - cap) * -40}px)`,
          }}
        >
          <FitText text={dateline} width={captionBox.w - 62} height={captionBox.h - 18} maxFont={geo.isV ? 36 : 32} minFont={26} tokens={tokens} color={NEUTRALS.ink} weight={800} uppercase letterSpacing="0.04em" maxLines={1} />
        </div>
      ) : null}
      {text ? (
        <div
          data-skin="comic-balloon"
          style={{
            position: "absolute",
            left: balloon.x,
            top: balloon.y,
            width: balloon.w,
            height: balloon.h,
            transform: `scale(${0.55 + 0.45 * pop})`,
            transformOrigin: "18% 100%",
            opacity: Math.min(1, pop * 1.6),
          }}
        >
          <svg width={balloon.w} height={balloon.h + tailH} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
            <rect x={3} y={3} width={balloon.w - 6} height={balloon.h - 6} rx={geo.isV ? 64 : 56} ry={geo.isV ? 64 : 56} fill={NEUTRALS.white} stroke={NEUTRALS.ink} strokeWidth={6} />
            {/* tail: drawn over the border so the balloon reads as one shape */}
            <path
              d={`M ${balloon.w * 0.16} ${balloon.h - 8} L ${balloon.w * 0.16 - tailW * 0.4} ${balloon.h + tailH} L ${balloon.w * 0.16 + tailW} ${balloon.h - 8} Z`}
              fill={NEUTRALS.white}
            />
            <path
              d={`M ${balloon.w * 0.16} ${balloon.h - 3} L ${balloon.w * 0.16 - tailW * 0.4} ${balloon.h + tailH} L ${balloon.w * 0.16 + tailW} ${balloon.h - 3}`}
              fill="none"
              stroke={NEUTRALS.ink}
              strokeWidth={6}
              strokeLinejoin="round"
            />
          </svg>
          <div style={{ position: "absolute", left: 56, top: 40, width: balloon.w - 112, height: balloon.h - 80, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FitText text={text} width={balloon.w - 112} height={balloon.h - 80} maxFont={geo.isV ? 76 : 66} minFont={34} role="display" tokens={tokens} color={NEUTRALS.ink} weight={800} uppercase lineHeight={1.08} align="center" />
          </div>
        </div>
      ) : null}
    </>
  );
};

/* ------------------------------------------------------------------ */
/* Newscast                                                            */
/* ------------------------------------------------------------------ */

/** Lower third for one story: dateline tag over a slug bar, with a sweep band on entry. */
export const NewscastLowerThird: React.FC<{ scene: Scene; episode: Episode; geo: Geometry; theme: Theme; tokens: DesignTokens }> = ({ scene, episode, geo, theme, tokens }) => {
  const { lowerThird: r } = newsRects(geo);
  const { text, dateline } = skinData(scene);
  const frame = useCurrentFrame();
  const sweep = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wipe = interpolate(frame, [6, 18], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const textIn = interpolate(frame, [14, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const tagH = geo.isV ? 50 : 42;
  const barH = r.h - tagH;
  const tagLabel = "AI SECURITY";
  // one line, always: size the slug from its uppercase width (caps run wider than the estimate's average)
  const slugMax = geo.isV ? 50 : 44;
  const slugRoom = r.w - 62;
  const slugFs = text ? Math.max(28, Math.min(slugMax, Math.floor(slugMax * slugRoom / (textWidth(text.toUpperCase(), slugMax, "text") * 1.12)))) : slugMax;
  const tagFs = geo.isV ? 30 : 26;
  const tagW = textWidth(tagLabel, tagFs, "text") + 44;
  const barBg = theme.fg;
  const barFg = theme.bg;
  return (
    <>
      {/* sweep band: crosses the frame once as the story cuts in */}
      <div
        style={{
          position: "absolute",
          left: interpolate(sweep, [0, 1], [-geo.W * 0.6, geo.W * 1.1]),
          top: r.y - 10,
          width: geo.W * 0.5,
          height: r.h + 20,
          background: `linear-gradient(90deg, transparent, ${theme.accent} 40%, ${theme.accent} 60%, transparent)`,
          opacity: sweep < 1 ? 0.55 : 0,
          transform: "skewX(-18deg)",
        }}
      />
      <div data-skin="newscast-lower-third" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>
        <div style={{ display: "flex", height: tagH }}>
          <div style={{ display: "flex", alignItems: "center", padding: "0 22px", background: theme.accent, color: NEUTRALS.white, fontFamily: tokens.type.text, fontWeight: 800, fontSize: tagFs, letterSpacing: "0.06em", whiteSpace: "nowrap", width: tagW, boxSizing: "border-box" }}>
            {tagLabel}
          </div>
          {dateline ? (
            <div style={{ display: "flex", alignItems: "center", padding: "0 20px", background: NEUTRALS.ink2, color: NEUTRALS.paper, fontFamily: tokens.type.text, fontWeight: 600, fontSize: tagFs, letterSpacing: "0.04em", whiteSpace: "nowrap" }}>
              {dateline.toUpperCase()}
            </div>
          ) : null}
        </div>
        <div style={{ height: barH, background: barBg, display: "flex", alignItems: "center", padding: "0 26px", boxSizing: "border-box", borderLeft: `10px solid ${theme.accent}` }}>
          {text ? (
            <div style={{ opacity: textIn, whiteSpace: "nowrap", fontFamily: tokens.type.text, fontWeight: 800, letterSpacing: "0.01em", color: barFg, fontSize: slugFs, lineHeight: 1 }}>
              {text.toUpperCase()}
            </div>
          ) : null}
        </div>
      </div>
    </>
  );
};

/** Frame ranges (in the output's own timeline) covered by newscast scenes. */
export function newscastBlocks(placed: { scene: Scene; from: number; dur: number }[]): { from: number; to: number }[] {
  const blocks: { from: number; to: number }[] = [];
  for (const p of placed) {
    if (skinOf(p.scene) !== "newscast") continue;
    const last = blocks[blocks.length - 1];
    if (last && last.to === p.from) last.to = p.from + p.dur;
    else blocks.push({ from: p.from, to: p.from + p.dur });
  }
  return blocks;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/**
 * One continuous ticker across a whole newscast block, drawn on the global timeline so it
 * keeps crawling through the cuts instead of restarting at every scene.
 */
export const NewscastTicker: React.FC<{
  episode: Episode;
  scenes: Scene[];
  blocks: { from: number; to: number }[];
  geo: Geometry;
  accent: string;
  tokens: DesignTokens;
}> = ({ episode, scenes, blocks, geo, accent, tokens }) => {
  const frame = useCurrentFrame();
  const block = blocks.find((b) => frame >= b.from && frame < b.to);
  if (!block) return null;
  const { ticker: r } = newsRects(geo);
  const slugs = scenes.filter((s) => skinOf(s) === "newscast").map((s) => skinData(s).text).filter((t): t is string => Boolean(t));
  if (!slugs.length) return null;
  const fs = geo.isV ? 32 : 28;
  const sep = "     •     ";
  const run = slugs.map((s) => s.toUpperCase()).join(sep) + sep;
  const runW = textWidth(run, fs, "text");
  const local = frame - block.from;
  const show = interpolate(local, [0, 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) * interpolate(frame, [block.to - 8, block.to], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const speed = geo.isV ? 3.2 : 3.6; // px per frame
  const offset = (frame * speed) % runW;
  const label = "LATEST";
  const edge = geo.isV ? 64 : 96; // text keeps the frame margin even though the band is full bleed
  const labelW = textWidth(label, fs, "text") + edge + 24;
  const [y, m, d] = episode.weekOf.split("-").map(Number);
  const date = `${MONTHS[(m ?? 1) - 1]} ${d}, ${y}`;
  const dateW = textWidth(date, fs - 2, "text") + 36 + edge;
  const blink = Math.floor(frame / 15) % 2 === 0 ? 1 : 0.25;
  return (
    <div data-skin="newscast-ticker" style={{ position: "absolute", left: r.x, top: r.y, width: r.w, height: r.h, display: "flex", background: NEUTRALS.ink, borderTop: `4px solid ${accent}`, boxSizing: "border-box", opacity: show, transform: `translateY(${(1 - show) * r.h}px)` }}>
      <div style={{ flex: "none", width: labelW, display: "flex", alignItems: "center", justifyContent: "flex-end", paddingRight: 24, boxSizing: "border-box", background: accent, color: NEUTRALS.white, fontFamily: tokens.type.text, fontWeight: 800, fontSize: fs, letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ position: "relative", flex: 1, overflow: "hidden" }}>
        <div style={{ position: "absolute", top: 0, height: "100%", display: "flex", alignItems: "center", whiteSpace: "nowrap", transform: `translateX(${-offset}px)`, fontFamily: tokens.type.text, fontWeight: 600, fontSize: fs, color: NEUTRALS.paper, letterSpacing: "0.02em" }}>
          {run}
          {run}
          {run}
        </div>
      </div>
      <div style={{ flex: "none", width: dateW, display: "flex", alignItems: "center", justifyContent: "flex-start", paddingLeft: 22, boxSizing: "border-box", gap: 12, background: NEUTRALS.ink2, color: NEUTRALS.paper, fontFamily: tokens.type.text, fontWeight: 600, fontSize: fs - 2 }}>
        <span style={{ width: 12, height: 12, borderRadius: 6, background: NEUTRALS.paper, opacity: blink }} />
        {date}
      </div>
    </div>
  );
};
