import React, { useMemo } from "react";
import QRCode from "qrcode";
import { MARK_MAIN_PATH, MARK_STREAK_OPACITY, MARK_STREAK_PATH, MARK_VIEWBOX } from "./markPaths";

export interface QrMatrix {
  size: number;
  rows: boolean[][];
}

/** Deterministic QR (error correction H). */
export function makeQr(text: string): QrMatrix {
  const q = QRCode.create(text, { errorCorrectionLevel: "H" });
  const size = q.modules.size;
  const rows: boolean[][] = [];
  for (let y = 0; y < size; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < size; x++) row.push(q.modules.get(x, y) === 1);
    rows.push(row);
  }
  return { size, rows };
}

export function qrPath(m: QrMatrix): string {
  let d = "";
  for (let y = 0; y < m.size; y++) {
    let x = 0;
    while (x < m.size) {
      if (m.rows[y]![x]) {
        let x2 = x;
        while (x2 < m.size && m.rows[y]![x2]) x2++;
        d += `M${x} ${y}h${x2 - x}v1h${-(x2 - x)}z`;
        x = x2;
      } else x++;
    }
  }
  return d;
}

/** Dark modules on a light panel with a 4-module quiet zone. Never inverted. */
export const Qr: React.FC<{ text: string; size: number; dark: string; light: string; mark?: boolean }> = ({ text, size, dark, light, mark }) => {
  const m = useMemo(() => makeQr(text), [text]);
  const d = useMemo(() => qrPath(m), [m]);
  const quiet = 4;
  const total = m.size + quiet * 2;
  // Level H recovers ~30% of the symbol. A mark spanning 22% of the width covers
  // under 5% of the area, so the code still decodes with a wide margin.
  const span = Math.round(total * 0.22);
  const pad = Math.max(1, Math.round(span * 0.14));
  const at = (total - span) / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} shapeRendering="crispEdges" role="img" aria-label="QR code to LinkedIn profile">
      <rect width={total} height={total} fill={light} />
      <path transform={`translate(${quiet} ${quiet})`} d={d} fill={dark} />
      {mark ? (
        <>
          <rect x={at - pad} y={at - pad} width={span + pad * 2} height={span + pad * 2} fill={light} />
          <svg x={at} y={at} width={span} height={span} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`} shapeRendering="auto">
            <path fill={dark} fillRule="evenodd" d={MARK_MAIN_PATH} />
            <path fill={dark} fillOpacity={MARK_STREAK_OPACITY} fillRule="evenodd" d={MARK_STREAK_PATH} />
          </svg>
        </>
      ) : null}
    </svg>
  );
};
