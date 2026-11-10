/**
 * Eight library styles native to this renderer (the other 27 live in the motion-director kit 2).
 * Each is a pure function of the frame, 1920x1080, and owns its entry and exit transition:
 * the first TF frames are the style's way in, the last TF frames its way out.
 * Palettes follow the personal-brand rule: no orange hues, no purple hues.
 */
import React from "react";
import { AbsoluteFill, Easing, Sequence, useCurrentFrame } from "remotion";
import { loadFont as loadClayFont } from "@remotion/google-fonts/Baloo2";

const { fontFamily: CLAY_FONT } = loadClayFont("normal", { weights: ["700"] });

export const TF = 15;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
const io = (f: number, D: number) => ({ i: ease(clamp(f / TF)), o: ease(clamp((f - (D - TF)) / TF)) });
/** deterministic pseudo-random */
const rnd = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const KICK = "LIBRARY STYLE";

export type LibProps = { dur: number };

/* ------------------------------------------------------------------ TRON */
export const Tron: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const C = "#5ff4ff";
  const scroll = (f * 6) % 80;
  const trail = clamp((f - 18) / 70);
  // perimeter of the title frame, drawn by two light cycles from opposite corners
  const P = 2 * (1520 + 380);
  const glow = `drop-shadow(0 0 6px ${C}) drop-shadow(0 0 18px ${C})`;
  // entry: derez — the frame assembles from 18 horizontal slices that slide in from alternate sides
  const slices = Array.from({ length: 18 }, (_, k) => k);
  const body = (
    <AbsoluteFill style={{ background: "#02060a" }}>
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
        <defs>
          <linearGradient id="hz" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0a3a44" /><stop offset="1" stopColor="#02060a" /></linearGradient>
        </defs>
        <rect x={0} y={560} width={1920} height={520} fill="url(#hz)" opacity={0.55} />
        {Array.from({ length: 15 }, (_, k) => { // perspective floor, lines rushing toward the camera
          const z = (k * 80 + scroll) / 1200; const y = 560 + 520 * Math.pow(z, 1.8);
          return <line key={`h${k}`} x1={0} x2={1920} y1={y} y2={y} stroke={C} strokeOpacity={0.15 + 0.6 * z} strokeWidth={1 + 2 * z} />;
        })}
        {Array.from({ length: 25 }, (_, k) => {
          const x = (k - 12) * 160;
          return <line key={`v${k}`} x1={960 + x * 0.08} y1={560} x2={960 + x * 2.2} y2={1080} stroke={C} strokeOpacity={0.35} strokeWidth={1.5} />;
        })}
        <line x1={0} x2={1920} y1={560} y2={560} stroke={C} strokeWidth={3} style={{ filter: glow }} />
        <rect x={200} y={170} width={1520} height={380} fill="none" stroke={C} strokeWidth={6}
          strokeDasharray={`${P * trail} ${P}`} style={{ filter: glow }} />
        <rect x={200} y={170} width={1520} height={380} fill="none" stroke="#ffffff" strokeWidth={6}
          strokeDasharray={`${P * trail} ${P}`} strokeDashoffset={-P / 2} style={{ filter: glow }} />
        {[0, 1].map((k) => { // the two light-cycle heads
          const d = (P * trail + (k ? P / 2 : 0)) % P; const [x, y] = perim(200, 170, 1520, 380, d);
          return trail > 0 && trail < 1 ? <circle key={k} cx={x} cy={y} r={11} fill="#fff" style={{ filter: glow }} /> : null;
        })}
        {(() => { // a light cycle that keeps racing across the floor, leaving a fading trail
          const run = ((f * 28) % 2600) - 340; const y = 860;
          return <g><line x1={Math.max(0, run - 520)} x2={run} y1={y} y2={y} stroke={C} strokeWidth={8} strokeOpacity={0.9} style={{ filter: glow }} />
            <rect x={run - 10} y={y - 16} width={56} height={32} rx={8} fill="#e9fdff" style={{ filter: glow }} /></g>;
        })()}
      </svg>
      <div style={{ position: "absolute", left: 200, top: 205, width: 1520, textAlign: "center", fontFamily: "Avenir Next Condensed, Avenir Next, Helvetica Neue, sans-serif", letterSpacing: "0.35em", fontWeight: 600, fontSize: 40, color: C, textShadow: `0 0 12px ${C}` }}>{KICK} · LIGHT GRID</div>
      <div style={{ position: "absolute", left: 200, top: 275, width: 1520, textAlign: "center", fontFamily: "Avenir Next Condensed, Avenir Next, Helvetica Neue, sans-serif", fontWeight: 700, fontSize: 190, letterSpacing: "0.04em", color: "#e9fdff", textTransform: "uppercase", opacity: clamp((f - 40) / 12), textShadow: `0 0 10px ${C}, 0 0 34px ${C}` }}>Tron</div>
    </AbsoluteFill>
  );
  return (
    <AbsoluteFill style={{ background: "#02060a" }}>
      {slices.map((k) => {
        const h = 1080 / 18; const dir = k % 2 ? 1 : -1; const lag = rnd(k) * 0.35;
        const ki = ease(clamp((f / TF - lag) / (1 - 0.35)));
        return (
          <div key={k} style={{ position: "absolute", left: 0, top: 0, width: 1920, height: 1080, clipPath: `inset(${k * h}px 0 ${1080 - (k + 1) * h}px 0)`, transform: `translateX(${dir * (1 - ki) * 900}px)`, opacity: ki }}>{body}</div>
        );
      })}
      {/* exit: a light cycle crosses the frame and everything behind its trail derezzes to black */}
      {o > 0 ? (
        <>
          <AbsoluteFill style={{ background: "#02060a", clipPath: `inset(0 ${100 - o * 100}% 0 0)` }} />
          <div style={{ position: "absolute", top: 0, left: o * 1920 - 8, width: 16, height: 1080, background: "#fff", boxShadow: `0 0 30px 12px ${C}` }} />
        </>
      ) : null}
    </AbsoluteFill>
  );
};
function perim(x: number, y: number, w: number, h: number, d: number): [number, number] {
  if (d < w) return [x + d, y]; d -= w; if (d < h) return [x + w, y + d]; d -= h; if (d < w) return [x + w - d, y + h]; d -= w; return [x, y + h - d];
}

/* ------------------------------------------------------------------ ASCII */
const RAMP = " .,:;i1tfLCG08@";
export const Ascii: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { o } = io(f, dur);
  const COLS = 96, ROWS = 38, CW = 20, CH = 28;
  const ox = (1920 - COLS * CW) / 2, oy = (1080 - ROWS * CH) / 2;
  const t = f / 30;
  const rows: string[] = [];
  const typed = Math.floor(clamp(f / 22) * COLS * ROWS); // entry: characters type on in raster order
  for (let r = 0; r < ROWS; r++) {
    let line = "";
    for (let c = 0; c < COLS; c++) {
      // a lit sphere on the left, a digit field on the right
      const nx = (c - 14) / 12, ny = (r - 19) / 12 * (CH / CW) * 0.62;
      const rr = nx * nx + ny * ny; let v = 0;
      if (rr < 1) { const nz = Math.sqrt(1 - rr); const lx = Math.cos(t * 1.4), lz = Math.sin(t * 1.4); v = Math.min(1, Math.max(0.12, nx * lx * 0.8 - ny * 0.45 + nz * lz * 0.6 + 0.45)); }
      const glyph = DIGITS(c - 36, r - 5, f);
      if (glyph) v = 0.55 + 0.45 * Math.abs(Math.sin(c * 0.3 + t * 3));
      let ch = RAMP[Math.min(RAMP.length - 1, Math.floor(v * (RAMP.length - 1)))]!;
      const idx = r * COLS + c; if (idx > typed) ch = " ";
      line += ch;
    }
    rows.push(line);
  }
  return (
    <AbsoluteFill style={{ background: "#050607" }}>
      {rows.map((line, r) => (
        <div key={r} style={{ position: "absolute", left: ox, top: oy + r * CH, fontFamily: "Menlo, monospace", fontSize: 25, lineHeight: `${CH}px`, whiteSpace: "pre", color: "#dfe9e6", letterSpacing: `${CW - 15.05}px` }}>
          {o > 0 ? [...line].map((ch, c) => { // exit: each character drops away on its own delay
            const k = clamp((o - rnd(r * 131 + c) * 0.6) / 0.4);
            return <span key={c} style={{ display: "inline-block", transform: `translateY(${k * k * 700}px)`, opacity: 1 - k }}>{ch}</span>;
          }) : line}
        </div>
      ))}
      <div style={{ position: "absolute", left: ox, top: oy - 10, fontFamily: "Menlo, monospace", fontSize: 22, color: "#7fe6d3" }}>{"> style --show ascii   # characters as pixels"}</div>
    </AbsoluteFill>
  );
};
// 7x5 bitmap glyphs, scaled x2 horizontally and x4 vertically
const FONT5: Record<string, string[]> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  C: ["01111", "10000", "10000", "10000", "10000", "10000", "01111"],
  I: ["11111", "00100", "00100", "00100", "00100", "00100", "11111"],
};
const WORD = "ASCII";
function DIGITS(c: number, r: number, f: number): boolean {
  if (c < 0 || r < 0) return false; const gx = Math.floor(c / 2), gy = Math.floor(r / 4);
  const k = Math.floor(gx / 6); const s = WORD[k]; if (!s || gy > 6) return false;
  if (f < 26 + k * 6) return false;
  return FONT5[s]![gy]![gx % 6] === "1";
}

/* ------------------------------------------------------------------ CRT TERMINAL */
export const Crt: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const G = "#4dff88";
  const lines = [
    "$ style --info crt",
    "  name ........ CRT terminal",
    "  phosphor .... green, with glow",
    "  surface ..... scanlines, curved glass",
    "  best for .... steps, logs, checks",
    "  enters ...... power-on",
    "$ style --exit crt   # power-off",
  ];
  const chars = Math.floor((f - 10) * 2.2);
  let left = chars; const shown = lines.map((l) => { const s = l.slice(0, Math.max(0, left)); left -= l.length + 4; return s; });
  // entry power-on: a line opens vertically; exit power-off: collapse to a line, then to a dot
  const sy = o > 0 ? Math.max(0.004, 1 - easeOut(clamp(o / 0.6))) : 0.004 + 0.996 * easeOut(i);
  const sx = o > 0.6 ? Math.max(0.01, 1 - (o - 0.6) / 0.4) : 1;
  const flash = o > 0 ? 1 + 2 * clamp(o / 0.6) : 1 + 2 * (1 - i);
  return (
    <AbsoluteFill style={{ background: "#000" }}>
      <AbsoluteFill style={{ transform: `scale(${sx}, ${sy})`, filter: `brightness(${flash})` }}>
        <div style={{ position: "absolute", inset: 60, borderRadius: 60, background: "radial-gradient(ellipse at center, #061a0c 0%, #020804 75%)", boxShadow: "inset 0 0 160px rgba(0,0,0,0.9)", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 120, top: 110, fontFamily: "Menlo, monospace", fontSize: 50, lineHeight: 1.5, color: G, textShadow: `0 0 6px ${G}, 0 0 22px rgba(77,255,136,0.5)` }}>
            {shown.map((s, k) => <div key={k} style={{ whiteSpace: "pre", fontWeight: s.startsWith("  name") ? 700 : 400 }}>{s}{k === shown.findIndex((x, j) => x.length < lines[j]!.length) && Math.floor(f / 8) % 2 ? "█" : ""}</div>)}
          </div>
          <AbsoluteFill style={{ background: "repeating-linear-gradient(0deg, rgba(0,0,0,0.38) 0px, rgba(0,0,0,0.38) 2px, transparent 2px, transparent 5px)" }} />
          <div style={{ position: "absolute", left: 0, right: 0, height: 140, top: ((f * 9) % 1200) - 140, background: "linear-gradient(transparent, rgba(77,255,136,0.06), transparent)" }} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ RISOGRAPH (teal + red + yellow inks) */
export const Riso: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const TEAL = "#00838a", RED = "#ff4b4b", YEL = "#ffd84d";
  // entry: the two ink layers slide in from opposite sides and land slightly out of register
  const mis = (1 - i) * 420; const wob = 6 + 2 * Math.sin(f / 7);
  const grain = "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.45 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";
  const layer = (color: string, dx: number, dy: number, children: React.ReactNode) => (
    <AbsoluteFill style={{ transform: `translate(${dx}px, ${dy}px)`, mixBlendMode: "multiply", color }}>{children}</AbsoluteFill>
  );
  const halftone = (cx: number, cy: number, R: number, color: string) => {
    const dots: React.ReactNode[] = [];
    for (let y = -R; y <= R; y += 22) for (let x = -R; x <= R; x += 22) {
      const d = Math.hypot(x, y) / R; if (d > 1) continue; const r = 10 * (1 - d * 0.7);
      dots.push(<circle key={`${x},${y}`} cx={cx + x} cy={cy + y} r={r} fill={color} />);
    }
    return dots;
  };
  const bars = [0.42, 0.61, 0.38, 0.78];
  return (
    <AbsoluteFill style={{ background: "#f4efe4" }}>
      {layer(TEAL, -mis + wob, 0, (
        <svg width={1920} height={1080}>
          {halftone(1420, 430, 260, TEAL)}
          {bars.map((b, k) => <rect key={k} x={170 + k * 175} y={980 - b * clamp((f - 20) / 30) * 520} width={140} height={b * clamp((f - 20) / 30) * 520} fill={TEAL} />)}
          <text x={960} y={960} fontFamily="Futura, Avenir Next, sans-serif" fontWeight={800} fontSize={235} fill={TEAL}>3 inks</text>
        </svg>
      ))}
      {layer(RED, mis - wob, wob * 0.6, (
        <div style={{ position: "absolute", left: 160, top: 110, fontFamily: "Futura, Avenir Next, Helvetica Neue, sans-serif", fontWeight: 800, fontSize: 210, lineHeight: 0.9, color: RED, letterSpacing: "-0.03em", textTransform: "uppercase" }}>Riso<br />graph</div>
      ))}
      {layer(YEL, 0, 0, <svg width={1920} height={1080}>{halftone(1300, 520, 190, YEL)}</svg>)}
      <div style={{ position: "absolute", left: 160, top: 1000, fontFamily: "Futura, Avenir Next, sans-serif", fontWeight: 700, fontSize: 40, color: TEAL, mixBlendMode: "multiply", letterSpacing: "0.1em" }}>TEAL · RED · YELLOW · MISREGISTER · GRAIN</div>
      <AbsoluteFill style={{ backgroundImage: grain, opacity: 0.55, mixBlendMode: "multiply" }} />
      {/* exit: the sheet is pulled off the drum — a paper edge wipes across, carrying its own shadow */}
      {o > 0 ? (
        <AbsoluteFill style={{ background: "#f4efe4", clipPath: `polygon(0 0, ${o * 115}% 0, ${o * 115 - 12}% 100%, 0 100%)`, boxShadow: "inset 0 0 40px rgba(0,0,0,0.2)" }}>
          <AbsoluteFill style={{ backgroundImage: grain, opacity: 0.55, mixBlendMode: "multiply" }} />
        </AbsoluteFill>
      ) : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ BLUEPRINT */
export const Blueprint: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const INK = "#eaf4ff", BG = "#0d3b78";
  const draw = (start: number, len: number) => Math.max(0, len * (1 - clamp((f - start) / 26)));
  const box = (x: number, y: number, w: number, h: number, label: string, s: number) => {
    const L = 2 * (w + h);
    return (
      <g key={label}>
        <rect x={x} y={y} width={w} height={h} fill="none" stroke={INK} strokeWidth={3} strokeDasharray={L} strokeDashoffset={draw(s, L)} />
        <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontFamily="Menlo, monospace" fontSize={52} fill={INK} opacity={clamp((f - s - 14) / 10)}>{label}</text>
      </g>
    );
  };
  const arrow = (x1: number, x2: number, y: number, s: number) => (
    <g key={`a${x1}`}>
      <line x1={x1} x2={x1 + (x2 - x1) * clamp((f - s) / 14)} y1={y} y2={y} stroke={INK} strokeWidth={3} />
      {f > s + 14 ? <path d={`M${x2 - 18} ${y - 10} L${x2} ${y} L${x2 - 18} ${y + 10}`} fill="none" stroke={INK} strokeWidth={3} /> : null}
    </g>
  );
  const dim = (x1: number, x2: number, y: number, txt: string, s: number) => (
    <g key={`d${x1}`} opacity={clamp((f - s) / 12)}>
      <line x1={x1} x2={x2} y1={y} y2={y} stroke={INK} strokeWidth={1.5} />
      <line x1={x1} x2={x1} y1={y - 14} y2={y + 14} stroke={INK} strokeWidth={1.5} />
      <line x1={x2} x2={x2} y1={y - 14} y2={y + 14} stroke={INK} strokeWidth={1.5} />
      <text x={(x1 + x2) / 2} y={y - 12} textAnchor="middle" fontFamily="Menlo, monospace" fontSize={30} fill={INK}>{txt}</text>
    </g>
  );
  return (
    <AbsoluteFill style={{ background: BG }}>
      {/* entry: the sheet unrolls from the top edge */}
      <AbsoluteFill style={{ transformOrigin: "50% 0%", transform: `scaleY(${0.02 + 0.98 * i})` }}>
        <svg width={1920} height={1080}>
          <defs>
            <pattern id="g" width={40} height={40} patternUnits="userSpaceOnUse"><path d="M40 0H0V40" fill="none" stroke="#5f8fd0" strokeOpacity={0.35} strokeWidth={1} /></pattern>
            <pattern id="G" width={200} height={200} patternUnits="userSpaceOnUse"><path d="M200 0H0V200" fill="none" stroke="#8fb4e6" strokeOpacity={0.45} strokeWidth={1.5} /></pattern>
          </defs>
          <rect width={1920} height={1080} fill="url(#g)" /><rect width={1920} height={1080} fill="url(#G)" />
          <rect x={60} y={60} width={1800} height={960} fill="none" stroke={INK} strokeWidth={2} />
          <text x={110} y={170} fontFamily="Menlo, monospace" fontSize={60} fill={INK} letterSpacing={6}>BLUEPRINT STYLE — TECHNICAL SHEET</text>
          {box(130, 330, 460, 320, "GRID", 14)}
          {box(730, 330, 460, 320, "LINE", 30)}
          {box(1330, 330, 460, 320, "DIMENSION", 46)}
          {arrow(590, 730, 490, 44)}
          {arrow(1190, 1330, 490, 60)}
          {dim(130, 590, 730, "40 / 200 px", 70)}
          {dim(730, 1190, 730, "WHITE ON BLUE", 78)}
          {dim(1330, 1790, 730, "VALUES", 86)}
          <circle cx={960} cy={260} r={34} fill="none" stroke={INK} strokeWidth={2} opacity={clamp((f - 90) / 10)} />
          <text x={960} y={270} textAnchor="middle" fontFamily="Menlo, monospace" fontSize={28} fill={INK} opacity={clamp((f - 90) / 10)}>A</text>
          <g opacity={clamp((f - 96) / 12)}>
            <rect x={1360} y={850} width={460} height={130} fill="none" stroke={INK} strokeWidth={2} />
            <line x1={1360} x2={1820} y1={895} y2={895} stroke={INK} strokeWidth={1.5} />
            <text x={1380} y={882} fontFamily="Menlo, monospace" fontSize={22} fill={INK}>STYLE: BLUEPRINT</text>
            <text x={1380} y={940} fontFamily="Menlo, monospace" fontSize={22} fill={INK}>ENTERS: UNROLL  EXITS: ERASE</text>
          </g>
        </svg>
      </AbsoluteFill>
      {/* exit: the drawing is erased by a cleared band moving down the sheet */}
      {o > 0 ? <AbsoluteFill style={{ background: BG, clipPath: `inset(0 0 ${100 - o * 100}% 0)` }}><div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 6, background: INK, opacity: o < 1 ? 0.8 : 0 }} /></AbsoluteFill> : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ ORIGAMI (faceted folded paper) */
export const Origami: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const fold = clamp((f - TF) / 40); // a sheet folds itself into a boat
  // facets: light from the top-left, so each face gets its own value
  const faces = [
    { d: "M760 640 L960 420 L960 640 Z", c: "#e9e4d8" },
    { d: "M960 420 L1160 640 L960 640 Z", c: "#cfc8b8" },
    { d: "M640 640 L1280 640 L1180 760 L740 760 Z", c: "#b9b19f" },
    { d: "M640 640 L740 760 L700 640 Z", c: "#8f8775" },
  ];
  const sail = ease(fold);
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #e7edf0 0%, #cfdbe0 100%)", perspective: 1800 }}>
      {/* entry: the frame unfolds from a closed flap along the top edge */}
      <AbsoluteFill style={{ transformOrigin: "50% 0%", transform: `rotateX(${(1 - i) * -88}deg)`, backfaceVisibility: "hidden" }}>
        <AbsoluteFill style={{ background: "linear-gradient(180deg, #eef3f5 0%, #d4e0e5 100%)" }} />
        <svg width={1920} height={1080} style={{ position: "absolute", inset: 0 }}>
          {/* water: folded strips */}
          {Array.from({ length: 6 }, (_, k) => {
            const y = 760 + k * 50, s = Math.sin(f / 12 + k) * 18;
            return <path key={k} d={`M0 ${y} L480 ${y + s} L960 ${y - s} L1440 ${y + s} L1920 ${y - s} L1920 ${y + 50} L0 ${y + 50} Z`} fill={k % 2 ? "#7fb3c4" : "#93c3d2"} />;
          })}
          <g transform={`translate(${960 - 960 * 1.9 + 420} ${Math.sin(f / 14) * 10 + 700 - 700 * 1.9 + 40}) scale(1.9) rotate(${Math.sin(f / 18) * 2} 960 700)`}>
            {faces.map((fc, k) => (
              <path key={k} d={fc.d} fill={fc.c} stroke="#6f6857" strokeWidth={1.5}
                style={{ transformOrigin: "960px 640px", transform: k < 2 ? `scaleY(${sail})` : undefined, opacity: k < 2 ? sail : 1 }} />
            ))}
            <line x1={960} y1={420 + (1 - sail) * 220} x2={960} y2={640} stroke="#6f6857" strokeWidth={1.5} strokeDasharray="6 6" />
          </g>
        </svg>
        <div style={{ position: "absolute", left: 160, top: 96, fontFamily: "Georgia, serif", fontSize: 32, letterSpacing: "0.3em", color: "#4a5a60", lineHeight: 1 }}>{KICK} · FOLDED PAPER</div>
        <div style={{ position: "absolute", left: 160, top: 220, fontFamily: "Georgia, serif", fontSize: 140, lineHeight: 1, color: "#22302f", opacity: clamp((f - 30) / 14) }}>Origami.</div>
        <div style={{ position: "absolute", left: 164, top: 400, fontFamily: "Georgia, serif", fontStyle: "italic", fontSize: 44, lineHeight: 1, color: "#4a5a60", opacity: clamp((f - 44) / 14) }}>unfold · crease · fold</div>
      </AbsoluteFill>
      {/* exit: the top half folds down over the bottom along a crease */}
      {o > 0 ? (
        <AbsoluteFill style={{ clipPath: "inset(0 0 50% 0)", transformOrigin: "50% 50%", transform: `rotateX(${-o * 180}deg)`, background: o > 0.5 ? "#d8d2c3" : "linear-gradient(180deg, #e7edf0 0%, #dce5e8 100%)", boxShadow: "0 30px 60px rgba(0,0,0,0.2)" }} />
      ) : null}
      {o > 0.5 ? <AbsoluteFill style={{ background: `rgba(216,210,195,${(o - 0.5) * 2})` }} /> : null}
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ CLAYMATION (stop motion on twos, no people) */
export const Clay: React.FC<LibProps> = ({ dur }) => {
  const raw = useCurrentFrame(); const f = raw - (raw % 2); // animated on twos
  const { i, o } = io(f, dur);
  const jit = (k: number) => (rnd(Math.floor(f / 2) * 7 + k) - 0.5) * 3; // hand-made wobble
  // two highlights + a soft core shadow read as a hand-pressed, slightly lumpy surface rather than a flat gradient
  const clay = (base: string, hi: string) =>
    `radial-gradient(circle at 30% 24%, ${hi} 0%, ${hi}00 26%), ` +
    `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.10) 0%, rgba(0,0,0,0) 40%), ` +
    `radial-gradient(circle at 36% 30%, ${hi} 0%, ${base} 58%, ${base} 100%)`;
  const clayShadow = "inset -10px -14px 0 rgba(0,0,0,0.14), inset 6px 8px 0 rgba(255,255,255,0.18), inset 0 0 24px rgba(0,0,0,0.08), 0 14px 0 rgba(0,0,0,0.18)";
  const bars = [{ h: 0.35, c: "#2a9d8f", hi: "#7fd6cb" }, { h: 0.55, c: "#e9c46a", hi: "#fbe7b0" }, { h: 0.82, c: "#e63946", hi: "#ff9aa2" }];
  const grow = (k: number) => ease(clamp((f - 18 - k * 10) / 18));
  // entry: everything drops in and squashes on landing; exit: it melts down into the table
  const drop = (k: number) => { const t = clamp((f - k * 4) / 14); const y = (1 - easeOut(t)) * -900; const sq = t >= 1 ? 1 + 0.18 * Math.exp(-(f - k * 4 - 14) / 4) * Math.cos((f - k * 4 - 14) / 2) : 1; return { y, sq }; };
  const melt = o;
  return (
    <AbsoluteFill style={{ background: "linear-gradient(180deg, #d9e8e4 0%, #c3d9d3 62%, #9c8f7a 62%, #8a7e6a 100%)" }}>
      {bars.map((b, k) => {
        const d = drop(k + 1); const H = 420 * b.h * grow(k);
        return (
          <div key={k} style={{ position: "absolute", left: 200 + k * 290 + jit(k), bottom: 410 - 4, width: 230, height: Math.max(30, H * 1.45) * (1 - melt * 0.9), borderRadius: `${40 + jit(k + 20)}px ${40 - jit(k + 30)}px 18px 18px`, background: clay(b.c, b.hi), boxShadow: clayShadow, transform: `translateY(${d.y}px) scale(${1 / d.sq + melt * 0.4}, ${d.sq * (1 - melt * 0.5)})`, transformOrigin: "50% 100%" }} />
        );
      })}
      {(() => { const d = drop(0); return (
        <div style={{ position: "absolute", left: 1100 + jit(9), top: 230, fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 150, lineHeight: 1, color: "#264653", textShadow: "4px 5px 0 #1b333c, 0 10px 0 rgba(0,0,0,0.15)", transform: `translateY(${d.y}px) scale(${1 / d.sq + melt * 0.3}, ${d.sq * (1 - melt * 0.7)})`, transformOrigin: "50% 100%" }}>Clay</div>
      ); })()}
      <div style={{ position: "absolute", left: 1104 + jit(4), top: 420, fontFamily: CLAY_FONT, fontWeight: 700, fontSize: 44, lineHeight: 1, color: "#264653", opacity: clamp((f - 46) / 8) * (1 - melt) }}>stop motion, on twos</div>
      <div style={{ position: "absolute", left: 1640 + jit(2), top: 150 + Math.sin(f / 8) * 10, width: 120, height: 120, borderRadius: "50%", background: clay("#e9c46a", "#fff3c4"), boxShadow: clayShadow, transform: `scale(${i * (1 - melt)})` }} />
    </AbsoluteFill>
  );
};

/* ------------------------------------------------------------------ SYNTHWAVE (brand-safe: cyan, red, yellow) */
export const Synthwave: React.FC<LibProps> = ({ dur }) => {
  const f = useCurrentFrame(); const { i, o } = io(f, dur);
  const scroll = (f * 5) % 90;
  // entry: the horizon rises from below the frame; exit: an iris closes onto the sun
  const rise = (1 - i) * 600;
  const iris = o > 0 ? 1150 * (1 - ease(o)) + 4 : 2000;
  return (
    <AbsoluteFill style={{ background: "#000", clipPath: `circle(${iris}px at 960px 430px)` }}>
      <AbsoluteFill style={{ background: "linear-gradient(180deg, #03111f 0%, #0a2a45 55%, #135a73 70%)", transform: `translateY(${rise * 0.4}px)` }} />
      <svg width={1920} height={1080} style={{ position: "absolute", inset: 0, transform: `translateY(${rise}px)` }}>
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffe14d" /><stop offset="1" stopColor="#ff3d57" /></linearGradient>
          <clipPath id="cut">{Array.from({ length: 9 }, (_, k) => <rect key={k} x={0} y={180 + k * 34} width={1920} height={34 - Math.max(0, k - 3) * 4} />)}</clipPath>
        </defs>
        {Array.from({ length: 40 }, (_, k) => <circle key={k} cx={rnd(k) * 1920} cy={rnd(k + 99) * 360} r={1 + rnd(k + 5) * 2} fill="#cfefff" opacity={0.4 + 0.6 * Math.abs(Math.sin(f / 10 + k))} />)}
        <circle cx={960} cy={430} r={250} fill="url(#sun)" clipPath="url(#cut)" />
        <rect x={0} y={600} width={1920} height={480} fill="#020a14" />
        {Array.from({ length: 14 }, (_, k) => { const z = (k * 90 + scroll) / 1260; const y = 600 + 480 * Math.pow(z, 2); return <line key={k} x1={0} x2={1920} y1={y} y2={y} stroke="#4ff0ff" strokeWidth={1 + 3 * z} strokeOpacity={0.3 + 0.7 * z} />; })}
        {Array.from({ length: 29 }, (_, k) => { const x = (k - 14) * 140; return <line key={`v${k}`} x1={960 + x * 0.05} y1={600} x2={960 + x * 2.6} y2={1080} stroke="#4ff0ff" strokeOpacity={0.55} strokeWidth={2} />; })}
        <line x1={0} x2={1920} y1={600} y2={600} stroke="#ff3d57" strokeWidth={4} style={{ filter: "drop-shadow(0 0 10px #ff3d57)" }} />
      </svg>
      <div style={{ position: "absolute", left: 0, right: 0, top: 690, textAlign: "center", transform: `translateY(${rise}px) skewX(-8deg)`, fontFamily: "Futura, Avenir Next, sans-serif", fontStyle: "italic", fontWeight: 800, fontSize: 150, letterSpacing: "0.02em", color: "#eaffff", textShadow: "0 0 8px #4ff0ff, 0 0 30px #4ff0ff, 6px 6px 0 #ff3d57", opacity: clamp((f - 24) / 10) }}>SYNTHWAVE</div>
    </AbsoluteFill>
  );
};

export const LIB_STYLES = { tron: Tron, ascii: Ascii, crt: Crt, risograph: Riso, blueprint: Blueprint, origami: Origami, claymation: Clay, synthwave: Synthwave } as const;
export type LibStyleId = keyof typeof LIB_STYLES;

/** Neutral slates on both sides, so every entry and exit is shown against drawn content (handoff contract). */
const Slate: React.FC<{ label: string }> = ({ label }) => (
  <AbsoluteFill style={{ background: "#101214", alignItems: "center", justifyContent: "center" }}>
    <div style={{ fontFamily: "Menlo, monospace", fontSize: 30, letterSpacing: "0.2em", color: "#7a8089" }}>{label}</div>
    <div style={{ width: 160, height: 8, marginTop: 24, background: "#1f7a8c" }} />
  </AbsoluteFill>
);
export const LIB_DUR = 180;
export const SLATE = 20;
export const LibStyleDemo: React.FC<{ id: LibStyleId }> = ({ id }) => {
  const f = useCurrentFrame(); const S = LIB_STYLES[id];
  if (f < SLATE) return <Slate label="previous scene" />;
  if (f >= SLATE + LIB_DUR) return <Slate label="next scene" />;
  return <Shift by={SLATE}><S dur={LIB_DUR} /></Shift>;
};
const Shift: React.FC<{ by: number; children: React.ReactNode }> = ({ by, children }) => <Sequence from={by} layout="none">{children}</Sequence>;
