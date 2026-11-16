import React from "react";
import { AbsoluteFill, Easing, useCurrentFrame } from "remotion";

const TF = 15;
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const ease = Easing.bezier(0.65, 0, 0.35, 1);
const settle = Easing.bezier(0.16, 1, 0.3, 1);
const io = (f: number, D: number) => ({
  i: ease(clamp(f / TF)),
  o: ease(clamp((f - (D - TF)) / (TF - 1))),
});
const rnd = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

const FONT = "'Avenir Next', 'Helvetica Neue', Helvetica, Arial, sans-serif";
const C = {
  ground: "#141b2b",
  ink: "#1d2a33",
  teal: "#2f8f8c",
  tealMid: "#5fb3ad",
  tealLight: "#a9d6cf",
  blue: "#3f6f9f",
  blueMid: "#7fa8c9",
  blueLight: "#b9d0d6",
  wallEdge: "#a3bdc4",
  sky: "#dbeef0",
  green: "#b7d7a8",
  leaf: "#2f7d4f",
  leafMid: "#4fa868",
  leafLight: "#8fcf8a",
  wood: "#d9c7a3",
  woodMid: "#c2ad85",
  woodDark: "#a8926b",
  red: "#c8554f",
  yellow: "#e8c84a",
  cyan: "#6fe3f0",
  white: "#f3f6f4",
};
type Point = readonly [number, number];
type Tones = readonly [string, string, string];
type Axis = "x" | "y";
type SceneObject = {
  id: string;
  x: number;
  y: number;
  z: number;
  shadow: boolean;
  draw: () => React.ReactNode;
};

const WOOD: Tones = [C.wood, C.woodMid, C.woodDark];
const TEAL: Tones = [C.tealLight, C.tealMid, C.teal];
const BLUE: Tones = [C.blueLight, C.blueMid, C.blue];
const DARK: Tones = [C.blue, C.ink, C.ground];
const LEAF: Tones = [C.leafLight, C.leafMid, C.leaf];
const YELLOW: Tones = [C.yellow, C.woodMid, C.woodDark];
const RIGHT_WALL: Tones = [C.wallEdge, C.blueLight, C.blueMid];

const iso = (x: number, y: number, z = 0): Point => [
  (x - y) * 64,
  (x + y) * 32 - z * 64,
];
const points = (ps: readonly Point[]) =>
  ps.map(([x, y]) => `${x},${y}`).join(" ");

function polygon(
  ps: readonly Point[],
  fill: string,
  stroke = C.ink,
  width = 3,
): React.ReactElement {
  return (
    <polygon
      points={points(ps)}
      fill={fill}
      stroke={stroke}
      strokeWidth={width}
      strokeLinejoin="round"
    />
  );
}

function line(
  a: Point,
  b: Point,
  colour = C.ink,
  width = 3,
): React.ReactElement {
  return (
    <line
      x1={a[0]}
      y1={a[1]}
      x2={b[0]}
      y2={b[1]}
      stroke={colour}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function box(
  x: number,
  y: number,
  z: number,
  w: number,
  d: number,
  h: number,
  colours: Tones,
): React.ReactElement {
  const a = iso(x, y, z + h);
  const b = iso(x + w, y, z + h);
  const c = iso(x + w, y + d, z + h);
  const e = iso(x, y + d, z + h);
  return (
    <g>
      {polygon(
        [e, c, iso(x + w, y + d, z), iso(x, y + d, z)],
        colours[1],
      )}
      {polygon(
        [b, iso(x + w, y, z), iso(x + w, y + d, z), c],
        colours[2],
      )}
      {polygon([a, b, c, e], colours[0])}
    </g>
  );
}

function wallPoint(axis: Axis, u: number, base: number, z: number): Point {
  return axis === "x" ? iso(u, base, z) : iso(base, u, z);
}

function wallQuad(
  axis: Axis,
  u: number,
  base: number,
  z: number,
  w: number,
  h: number,
  fill: string,
  stroke = C.ink,
  width = 3,
): React.ReactElement {
  return polygon(
    [
      wallPoint(axis, u, base, z),
      wallPoint(axis, u + w, base, z),
      wallPoint(axis, u + w, base, z + h),
      wallPoint(axis, u, base, z + h),
    ],
    fill,
    stroke,
    width,
  );
}

function mug(x: number, y: number, z: number) {
  const handle = iso(x + 0.2, y + 0.09, z + 0.14);
  return (
    <g>
      <ellipse
        cx={handle[0] + 3}
        cy={handle[1]}
        rx={5}
        ry={7}
        fill="none"
        stroke={C.ink}
        strokeWidth={3}
      />
      {box(x, y, z, 0.16, 0.16, 0.22, TEAL)}
    </g>
  );
}

function desk(x: number, y: number) {
  return (
    <g>
      {box(x + 0.07, y + 0.05, 0, 0.13, 0.64, 0.94, WOOD)}
      {box(x + 1.12, y + 0.06, 0.1, 0.43, 0.64, 0.83, WOOD)}
      {[0.32, 0.58, 0.84].map((z) => (
        <g key={z}>
          {line(
            iso(x + 1.14, y + 0.705, z),
            iso(x + 1.53, y + 0.705, z),
            C.woodDark,
            2,
          )}
          {line(
            iso(x + 1.25, y + 0.715, z - 0.1),
            iso(x + 1.42, y + 0.715, z - 0.1),
            C.ink,
            3,
          )}
        </g>
      ))}
      {box(x, y, 0.93, 1.65, 0.78, 0.13, WOOD)}
      {box(x + 0.25, y + 0.48, 1.06, 0.66, 0.2, 0.035, BLUE)}
      {[0, 1].map((n) => (
        <React.Fragment key={n}>
          {line(
            iso(x + 0.3, y + 0.53 + n * 0.07, 1.1),
            iso(x + 0.85, y + 0.53 + n * 0.07, 1.1),
            C.ink,
            1.5,
          )}
        </React.Fragment>
      ))}
      {mug(x + 1.32, y + 0.4, 1.06)}
    </g>
  );
}

function monitor(x: number, y: number, f: number, seed: number) {
  const z = 1.08;
  const tick = Math.floor(f / 6);
  return (
    <g>
      {box(x + 0.23, y, z, 0.35, 0.28, 0.055, DARK)}
      {box(x + 0.37, y + 0.04, z + 0.05, 0.09, 0.1, 0.22, DARK)}
      {box(x, y, z + 0.22, 0.95, 0.1, 0.69, DARK)}
      {wallQuad("x", x + 0.055, y + 0.107, z + 0.28, 0.84, 0.57, C.cyan)}
      {wallQuad("x", x + 0.1, y + 0.113, z + 0.72, 0.74, 0.085, C.blue, "none")}
      {[0, 1, 2].map((n) => (
        <React.Fragment key={n}>
          {wallQuad(
            "x",
            x + 0.1,
            y + 0.115,
            z + 0.36 + n * 0.11,
            n === 1
              ? 0.26 + rnd(seed * 11 + tick) * 0.35
              : n === 0 ? 0.55 : 0.39,
            0.055,
            C.white,
            "none",
          )}
        </React.Fragment>
      ))}
      {wallQuad(
        "x",
        x + 0.71,
        y + 0.117,
        z + 0.36,
        0.12,
        0.23,
        seed % 2 === 0 ? C.yellow : C.red,
        "none",
      )}
    </g>
  );
}

function chair(x: number, y: number, red: boolean, angle = 0) {
  const pivot = iso(x + 0.32, y + 0.32, 0.59);
  const back = [
    iso(x, y, 0.78),
    iso(x + 0.65, y, 0.78),
    iso(x + 0.65, y, 1.42),
    iso(x, y, 1.42),
  ];
  return (
    <g>
      {[0, 1, 2, 3, 4].map((n) => {
        const a = n * Math.PI * 2 / 5;
        const cx = x + 0.32;
        const cy = y + 0.32;
        const end = iso(cx + Math.cos(a) * 0.46, cy + Math.sin(a) * 0.46, 0.06);
        return (
          <g key={n}>
            {line(iso(cx, cy, 0.12), end, C.ink, 4)}
            <circle cx={end[0]} cy={end[1]} r={3.5} fill={C.ink} />
          </g>
        );
      })}
      {line(iso(x + 0.32, y + 0.32, 0.1), pivot, C.ink, 6)}
      <g transform={`rotate(${angle} ${pivot[0]} ${pivot[1]})`}>
        {box(x, y, 0.59, 0.65, 0.65, 0.13, BLUE)}
        {box(x, y, 0.72, 0.65, 0.11, 0.7, DARK)}
        {red ? (
          <g>
            {polygon(
              [
                iso(x, y, 0.725),
                iso(x + 0.65, y, 0.725),
                iso(x + 0.65, y + 0.65, 0.725),
                iso(x, y + 0.65, 0.725),
              ],
              C.red,
            )}
            {polygon(back, C.red)}
            {polygon(back, C.ink, "none")}
            {polygon(
              [
                iso(x + 0.055, y + 0.115, 0.85),
                iso(x + 0.595, y + 0.115, 0.85),
                iso(x + 0.595, y + 0.115, 1.35),
                iso(x + 0.055, y + 0.115, 1.35),
              ],
              C.red,
            )}
          </g>
        ) : null}
      </g>
    </g>
  );
}

function stool(x: number, y: number) {
  return (
    <g>
      {box(x + 0.04, y + 0.04, 0, 0.09, 0.42, 0.53, WOOD)}
      {box(x + 0.38, y + 0.04, 0, 0.09, 0.42, 0.53, WOOD)}
      {box(x, y, 0.53, 0.52, 0.52, 0.13, YELLOW)}
    </g>
  );
}

function plant(
  x: number,
  y: number,
  z = 0,
  seed = 1,
  size = 1,
) {
  const centre = iso(x + 0.23, y + 0.23, z + 0.46);
  return (
    <g>
      {box(x, y, z, 0.46, 0.46, 0.42, BLUE)}
      {polygon(
        [
          iso(x + 0.06, y + 0.06, z + 0.43),
          iso(x + 0.4, y + 0.06, z + 0.43),
          iso(x + 0.4, y + 0.4, z + 0.43),
          iso(x + 0.06, y + 0.4, z + 0.43),
        ],
        C.ink,
        C.ink,
        2,
      )}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((n) => {
        const a = n * Math.PI * 2 / 8 + seed * 0.31;
        const reach = (26 + rnd(seed * 19 + n) * 19) * size;
        const height = (n < 4 ? 59 : 37) * size;
        const tip: Point = [
          centre[0] + Math.cos(a) * reach,
          centre[1] - height - Math.abs(Math.sin(a)) * 18 * size,
        ];
        const root: Point = [centre[0], centre[1] - (n < 4 ? 2 : 8)];
        const shoulder: Point = [
          (root[0] + tip[0]) / 2 + (n % 2 === 0 ? 11 : -11) * size,
          (root[1] + tip[1]) / 2 + 6,
        ];
        return (
          <React.Fragment key={n}>
            {polygon([root, shoulder, tip], LEAF[n % 3]!, C.ink, 2)}
          </React.Fragment>
        );
      })}
    </g>
  );
}

function hangingPlant(x: number, y: number, f: number, seed: number) {
  const anchor = iso(x + 0.23, y + 0.23, 4.15);
  const basket = iso(x + 0.23, y + 0.23, 2.65);
  const sway = Math.sin(f * 0.045 + seed) * 3;
  return (
    <g transform={`rotate(${sway} ${anchor[0]} ${anchor[1]})`}>
      {line(anchor, [basket[0], basket[1] - 30], C.ink, 2)}
      {line([basket[0], basket[1] - 30], [basket[0] - 23, basket[1]], C.ink, 2)}
      {line([basket[0], basket[1] - 30], [basket[0] + 23, basket[1]], C.ink, 2)}
      {plant(x, y, 2.23, seed, 0.68)}
      {[0, 1, 2].map((n) => {
        const px = basket[0] - 16 + n * 16;
        return (
          <g key={n}>
            {line([px, basket[1] + 8], [px + 6, basket[1] + 65], C.leaf, 2)}
            {[0, 1].map((j) => (
              <React.Fragment key={j}>
                {polygon(
                  [
                    [px + j * 3, basket[1] + 19 + j * 21],
                    [px + 17, basket[1] + 24 + j * 21],
                    [px + 7, basket[1] + 43 + j * 21],
                  ],
                  j === 0 ? C.leafLight : C.leafMid,
                  C.ink,
                  2,
                )}
              </React.Fragment>
            ))}
          </g>
        );
      })}
    </g>
  );
}

function lamp(x: number, y: number, f: number, seed: number) {
  const anchor = iso(x, y, 4.4);
  const p = iso(x, y, 3.03);
  const sway = Math.sin(f * 0.037 + seed * 1.7) * 2.6;
  return (
    <g transform={`rotate(${sway} ${anchor[0]} ${anchor[1]})`}>
      {line(anchor, [p[0], p[1] - 28], C.ink, 2)}
      {polygon(
        [
          [p[0] - 10, p[1] - 28],
          [p[0] + 10, p[1] - 28],
          [p[0] + 31, p[1]],
          [p[0], p[1] + 11],
          [p[0] - 31, p[1]],
        ],
        C.white,
      )}
      {polygon(
        [
          [p[0] + 5, p[1] - 28],
          [p[0] + 10, p[1] - 28],
          [p[0] + 31, p[1]],
          [p[0], p[1] + 11],
        ],
        C.woodMid,
      )}
      <ellipse
        cx={p[0]}
        cy={p[1] + 3}
        rx={26}
        ry={9}
        fill={C.yellow}
        stroke={C.ink}
        strokeWidth={3}
      />
    </g>
  );
}

function picture(axis: Axis, u: number, seed: number) {
  const b = 0.08;
  const p = (a: number, z: number) => wallPoint(axis, a, b + 0.025, z);
  return (
    <g>
      {wallQuad(axis, u, b, 1.91, 1.26, 1.06, C.woodDark)}
      {wallQuad(axis, u + 0.08, b + 0.01, 1.99, 1.1, 0.9, C.white)}
      {polygon(
        [p(u + 0.17, 2.08), p(u + 0.86, 2.08), p(u + 0.45, 2.72)],
        seed % 2 === 0 ? C.teal : C.blue,
        "none",
      )}
      {wallQuad(axis, u + 0.73, b + 0.03, 2.38, 0.29, 0.32, C.yellow, "none")}
      {wallQuad(axis, u + 0.31, b + 0.04, 2.17, 0.64, 0.1, C.red, "none")}
    </g>
  );
}

function shelf(u: number, seed: number) {
  return (
    <g>
      {box(0.025, u, 1.23, 0.43, 2.25, 0.13, WOOD)}
      {box(0.035, u + 0.2, 0.96, 0.23, 0.1, 0.27, WOOD)}
      {box(0.035, u + 1.93, 0.96, 0.23, 0.1, 0.27, WOOD)}
      {[0, 1, 2, 3, 4].map((n) => (
        <React.Fragment key={n}>
          {box(
            0.07,
            u + 0.13 + n * 0.22,
            1.36,
            0.27,
            0.16,
            0.36 + rnd(seed + n) * 0.16,
            n % 2 === 0 ? BLUE : TEAL,
          )}
        </React.Fragment>
      ))}
      {box(0.08, u + 1.43, 1.36, 0.26, 0.26, 0.25, TEAL)}
      {polygon(
        [
          iso(0.2, u + 1.55, 1.6),
          iso(0.13, u + 1.35, 1.98),
          iso(0.31, u + 1.57, 1.75),
        ],
        C.leafLight,
        C.ink,
        2,
      )}
      {polygon(
        [
          iso(0.2, u + 1.55, 1.6),
          iso(0.38, u + 1.73, 1.94),
          iso(0.1, u + 1.69, 1.76),
        ],
        C.leafMid,
        C.ink,
        2,
      )}
      {box(0.08, u + 1.91, 1.36, 0.25, 0.22, 0.2, BLUE)}
    </g>
  );
}

function window(u: number, f: number, seed: number) {
  const drift = Math.sin(f * 0.017 + seed) * 0.24;
  return (
    <g>
      {wallQuad("x", u, 0.04, 1.25, 2.3, 1.64, C.ink)}
      {wallQuad("x", u + 0.075, 0.055, 1.33, 2.15, 1.48, C.sky)}
      {wallQuad("x", u + 0.4 + drift, 0.063, 2.2, 0.73, 0.15, C.white, "none")}
      {wallQuad("x", u + 0.6 + drift, 0.064, 2.3, 0.3, 0.13, C.white, "none")}
      {wallQuad("x", u + 0.15, 0.064, 1.35, 2, 0.2, C.blueLight, "none")}
      {line(iso(u + 1.15, 0.08, 1.31), iso(u + 1.15, 0.08, 2.83), C.ink, 4)}
      {line(iso(u + 0.07, 0.08, 2.07), iso(u + 2.23, 0.08, 2.07), C.ink, 4)}
      {box(u - 0.05, 0.015, 1.14, 2.4, 0.29, 0.12, BLUE)}
    </g>
  );
}

function clock(f: number) {
  // Local face coordinates are transformed into the right-wall plane.
  const p = iso(10.65, 0.08, 2.35);
  const angle = f * 0.7;
  return (
    <g transform={`translate(${p[0]} ${p[1]}) matrix(1 .5 0 1 0 0)`}>
      <circle r={28} fill={C.white} stroke={C.ink} strokeWidth={3} />
      {[0, 1, 2, 3].map((n) => {
        const a = n * Math.PI / 2;
        return (
          <React.Fragment key={n}>
            {line(
              [Math.cos(a) * 20, Math.sin(a) * 20],
              [Math.cos(a) * 23, Math.sin(a) * 23],
              C.ink,
              2,
            )}
          </React.Fragment>
        );
      })}
      {line([0, 0], [-10, -9], C.ink, 3)}
      <g transform={`rotate(${angle})`}>
        {line([0, 0], [0, -19], C.teal, 2)}
      </g>
      <circle r={3} fill={C.ink} />
    </g>
  );
}

function glassPanel(x: number, y: number, f: number) {
  const w = 3;
  const h = 2.4;
  const d = 0.06;
  const shift = (Math.sin(f * 0.023) + 1) * 0.13;
  return (
    <g>
      {/* Fill and frame are separate: the frame is never a filled slab. */}
      <g opacity={0.28}>
        {wallQuad("x", x, y + d, 0.12, w, h, C.blueLight, "none", 0)}
      </g>
      <polygon
        points={points([
          iso(x, y + d, 0.12),
          iso(x + w, y + d, 0.12),
          iso(x + w, y + d, h + 0.12),
          iso(x, y + d, h + 0.12),
        ])}
        fill="none"
        stroke={C.ink}
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {line(iso(x, y, h + 0.12), iso(x + w, y, h + 0.12), C.ink, 2)}
      {line(iso(x, y, h + 0.12), iso(x, y + d, h + 0.12), C.ink, 2)}
      {line(iso(x + w, y, h + 0.12), iso(x + w, y + d, h + 0.12), C.ink, 2)}
      <g opacity={0.5}>
        {[0, 1, 2].map((n) => (
          <React.Fragment key={n}>
            {line(
              iso(x + 0.2 + n * 0.86 + shift, y + d + 0.005, 0.47),
              iso(x + 0.7 + n * 0.86 + shift, y + d + 0.005, 2.13),
              C.white,
              n === 1 ? 5 : 3,
            )}
          </React.Fragment>
        ))}
      </g>
      {box(x - 0.03, y - 0.08, 0, 0.18, 0.24, 0.12, DARK)}
      {box(x + w - 0.14, y - 0.08, 0, 0.18, 0.24, 0.12, DARK)}
    </g>
  );
}

export const Isometric: React.FC<{ dur: number }> = ({ dur }) => {
  const f = useCurrentFrame();
  const { o } = io(f, dur);
  const exitAge = Math.max(0, f - (dur - TF));
  const exiting = f >= dur - TF;
  const objects: SceneObject[] = [];

  const add = (
    id: string,
    x: number,
    y: number,
    z: number,
    draw: () => React.ReactNode,
    shadow = true,
  ) => {
    objects.push({ id, x, y, z, draw, shadow });
  };

  const stations: readonly Point[] = [
    [1.65, 1.65], [1.65, 2.45],
    [8.45, 1.65], [8.45, 2.45],
    [1.65, 5.45], [1.65, 6.25],
    [8.45, 5.45], [8.45, 6.25],
  ];
  stations.forEach(([x, y], n) => {
    add(`desk-${n}`, x + 0.825, y + 0.39, 0, () => (
      <g>
        {desk(x, y)}
        {monitor(x + 0.29, y + 0.1, f, n + 1)}
      </g>
    ));
    const cy = n % 2 === 0 ? y - 0.9 : y + 1;
    add(`chair-${n}`, x + 0.8, cy + 0.32, 0, () =>
      chair(
        x + 0.48,
        cy,
        n === 1 || n === 6,
        n === 5 ? Math.sin(f * 0.025) * 15 : 0,
      ),
    );
  });

  add("central-table", 5.9, 4.7, 0, () => (
    <g>
      {box(5.1, 4.08, 0, 0.15, 0.15, 0.89, WOOD)}
      {box(6.61, 4.08, 0, 0.15, 0.15, 0.89, WOOD)}
      {box(5.1, 5.12, 0, 0.15, 0.15, 0.89, WOOD)}
      {box(6.61, 5.12, 0, 0.15, 0.15, 0.89, WOOD)}
      {box(5, 4, 0.89, 1.88, 1.39, 0.15, WOOD)}
      {box(5.24, 4.31, 1.04, 0.49, 0.37, 0.045, BLUE)}
      {box(5.95, 4.68, 1.04, 0.34, 0.26, 0.035, TEAL)}
      {mug(6.4, 4.23, 1.04)}
    </g>
  ));

  const stools: readonly Point[] = [
    [5.05, 3.13], [6.05, 3.13], [5.05, 5.78], [6.05, 5.78],
  ];
  stools.forEach(([x, y], n) =>
    add(`stool-${n}`, x + 0.26, y + 0.26, 0, () => stool(x, y)),
  );

  const plants: readonly Point[] = [
    [0.44, 0.7], [10.91, 0.62], [0.43, 3.9], [0.46, 7.96],
    [10.95, 4.2], [10.92, 7.95], [4.03, 7.95], [6.4, 0.55],
  ];
  plants.forEach(([x, y], n) =>
    add(`plant-${n}`, x + 0.23, y + 0.23, 0, () =>
      plant(x, y, 0, n + 2, 1.08),
    ),
  );

  const hanging: readonly Point[] = [
    [1.1, 2.85], [3.7, 6.2], [6.1, 1.3], [10.3, 5.1],
  ];
  hanging.forEach(([x, y], n) =>
    add(`hanging-${n}`, x + 0.23, y + 0.23, 2.23, () =>
      hangingPlant(x, y, f, n + 3), false,
    ),
  );

  const lamps: readonly Point[] = [
    [2.65, 2.45], [9.3, 2.45], [2.65, 6.25], [9.3, 6.25], [5.9, 4.65],
  ];
  lamps.forEach(([x, y], n) =>
    add(`lamp-${n}`, x, y, 3.03, () => lamp(x, y, f, n), false),
  );

  add("glass-partition", 7.65, 6.87, 0, () => glassPanel(6.15, 6.87, f));
  add("shelf-one", 0.24, 1.85, 1.23, () => shelf(0.75, 4), false);
  add("shelf-two", 0.24, 6.29, 1.23, () => shelf(5.18, 19), false);

  [0.65, 2.15, 5.15].forEach((u, n) =>
    add(`picture-left-${n}`, 0.08, u + 0.63, 1.91, () =>
      picture("y", u, n), false,
    ),
  );
  add("picture-right", 5.32, 0.08, 1.91, () => picture("x", 4.69, 3), false);
  add("clock", 10.65, 0.08, 2.35, () => clock(f), false);

  add("printer-cabinet", 5.25, 0.63, 0, () => (
    <g>
      {box(4.3, 0.17, 0.08, 1.9, 0.82, 0.85, WOOD)}
      {line(iso(5.25, 0.995, 0.16), iso(5.25, 0.995, 0.85), C.woodDark, 2)}
      {line(iso(4.97, 1.005, 0.65), iso(5.12, 1.005, 0.65), C.ink, 3)}
      {line(iso(5.38, 1.005, 0.65), iso(5.53, 1.005, 0.65), C.ink, 3)}
      {box(4.65, 0.25, 0.93, 0.96, 0.55, 0.42, BLUE)}
      {box(4.74, 0.3, 1.35, 0.77, 0.36, 0.055, DARK)}
      {box(4.85, 0.66, 1.04, 0.57, 0.22, 0.035, [C.white, C.blueLight, C.blueMid])}
      {wallQuad("x", 5.4, 0.807, 1.19, 0.11, 0.07, C.cyan, "none")}
    </g>
  ));

  objects.sort(
    (a, b) =>
      a.x + a.y - (b.x + b.y) ||
      a.z - b.z ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

  const count = Math.max(1, objects.length - 1);
  const entryAge = (index: number) => f - (2 + index / count * 27);
  const objectLift = (index: number) =>
    exiting
      ? ease(clamp((exitAge - (count - index) / count * 4) / 5))
      : 0;

  const tiles = Array.from({ length: 108 }, (_, n) => ({
    x: n % 12,
    y: Math.floor(n / 12),
  })).sort((a, b) => a.x + a.y - b.x - b.y || a.x - b.x);

  const floorPeel = (x: number, y: number) =>
    exiting
      ? ease(clamp((exitAge - 5 - (x + y) / 19 * 4) / 5))
      : 0;

  const path: readonly Point[] = [
    [3, 3], [4, 3], [5, 3], [6, 3], [7, 3], [8, 3],
    [8, 4], [8, 5], [7, 5], [6, 5], [5, 5], [4, 5],
    [3, 5], [3, 4],
  ];
  const phase = f / 9;
  const index = Math.floor(phase) % path.length;
  const a = path[index]!;
  const b = path[(index + 1) % path.length]!;
  const t = ease(phase - Math.floor(phase));
  const cursorX = a[0] + (b[0] - a[0]) * t;
  const cursorY = a[1] + (b[1] - a[1]) * t;
  const architectureExit = exiting
    ? ease(clamp((exitAge - 7) / 7))
    : 0;
  const floorDecorExit = exiting
    ? ease(clamp((exitAge - 5) / 5))
    : 0;

  return (
    <AbsoluteFill style={{ background: C.ground, overflow: "hidden" }}>
      <svg
        width={1920}
        height={1080}
        viewBox="0 0 1920 1080"
        aria-label="A densely furnished isometric workspace assembling itself"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <radialGradient id="iso-shadow">
            <stop offset="0%" stopColor={C.ink} stopOpacity={0.5} />
            <stop offset="100%" stopColor={C.ground} stopOpacity={0} />
          </radialGradient>
        </defs>

        <ellipse
          cx={1160}
          cy={785}
          rx={690}
          ry={225}
          fill="url(#iso-shadow)"
          opacity={1 - o}
        />

        {/* Static grid remains after every moving element has departed. */}
        <g transform="translate(1080 335)" opacity={0.35}>
          {Array.from({ length: 13 }, (_, x) => (
            <React.Fragment key={`grid-x-${x}`}>
              {line(iso(x, 0), iso(x, 9), C.tealMid, 1.5)}
            </React.Fragment>
          ))}
          {Array.from({ length: 10 }, (_, y) => (
            <React.Fragment key={`grid-y-${y}`}>
              {line(iso(0, y), iso(12, y), C.tealMid, 1.5)}
            </React.Fragment>
          ))}
        </g>

        {/* At rest: x=494..1848, y=121..1007, including wall thickness. */}
        <g
          transform={`translate(1080 ${335 - o * 25}) scale(${1 + o * 0.012})`}
        >
          <g opacity={exiting ? 1 - ease(clamp((exitAge - 5) / 5)) : 1}>
            {box(0, 0, -0.14, 12, 9, 0.14, BLUE)}
          </g>

          {tiles.map(({ x, y }) => {
            const peel = floorPeel(x, y);
            const fill = [C.blueMid, C.tealLight, C.green, C.blueLight][
              (x + y * 3) % 4
            ]!;
            return (
              <g
                key={`tile-${x}-${y}`}
                transform={`translate(0 ${-40 * peel})`}
                opacity={1 - peel}
              >
                {polygon(
                  [
                    iso(x, y),
                    iso(x + 1, y),
                    iso(x + 1, y + 1),
                    iso(x, y + 1),
                  ],
                  fill,
                  C.ink,
                  2,
                )}
              </g>
            );
          })}

          {/* Floor treatments and light pools always precede furniture. */}
          <g opacity={1 - floorDecorExit}>
            {polygon(
              [
                iso(4.55, 3.54, 0.012),
                iso(7.3, 3.54, 0.012),
                iso(7.3, 5.76, 0.012),
                iso(4.55, 5.76, 0.012),
              ],
              C.teal,
              C.tealLight,
              3,
            )}
            {lamps.map(([x, y], n) => {
              const p = iso(x, y, 0.02);
              return (
                <ellipse
                  key={`light-pool-${n}`}
                  cx={p[0]}
                  cy={p[1]}
                  rx={88}
                  ry={44}
                  fill={C.yellow}
                  opacity={0.26 + Math.sin(f * 0.065 + n * 1.9) * 0.04}
                />
              );
            })}
            <g opacity={0.34 + Math.sin(f * 0.13) * 0.08}>
              {polygon(
                [
                  iso(cursorX + 0.08, cursorY + 0.08, 0.025),
                  iso(cursorX + 0.92, cursorY + 0.08, 0.025),
                  iso(cursorX + 0.92, cursorY + 0.92, 0.025),
                  iso(cursorX + 0.08, cursorY + 0.92, 0.025),
                ],
                C.cyan,
                C.white,
                2,
              )}
            </g>
          </g>

          {/* Growing landing shadows are separate from airborne objects. */}
          {objects.map((object, n) => {
            const age = entryAge(n);
            if (!object.shadow || age < 0) return null;
            const landing = settle(clamp(age / 12));
            const lift = objectLift(n);
            const p = iso(object.x, object.y, 0.018);
            return (
              <ellipse
                key={`landing-shadow-${object.id}`}
                cx={p[0]}
                cy={p[1]}
                rx={12 + landing * 34}
                ry={6 + landing * 17}
                fill={C.ink}
                opacity={(0.035 + landing * 0.13) * (1 - lift) * (1 - floorDecorExit)}
              />
            );
          })}

          {/* Architecture is fully present at frame zero. */}
          <g
            opacity={1 - architectureExit}
            transform={`translate(0 ${-architectureExit * 95})`}
          >
            {box(-0.15, -0.15, 0, 0.15, 9.15, 3.2, TEAL)}
            {box(0, -0.15, 0, 12, 0.15, 3.2, RIGHT_WALL)}
            {wallQuad("y", 7.7, 0.012, 0.035, 1.25, 3.08, C.red)}

            {line(iso(0.02, 0.03, 0.13), iso(0.02, 8.97, 0.13), C.tealLight, 4)}
            {line(iso(0.03, 0.02, 0.13), iso(11.97, 0.02, 0.13), C.wallEdge, 4)}

            {window(1.07, f, 0)}
            {window(7.18, f, 2)}
          </g>

          {objects.map((object, n) => {
            const age = entryAge(n);
            if (age < 0) return null;

            const fall = settle(clamp(age / 12));
            const impactAge = age - 12;
            const squash =
              impactAge >= 0 && impactAge < 10
                ? 0.08 * (1 - settle(clamp(impactAge / 10)))
                : 0;
            const lift = objectLift(n);
            const p = iso(object.x, object.y, 0);
            return (
              <g
                key={object.id}
                opacity={1 - lift}
                transform={[
                  `translate(${p[0]} ${p[1] - (1 - fall) * 220 - lift * 185})`,
                  `scale(${1 + squash * 0.5 + lift * 0.025} ${1 - squash})`,
                  `translate(${-p[0]} ${-p[1]})`,
                ].join(" ")}
              >
                {object.draw()}
              </g>
            );
          })}
        </g>
      </svg>

      <div
        style={{
          position: "absolute",
          left: 60,
          top: 60,
          color: "#cfe3e6",
          fontFamily: FONT,
          fontSize: 36,
          lineHeight: 1.25,
          letterSpacing: "0.3em",
          whiteSpace: "nowrap",
        }}
      >
        LIBRARY STYLE · ISOMETRIC DIORAMA
      </div>

      <div
        style={{
          position: "absolute",
          left: 60,
          bottom: 60,
          width: 500,
          fontFamily: FONT,
        }}
      >
        <div
          style={{
            fontSize: 120,
            lineHeight: 1.05,
            fontWeight: 700,
            letterSpacing: "-0.065em",
            color: C.white,
            whiteSpace: "nowrap",
            transform: "scaleX(0.93)",
            transformOrigin: "left center",
          }}
        >
          Isometric.
        </div>
        <div
          style={{
            marginTop: 16,
            width: 640,
            fontSize: 40,
            lineHeight: 1.2,
            letterSpacing: "-0.035em",
            color: "#9fb8bd",
            whiteSpace: "nowrap",
            transform: "scaleX(0.78)",
            transformOrigin: "left center",
          }}
        >
          every object three tones, one outline
        </div>
      </div>
    </AbsoluteFill>
  );
};
