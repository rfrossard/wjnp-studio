import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";
import { fitShared } from "../layout-check";

export const Bullets: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "bullets") return null;
  const c = geo.content;
  const n = o.bullets.length;
  const colGap = 80;
  const headW = geo.isV ? c.w : Math.round(c.w * 0.38);
  const listW = geo.isV ? c.w : c.w - headW - colGap;
  const headH = geo.isV ? Math.round(c.h * 0.26) : c.h - 20;
  const listH = geo.isV ? c.h - headH - 40 : c.h;
  const numW = geo.isV ? 120 : 150;
  const textW = listW - numW - 24;
  const rowH = (listH - (n - 1) * 0) / n;
  const font = fitShared(o.bullets, textW, rowH - 40, { maxFont: geo.isV ? 62 : 64, minFont: 30, lineHeight: 1.18 });
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: geo.isV ? "column" : "row", gap: geo.isV ? 40 : colGap, alignItems: geo.isV ? "stretch" : "center" }}>
      <div style={{ width: headW, display: "flex", flexDirection: "column", gap: 28 }}>
        <Rule tokens={tokens} delay={0} color={theme.accent} length={140} thickness={10} />
        <Enter i={0} tokens={tokens}>
          <FitText text={o.headline} width={headW} height={headH - 40} maxFont={geo.isV ? 112 : 110} minFont={46} role="display" tokens={tokens} color={theme.fg} lineHeight={1.05} />
        </Enter>
      </div>
      <div style={{ width: listW, height: listH, display: "flex", flexDirection: "column" }}>
        {o.bullets.map((b, i) => (
          <Enter key={i} i={1 + i} tokens={tokens} style={{ height: rowH, borderTop: `3px solid ${theme.rule}`, display: "flex", alignItems: "center", gap: 24, boxSizing: "border-box" }}>
            <div style={{ width: numW, flex: "none", fontFamily: tokens.type.display, fontSize: geo.isV ? 84 : 92, fontWeight: 650, color: theme.accentText, lineHeight: 1 }}>{String(i + 1).padStart(2, "0")}</div>
            <FitText text={b} width={textW} height={rowH - 30} maxFont={font} minFont={font} fontSize={font} tokens={tokens} color={theme.fg} weight={550} lineHeight={1.18} />
          </Enter>
        ))}
      </div>
    </div>
  );
};
