import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";

const TF = 15;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const io = (f: number, D: number) => ({
  i: ease(clamp(f / TF)),
  o: ease(clamp((f - (D - TF)) / Math.max(1, TF - 1))),
});
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

const PAPER = "#f1ece0";
const INK = "#1d2a33";
const BLUE = "#2f6f8f";
const TEAL = "#6aa9b8";
const PALE = "#b9d6d8";
const GREY = "#b8b0a0";
const GROUND = "#0f1b24";
const ACCENT = "#e8c84a";
const RED = "#d94a4a";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";

type Point = { x: number; y: number; scale: number };
type Pendulum = {
  k: number;
  pivot: Point;
  bob: Point;
  shadow: Point;
  radius: number;
};

const pathThrough = (points: ReadonlyArray<Point>) =>
  points
    .map((p, n) => `${n === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

export const SciDoc: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const D = Math.max(1, dur);
  const { i, o } = io(f, D);
  const diagram = ease(clamp((f - D * 0.33) / (D * 0.06)));
  const perspective = ease(clamp((f - D * 0.64) / (D * 0.05)));
  const painting = 1 - diagram;
  const diagramOnly = diagram * (1 - perspective);
  const lowerBand = diagram * (1 - ease(clamp(perspective / 0.5)));
  const waveLabel = ease(clamp((perspective - 0.8) / 0.2));
  const boil = 17 + Math.floor(f / 3);

  const commonCycle = 20;
  const referencePeriod = commonCycle / 24;
  const gravity = 9.81;
  const referenceLength = gravity * (referencePeriod / (2 * Math.PI)) ** 2;
  const amplitude = 0.24;
  const waveStart = D * 0.64;

  // Every angle shares the same phase at waveStart. k=0 never changes clocks.
  const angleAt = (frame: number, k: number): number => {
    const omega0 = Math.sqrt(gravity / referenceLength);
    const omegaK = (2 * Math.PI * (24 + k)) / commonCycle;
    const elapsed = Math.max(0, frame - waveStart) / 30;
    return amplitude * Math.cos(omega0 * (frame / 30) + 0.4 + (omegaK - omega0) * elapsed);
  };

  const project = (x: number, y: number, z: number): Point => {
    const scale = 1800 / (1800 + z);
    return {
      x: mix(517, 350, perspective) + x * scale,
      y: mix(220, 170, perspective) + y * scale,
      scale,
    };
  };

  const pendulumAt = (frame: number, k: number): Pendulum => {
    const period = commonCycle / (24 + k);
    const physicalLength = gravity * (period / (2 * Math.PI)) ** 2;
    const length =
      mix(470, 590, perspective) * (physicalLength / referenceLength);
    const theta = angleAt(frame, k);
    const swing = length * Math.sin(theta);
    const yaw = perspective * 0.5;
    const originX = k * 158;
    const originZ = k * 65;
    const x = originX + swing * Math.cos(yaw);
    const z = originZ - swing * Math.sin(yaw);
    const bob = project(x, length * Math.cos(theta), z);
    return {
      k,
      pivot: project(originX, 0, originZ),
      bob,
      shadow: project(x, 690, z),
      radius: 46 * bob.scale,
    };
  };

  const pendulums = Array.from({ length: 12 }, (_, k) => pendulumAt(f, k));
  const baton = pendulums[0]!;
  const bob = baton.bob;
  const theta = angleAt(f, 0);

  const graphStart = D * 0.33;
  const graphDuration = D * (0.69 - 0.33);
  const graphReveal = ease(clamp(0.12 + (f - graphStart) / (graphDuration * 0.6)));
  const gx = 1135;
  const gy = 484;
  const gw = 625;
  const ga = 147;
  const windowFrames = referencePeriod * 30 * 3.4;
  const dotFraction = 0.8;
  const graphLeftFrame = f - windowFrames * dotFraction;
  const visibleStart = dotFraction * (1 - graphReveal);
  const graphPoints: Point[] = Array.from({ length: 181 }, (_, n) => {
    const u = mix(visibleStart, dotFraction, n / 180);
    return {
      x: gx + u * gw,
      y: gy - (angleAt(graphLeftFrame + u * windowFrames, 0) / amplitude) * ga,
      scale: 1,
    };
  });
  const graphDot = graphPoints[graphPoints.length - 1]!;

  const arcR = 122;
  const angleArc =
    `M517,${220 + arcR} A${arcR},${arcR} 0 0 ${theta >= 0 ? 0 : 1} ` +
    `${517 + arcR * Math.sin(theta)},${220 + arcR * Math.cos(theta)}`;

  const zoom = 1 + 43 * o * o;
  const camera =
    `translate(${mix(bob.x, 960, o)} ${mix(bob.y, 540, o)}) ` +
    `scale(${zoom}) translate(${-bob.x} ${-bob.y})`;
  const exitField = ease(clamp((o - 0.58) / 0.42));

  const archPath = (x: number) =>
    `M${x},925 V410 C${x},63 ${x + 474},63 ${x + 474},410 V925 Z`;

  const renderWavePendulum = (p: Pendulum) => (
    <g key={`wave-${p.k}`}>
      <ellipse
        cx={p.shadow.x}
        cy={p.shadow.y}
        rx={p.radius * 1.65}
        ry={p.radius * 0.3}
        fill={INK}
        opacity={0.45}
        filter="url(#sd-shadow)"
      />
      {Array.from({ length: 10 }, (_, n) => {
        const a = pendulumAt(f - 10 + n, p.k).bob;
        const b = pendulumAt(f - 9 + n, p.k).bob;
        return (
          <line
            key={`trail-${p.k}-${n}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            stroke={ACCENT}
            strokeWidth={2 * p.bob.scale}
            opacity={0.05 + (n / 9) * 0.35}
            strokeLinecap="round"
          />
        );
      })}
      <line
        x1={p.pivot.x}
        y1={p.pivot.y}
        x2={p.bob.x}
        y2={p.bob.y}
        stroke={PALE}
        strokeWidth={2.8 * p.bob.scale}
      />
      <circle cx={p.pivot.x} cy={p.pivot.y} r={6 * p.pivot.scale} fill={PAPER} />
      {p.k !== 0 ? (
        <circle
          cx={p.bob.x}
          cy={p.bob.y}
          r={p.radius}
          fill="url(#sd-bob)"
          stroke={INK}
          strokeWidth={1.5}
        />
      ) : null}
    </g>
  );

  return (
    <AbsoluteFill style={{ backgroundColor: PAPER, overflow: "hidden" }}>
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        style={{ position: "absolute", inset: 0 }}
        role="img"
        aria-label="A painted historical lamp becomes a mathematical pendulum and then a twelve-pendulum wave."
      >
        <defs>
          <filter id="sd-wobble" x="-15%" y="-15%" width="130%" height="130%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.021"
              numOctaves={2}
              seed={boil}
              result="sd-noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="sd-noise"
              scale={4.5}
              xChannelSelector="R"
              yChannelSelector="G"
            />
          </filter>
          <filter id="sd-grain" x="0%" y="0%" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.68"
              numOctaves={3}
              seed={31}
            />
            <feColorMatrix type="saturate" values="0" />
            <feBlend in="SourceGraphic" mode="multiply" />
          </filter>
          <filter id="sd-wash-blur" x="-15%" y="-15%" width="130%" height="130%">
            <feGaussianBlur stdDeviation={13} />
          </filter>
          <filter id="sd-soft-wash" x="-30%" y="-40%" width="160%" height="180%">
            <feGaussianBlur stdDeviation={27} />
          </filter>
          <filter id="sd-bleed" x="-35%" y="-35%" width="170%" height="170%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.012"
              numOctaves={3}
              seed={boil}
              result="sd-bleed-noise"
            />
            <feDisplacementMap
              in="SourceGraphic"
              in2="sd-bleed-noise"
              scale={40}
              xChannelSelector="R"
              yChannelSelector="G"
            />
            <feGaussianBlur stdDeviation={12} />
          </filter>
          <filter id="sd-shadow" x="-70%" y="-150%" width="240%" height="400%">
            <feGaussianBlur stdDeviation={7} />
          </filter>
          <filter id="sd-focus" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation={o * 22} />
          </filter>
          <linearGradient id="sd-arch-depth" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.5} />
            <stop offset="65%" stopColor={BLUE} stopOpacity={0.4} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0.35} />
          </linearGradient>
          <radialGradient id="sd-bob" cx="29%" cy="24%" r="80%">
            <stop offset="0%" stopColor={PAPER} />
            <stop offset="23%" stopColor={ACCENT} />
            <stop offset="72%" stopColor={ACCENT} />
            <stop offset="100%" stopColor={INK} />
          </radialGradient>
          <mask
            id="sd-wash-mask"
            maskUnits="userSpaceOnUse"
            x={-2400}
            y={-2400}
            width={7000}
            height={7000}
          >
            <circle
              cx={bob.x}
              cy={bob.y}
              r={115 + 2200 * i}
              fill={PAPER}
              filter="url(#sd-bleed)"
            />
          </mask>
        </defs>

        <rect width={1920} height={1080} fill={PAPER} />
        <rect width={1920} height={1080} fill={GROUND} opacity={diagram} />

        <g transform={camera}>
          <g filter="url(#sd-focus)">
            <g opacity={painting}>
              <g mask="url(#sd-wash-mask)" style={{ mixBlendMode: "multiply" }}>
                {[0, 1, 2].map((n) => {
                  const x = 118 + n * 596;
                  return (
                    <g key={`paint-arch-${n}`}>
                      <path
                        d={archPath(x)}
                        fill="url(#sd-arch-depth)"
                        filter="url(#sd-wash-blur)"
                      />
                      <path
                        d={archPath(x + 3)}
                        fill="none"
                        stroke={BLUE}
                        strokeWidth={12}
                        opacity={0.25}
                        filter="url(#sd-wobble)"
                      />
                      <path
                        d={`M${x + 18},435 C${x + 18},110 ${x + 450},110 ${
                          x + 450
                        },435 L${x + 420},635 Q${x + 220},440 ${x + 30},670 Z`}
                        fill={BLUE}
                        opacity={0.16}
                        filter="url(#sd-soft-wash)"
                      />
                    </g>
                  );
                })}
                {[0, 1, 2, 3].map((n) => (
                  <path
                    key={`pier-wash-${n}`}
                    d={`M${52 + n * 596},288 Q${90 + n * 596},246 ${
                      125 + n * 596
                    },306 L${135 + n * 596},935 L${45 + n * 596},935 Z`}
                    fill={GREY}
                    opacity={0.62}
                    filter="url(#sd-wash-blur)"
                  />
                ))}
                <ellipse
                  cx={560}
                  cy={934}
                  rx={545}
                  ry={116}
                  fill={GREY}
                  opacity={0.29}
                  filter="url(#sd-soft-wash)"
                />
                <ellipse
                  cx={bob.x}
                  cy={930}
                  rx={320}
                  ry={85}
                  fill={PAPER}
                  opacity={0.95}
                  filter="url(#sd-soft-wash)"
                />
                <path
                  d={`M${bob.x - 20},${bob.y + 10} L${bob.x - 285},984
                      Q${bob.x},1040 ${bob.x + 285},984 L${bob.x + 20},${bob.y + 10} Z`}
                  fill={ACCENT}
                  opacity={0.105}
                  filter="url(#sd-soft-wash)"
                />
                {Array.from({ length: 8 }, (_, n) => (
                  <ellipse
                    key={`wash-detail-${n}`}
                    cx={110 + rnd(n + 12) * 1680}
                    cy={180 + rnd(n + 45) * 720}
                    rx={110 + rnd(n + 75) * 160}
                    ry={80 + rnd(n + 105) * 170}
                    fill={n % 2 === 0 ? TEAL : GREY}
                    opacity={0.13}
                    filter="url(#sd-soft-wash)"
                  />
                ))}
              </g>

              <g
                fill="none"
                stroke={INK}
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#sd-wobble)"
                opacity={0.44 + 0.43 * i}
              >
                {[0, 1, 2].map((n) => {
                  const x = 118 + n * 596;
                  return (
                    <g key={`ink-arch-${n}`}>
                      <path d={archPath(x)} strokeWidth={4.5} />
                      <path
                        d={`M${x - 36},930 V410 C${x - 36},12 ${
                          x + 510
                        },12 ${x + 510},410 V930`}
                        strokeWidth={2.6}
                      />
                      {Array.from({ length: 8 }, (_, j) => (
                        <g key={`stone-${n}-${j}`} strokeWidth={1.8}>
                          <path d={`M${x - 60},${400 + j * 69} h66`} />
                          <path d={`M${x + 470},${422 + j * 66} h68`} />
                        </g>
                      ))}
                    </g>
                  );
                })}

                {Array.from({ length: 72 }, (_, n) => {
                  const pier = Math.floor(n / 18);
                  const j = n % 18;
                  const x = 64 + pier * 596;
                  const y = 430 + j * 27;
                  return (
                    <path
                      key={`pier-hatch-${n}`}
                      d={`M${x},${y + 23} l${29 + rnd(n) * 18},-24`}
                      strokeWidth={1.5}
                    />
                  );
                })}

                {Array.from({ length: 48 }, (_, n) => {
                  const arch = Math.floor(n / 16);
                  const j = n % 16;
                  const a = Math.PI + ((j + 0.5) / 16) * Math.PI;
                  const cx = 355 + arch * 596;
                  const x = cx + Math.cos(a) * 237;
                  const y = 410 + Math.sin(a) * 260;
                  return (
                    <path
                      key={`curve-hatch-${n}`}
                      d={`M${x},${y} l${Math.cos(a) * 25 + 9},${Math.sin(a) * 28 + 8}`}
                      strokeWidth={1.6}
                    />
                  );
                })}

                {Array.from({ length: 12 }, (_, n) => {
                  const x = -1300 + n * 410;
                  return (
                    <path
                      key={`floor-ray-${n}`}
                      d={`M517,620 L${x},1080`}
                      strokeWidth={1.7}
                      opacity={0.65}
                    />
                  );
                })}
                {[722, 761, 814, 884, 978, 1062].map((y) => (
                  <path
                    key={`floor-cross-${y}`}
                    d={`M60,${y} Q960,${y - 9} 1860,${y}`}
                    strokeWidth={1.9}
                    opacity={0.7}
                  />
                ))}
                <path d="M517,124 V220 M481,129 Q517,96 553,129" strokeWidth={4} />
              </g>

              <rect
                width={1920}
                height={1080}
                fill={GREY}
                opacity={0.12}
                filter="url(#sd-grain)"
                style={{ mixBlendMode: "multiply" }}
              />
              <rect x={80} y={921} width={1588} height={93} rx={4} fill={PAPER} opacity={0.96} />
              <text
                x={106}
                y={983}
                fill={INK}
                fontFamily={SERIF}
                fontSize={46}
                fontStyle="italic"
              >
                Pisa, 1583. A lamp swings, and someone counts.
              </text>
            </g>

            <g opacity={diagramOnly} fontFamily={SANS}>
              <rect
                x={85}
                y={160}
                width={865}
                height={640}
                rx={16}
                fill={GROUND}
                stroke={TEAL}
                strokeWidth={1.5}
              />
              <rect
                x={995}
                y={160}
                width={830}
                height={640}
                rx={16}
                fill={GROUND}
                stroke={TEAL}
                strokeWidth={1.5}
              />
              <text x={125} y={224} fill={PAPER} fontSize={32} letterSpacing={4}>
                THE PENDULUM
              </text>
              <text x={1035} y={224} fill={PAPER} fontSize={32} letterSpacing={4}>
                ANGLE / TIME
              </text>
              <line
                x1={517}
                y1={220}
                x2={517}
                y2={730}
                stroke={TEAL}
                strokeWidth={2}
                strokeDasharray="8 12"
              />
              <path d={angleArc} fill="none" stroke={RED} strokeWidth={3} />
              <text
                x={552 + 155 * Math.sin(theta / 2)}
                y={220 + 155 * Math.cos(theta / 2)}
                fill={PAPER}
                fontFamily={SERIF}
                fontStyle="italic"
                fontSize={46}
              >
                θ
              </text>
              <g transform={`translate(${(517 + bob.x) / 2 - 60} ${(220 + bob.y) / 2})`}>
                <rect x={-18} y={-40} width={66} height={68} rx={6} fill={GROUND} />
                <text fill={PAPER} fontFamily={SERIF} fontStyle="italic" fontSize={46}>
                  L
                </text>
              </g>

              {[0, 1, 2, 3, 4].map((n) => (
                <g key={`graph-grid-${n}`} stroke={TEAL} strokeWidth={1} opacity={0.28}>
                  <line x1={gx} y1={gy - ga + n * ga / 2} x2={1780} y2={gy - ga + n * ga / 2} />
                  <line x1={gx + n * gw / 4} y1={304} x2={gx + n * gw / 4} y2={674} />
                </g>
              ))}
              <path
                d={`M${gx},300 V684 M${gx},${gy} H1790`}
                fill="none"
                stroke={PAPER}
                strokeWidth={2}
              />
              <text x={1024} y={gy - ga + 11} fill={PAPER} fontFamily={SERIF} fontSize={32}>
                +θ₀
              </text>
              <text x={1024} y={gy + ga + 11} fill={PAPER} fontFamily={SERIF} fontSize={32}>
                −θ₀
              </text>
              {[0, 1, 2].map((n) => {
                const x = gx + (n / 3.4) * gw;
                return (
                  <g key={`tick-${n}`}>
                    <line x1={x} y1={681} x2={x} y2={693} stroke={PAPER} strokeWidth={2} />
                    <text
                      x={x}
                      y={735}
                      fill={PAPER}
                      fontFamily={SERIF}
                      fontSize={34}
                      fontStyle={n === 0 ? "normal" : "italic"}
                      textAnchor="middle"
                    >
                      {n === 0 ? "0" : n === 1 ? "T" : "2T"}
                    </text>
                  </g>
                );
              })}
              <text x={1770} y={735} fill={PAPER} fontFamily={SERIF} fontSize={40} fontStyle="italic">
                t
              </text>
              <path
                d={pathThrough(graphPoints)}
                fill="none"
                stroke={ACCENT}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <line
                x1={graphDot.x}
                y1={305}
                x2={graphDot.x}
                y2={674}
                stroke={PALE}
                strokeWidth={1.5}
                strokeDasharray="5 8"
              />
              <circle cx={graphDot.x} cy={graphDot.y} r={9} fill={ACCENT} stroke={GROUND} strokeWidth={3} />
            </g>

            <g opacity={lowerBand}>
              <rect x={85} y={838} width={1740} height={172} rx={12} fill={GROUND} />
              <text x={130} y={956} fill={PAPER} fontFamily={SERIF} fontSize={84}>
                <tspan fontStyle="italic">T</tspan>
                <tspan> = 2π</tspan>
              </text>
              <path
                d="M443,924 L458,915 L478,958 L502,865 H738"
                fill="none"
                stroke={PAPER}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text x={526} y={952} fill={PAPER} fontFamily={SERIF} fontSize={76}>
                <tspan fontStyle="italic">L</tspan>
                <tspan> / </tspan>
                <tspan fontStyle="italic">g</tspan>
              </text>
              <text x={1035} y={939} fill={PAPER} fontFamily={SANS} fontSize={40}>
                One angle. One continuous clock.
              </text>
            </g>

            <g opacity={perspective}>
              {Array.from({ length: 18 }, (_, n) => {
                const x = -1500 + n * 235;
                const a = project(x, 690, -180);
                const b = project(x, 690, 3000);
                return (
                  <line
                    key={`grid-depth-${n}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={TEAL}
                    strokeWidth={1.2}
                    opacity={0.3}
                  />
                );
              })}
              {Array.from({ length: 17 }, (_, n) => {
                const z = -120 + n * 180;
                const a = project(-1700, 690, z);
                const b = project(3200, 690, z);
                return (
                  <line
                    key={`grid-cross-${n}`}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke={TEAL}
                    strokeWidth={1.2}
                    opacity={0.3}
                  />
                );
              })}
              <path
                d={pathThrough(pendulums.map((p) => p.pivot))}
                fill="none"
                stroke={PALE}
                strokeWidth={5}
              />
              {pendulums.slice().reverse().map(renderWavePendulum)}
            </g>

            <g opacity={waveLabel}>
              <rect x={88} y={908} width={802} height={98} rx={6} fill={GROUND} opacity={0.97} />
              <text x={116} y={975} fill={PAPER} fontFamily={SANS} fontSize={48}>
                Same law. Twelve lengths.
              </text>
            </g>

            <line
              x1={baton.pivot.x}
              y1={baton.pivot.y}
              x2={bob.x}
              y2={bob.y}
              stroke={INK}
              strokeWidth={4.5}
              opacity={painting * (0.5 + 0.4 * i)}
              filter="url(#sd-wobble)"
            />
            <line
              x1={baton.pivot.x}
              y1={baton.pivot.y}
              x2={bob.x}
              y2={bob.y}
              stroke={PALE}
              strokeWidth={3}
              opacity={diagramOnly}
            />
            <circle cx={baton.pivot.x} cy={baton.pivot.y} r={7} fill={INK} opacity={painting} />
            <circle cx={baton.pivot.x} cy={baton.pivot.y} r={7} fill={PAPER} opacity={diagramOnly} />
          </g>

          <circle cx={bob.x} cy={bob.y} r={baton.radius} fill={ACCENT} />
          <circle
            cx={bob.x}
            cy={bob.y}
            r={baton.radius * 1.04}
            fill={ACCENT}
            opacity={painting * 0.4}
            filter="url(#sd-bleed)"
          />
          <circle
            cx={bob.x}
            cy={bob.y}
            r={baton.radius}
            fill="none"
            stroke={INK}
            strokeWidth={2.5}
            opacity={painting}
            filter="url(#sd-wobble)"
          />
          <circle
            cx={bob.x}
            cy={bob.y}
            r={baton.radius}
            fill="url(#sd-bob)"
            stroke={INK}
            strokeWidth={1.5 * perspective}
            opacity={perspective}
          />

          <g
            transform={`translate(${bob.x} ${bob.y}) rotate(${-theta * 180 / Math.PI})`}
            opacity={painting * (0.52 + 0.48 * i)}
            fill="none"
            stroke={INK}
            strokeWidth={3}
            filter="url(#sd-wobble)"
          >
            <path d="M-68,-47 Q0,-81 68,-47 L51,48 Q0,78 -51,48 Z" />
            <path d="M-68,-47 H68 M-51,48 H51 M-23,-60 L-17,57 M23,-60 L17,57" />
            <path d="M-35,67 Q0,89 35,67 M0,-75 V-94" />
          </g>
        </g>

        <rect width={1920} height={1080} fill={ACCENT} opacity={exitField} />
        <circle
          cx={mix(bob.x, 960, o)}
          cy={mix(bob.y, 540, o)}
          r={165 + 3 * Math.sin(f * 0.15)}
          fill="none"
          stroke={INK}
          strokeWidth={5}
          opacity={exitField}
        />

        <g fontFamily={SANS} fontSize={32} letterSpacing="0.3em">
          <text x={60} y={110} fill={INK} opacity={painting * (1 - exitField)}>
            LIBRARY STYLE · SCIENCE DOCUMENTARY
          </text>
          <text x={60} y={110} fill={PAPER} opacity={diagram * (1 - exitField)}>
            LIBRARY STYLE · SCIENCE DOCUMENTARY
          </text>
          <text x={60} y={110} fill={INK} opacity={exitField}>
            LIBRARY STYLE · SCIENCE DOCUMENTARY
          </text>
        </g>
        <text
          x={82}
          y={988}
          fill={INK}
          fontFamily={SANS}
          fontSize={48}
          opacity={exitField}
        >
          Same law. Twelve lengths.
        </text>
      </svg>
    </AbsoluteFill>
  );
};
