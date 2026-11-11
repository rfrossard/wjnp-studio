/**
 * Papercut: layered cut-paper backdrop (owner reference, 2026-11-10: brand/references/papercut/).
 *
 * Paper grain over a flat paper colour, the scene's own cut-paper illustration (generated per scene
 * to match its topic, stored in library/assets/illustration), and a torn paper strip that carries
 * the progress bar and the captions. Owner direction 2026-11-10: imagery follows the content, no
 * generic sun-and-sea scenery.
 *
 * Palette: the reference's orange paper and lavender roofs sit inside the studio's forbidden hue
 * bands (OKLCH 30-75 and 285-330), so day uses a butter-gold paper instead; everything here was
 * checked with packages/core/src/accent.ts hexToOklchHue.
 */
import React from "react";
import { Img, useCurrentFrame } from "remotion";
import type { Scene } from "@wjnp/contracts";
import type { Geometry } from "./layout";

export type PapercutVariant = "day" | "night";

export const papercutVariant = (scene: Scene): PapercutVariant | undefined => {
  const skin = (scene as { skin?: { kind?: string; variant?: PapercutVariant } }).skin;
  return skin?.kind === "papercut" ? skin.variant ?? "day" : undefined;
};

export const PAPERCUT_PALETTE = {
  day: {
    sky: "#F3BF58", // matches the generated illustrations, OKLCH hue 82
    sun: "#FBEFC8",
    sunRay: "#F6E2A4",
    cloud: "#F6F1E6",
    star: "#FBEFC8",
    hillBack: "#A7C48F",
    hillMid: "#7FA36B",
    band: "#2E4766",
    bandEdge: "#3E5F7F",
  },
  night: {
    sky: "#1D2F46", // matches the night illustrations
    sun: "#EDC45C",
    sunRay: "#E9C46A",
    cloud: "#3A5374",
    star: "#E9C46A",
    hillBack: "#2E4A3E",
    hillMid: "#3E5F55",
    band: "#16243A",
    bandEdge: "#1F3550",
  },
} as const;

export interface PapercutLayout {
  /** top of the paper strip that carries the progress bar and the captions */
  bandTop: number;
  /** where the scene's illustration is drawn */
  picture: { x: number; y: number; w: number; h: number };
  /** the box templates may use for their text */
  content: { x: number; y: number; w: number; h: number };
}

export function papercutLayout(geo: Geometry): PapercutLayout {
  const bandTop = geo.footerMark.y - (geo.isV ? 22 : 18);
  if (geo.isV) {
    const ph = 640;
    const picture = { x: 0, y: bandTop + 16 - ph, w: geo.W, h: ph };
    const top = geo.content.y;
    return { bandTop, picture, content: { x: geo.content.x, y: top, w: geo.content.w, h: picture.y + 40 - top } };
  }
  const pw = 860;
  const picture = { x: geo.W - pw, y: 0, w: pw, h: bandTop + 16 };
  const right = picture.x + 10;
  return { bandTop, picture, content: { x: geo.content.x, y: geo.content.y, w: right - geo.content.x, h: bandTop - 40 - geo.content.y } };
}

/** A torn (deckle) top edge from x=0 to W, filled down to the bottom of the frame. */
function tornPath(W: number, H: number, top: number, seed: number): string {
  let d = `M 0 ${H} L 0 ${top}`;
  let r = seed;
  for (let x = 14; x <= W + 14; x += 14) {
    r = (r * 9301 + 49297) % 233280; // deterministic
    const y = top + ((r / 233280) - 0.5) * 9;
    d += ` L ${x} ${y.toFixed(1)}`;
  }
  return `${d} L ${W + 14} ${H} Z`;
}

export const PapercutBackdrop: React.FC<{ geo: Geometry; variant: PapercutVariant; globalFrom: number; image?: string }> = ({ geo, variant, globalFrom, image }) => {
  const gf = useCurrentFrame() + globalFrom;
  const local = gf - globalFrom;
  const P = PAPERCUT_PALETTE[variant];
  const L = papercutLayout(geo);
  const { W, H } = geo;
  const id = `pc-${variant}-${geo.isV ? "v" : "h"}`;
  // the picture settles in like a sheet laid on the table, then breathes very slowly
  const settle = Math.min(1, local / 14);
  const ease = 1 - Math.pow(1 - settle, 3);
  const zoom = 1.06 - 0.04 * ease + 0.012 * Math.sin(gf / 90);
  const lift = (1 - ease) * 26;
  const mask = geo.isV
    ? "linear-gradient(to bottom, transparent 0%, black 16%, black 100%)"
    : "linear-gradient(to right, transparent 0%, black 24%, black 100%)";
  return (
    <>
      <svg data-skin="papercut" width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <filter id={`${id}-grain`} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="7" />
            <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.55 0" />
          </filter>
        </defs>
        <rect width={W} height={H} fill={P.sky} />
        <rect width={W} height={H} filter={`url(#${id}-grain)`} opacity={0.12} style={{ mixBlendMode: "multiply" }} />
      </svg>
      {image ? (
        <div
          data-skin="papercut-picture"
          style={{
            position: "absolute",
            left: L.picture.x,
            top: L.picture.y,
            width: L.picture.w,
            height: L.picture.h,
            overflow: "hidden",
            WebkitMaskImage: mask,
            maskImage: mask,
            opacity: ease,
          }}
        >
          <Img src={image} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `translateY(${lift}px) scale(${zoom})`, transformOrigin: "50% 60%" }} />
        </div>
      ) : null}
      <svg width={W} height={H} style={{ position: "absolute", left: 0, top: 0 }}>
        <defs>
          <filter id={`${id}-shadow`} x="-5%" y="-20%" width="110%" height="140%">
            <feDropShadow dx="0" dy={-4} stdDeviation={6} floodColor="#000" floodOpacity="0.28" />
          </filter>
        </defs>
        {/* the strip under the captions: a torn sheet of paper, not water */}
        <path d={tornPath(W, H, L.bandTop, geo.isV ? 11 : 23)} fill={P.band} filter={`url(#${id}-shadow)`} />
      </svg>
    </>
  );
};
