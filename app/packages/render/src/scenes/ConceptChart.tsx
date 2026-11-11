import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Enter, FitText, type SceneProps } from "../common";

/**
 * concept_chart / jaws: two curves over time that open apart like a jaw. The upper one accelerates
 * (near exponential), the lower one grows slowly; the gap between them is shaded. No numbers, no
 * axis values: it explains an idea, and says so ("Illustrative, not data").
 */
export const ConceptChart: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  const frame = useCurrentFrame();
  if (o.template !== "concept_chart") return null;
  const c = geo.content;
  const v = geo.isV;
  const headH = v ? 210 : 150;
  const noteFs = v ? 30 : 24;
  const labelFs = v ? 36 : 30;
  // chart box, leaving room for the end labels on the right
  const labelW = v ? 0 : 330;
  const chart = { x: c.x, y: c.y + headH + 30, w: c.w - labelW, h: c.h - headH - 30 - (noteFs + 24) };
  const pad = { l: 8, b: v ? 56 : 46, t: v ? 80 : 30 };
  const x0 = chart.x + pad.l;
  const y0 = chart.y + chart.h - pad.b; // baseline
  const W = chart.w - pad.l - (v ? 10 : 20);
  const H = chart.h - pad.b - pad.t;
  const N = 60;
  // both start at the same point and open apart (jaws); the lower slope stays under the upper's
  // initial slope (0.94*3.1/(e^3.1-1) ~ 0.137) so the curves never cross
  const upper = (t: number) => 0.06 + 0.94 * ((Math.exp(3.1 * t) - 1) / (Math.exp(3.1) - 1)); // accelerating
  const lower = (t: number) => 0.06 + 0.12 * t; // slow, steady
  const pt = (t: number, f: (t: number) => number) => [x0 + t * W, y0 - (0.04 + 0.92 * f(t)) * H] as const;
  // draw left to right over ~2.6 s, after the headline settles
  const prog = interpolate(frame, [12, 90], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const ease = 1 - Math.pow(1 - prog, 2);
  const steps = Math.max(2, Math.round(N * ease));
  const ts = Array.from({ length: steps + 1 }, (_, i) => (i / steps) * ease);
  const path = (f: (t: number) => number) => ts.map((t, i) => `${i ? "L" : "M"} ${pt(t, f)[0].toFixed(1)} ${pt(t, f)[1].toFixed(1)}`).join(" ");
  const gap =
    ts.map((t, i) => `${i ? "L" : "M"} ${pt(t, upper)[0].toFixed(1)} ${pt(t, upper)[1].toFixed(1)}`).join(" ") +
    " " +
    [...ts].reverse().map((t) => `L ${pt(t, lower)[0].toFixed(1)} ${pt(t, lower)[1].toFixed(1)}`).join(" ") +
    " Z";
  const labelsIn = interpolate(frame, [80, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const upperEnd = pt(1, upper);
  const lowerEnd = pt(1, lower);
  // gap label sits inside the shaded wedge, right-aligned near the end, between f=0.44 and the lower line
  const gapTop = y0 - (0.04 + 0.92 * 0.44) * H + 8;
  const upColor = theme.accentText;
  const lowColor = theme.muted;
  const stroke = v ? 9 : 7;
  return (
    <>
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: headH, display: "flex", alignItems: "flex-end" }}>
        <Enter i={0} tokens={tokens}>
          <FitText text={o.headline} width={c.w} height={headH} maxFont={v ? 84 : 76} minFont={40} role="display" tokens={tokens} color={theme.fg} lineHeight={1.08} />
        </Enter>
      </div>
      <svg data-template="concept_chart" width={geo.W} height={geo.H} style={{ position: "absolute", left: 0, top: 0, overflow: "visible" }}>
        {/* axes */}
        <line x1={x0} y1={y0} x2={x0 + W + 10} y2={y0} stroke={theme.fg} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
        <line x1={x0} y1={y0} x2={x0} y2={y0 - H - 10} stroke={theme.fg} strokeOpacity={0.55} strokeWidth={4} strokeLinecap="round" />
        <path d={gap} fill={theme.accent} fillOpacity={0.2} />
        <path d={path(lower)} fill="none" stroke={lowColor} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        <path d={path(upper)} fill="none" stroke={upColor} strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" />
        <text x={x0 + W + 10} y={y0 + (v ? 44 : 36)} textAnchor="end" fontFamily={tokens.type.text} fontSize={noteFs} fill={theme.muted} opacity={labelsIn}>
          {o.axis}
        </text>
      </svg>
      {/* end labels: right of the chart on desktop, inside the top-left of the chart in vertical */}
      <div
        style={{
          position: "absolute",
          // vertical: right-aligned just left of the curve's top end, so the label hugs its line
          left: v ? upperEnd[0] - 34 - W * 0.6 : upperEnd[0] + 24,
          top: v ? upperEnd[1] - labelFs * 0.55 : upperEnd[1] - labelFs * 0.7,
          width: v ? W * 0.6 : labelW - 24,
          textAlign: v ? "right" : "left",
          opacity: labelsIn,
          fontFamily: tokens.type.text,
          fontWeight: 750,
          fontSize: labelFs,
          lineHeight: 1.15,
          color: upColor,
        }}
      >
        {o.upper}
      </div>
      <div
        style={{
          position: "absolute",
          left: v ? lowerEnd[0] - W * 0.62 : lowerEnd[0] + 24,
          top: v ? pt(0.36, lower)[1] + 16 : lowerEnd[1] - labelFs * 0.7, // below the line across the label's whole span
          width: v ? W * 0.62 : labelW - 24,
          textAlign: v ? "right" : "left",
          opacity: labelsIn,
          fontFamily: tokens.type.text,
          fontWeight: 750,
          fontSize: labelFs,
          lineHeight: 1.15,
          color: lowColor,
        }}
      >
        {o.lower}
      </div>
      {o.gapLabel ? (
        <div
          style={{
            position: "absolute",
            left: x0 + W - 16 - (v ? 210 : 260),
            top: gapTop,
            width: v ? 210 : 260,
            textAlign: "right",
            lineHeight: 1.12,
            opacity: labelsIn,
            fontFamily: tokens.type.text,
            fontStyle: "italic",
            fontWeight: 600,
            fontSize: labelFs - 4,
            color: theme.fg,
          }}
        >
          {o.gapLabel}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: c.x, top: chart.y + chart.h + 8, fontFamily: tokens.type.text, fontSize: noteFs, color: theme.muted, opacity: labelsIn }}>{o.note}</div>
    </>
  );
};
