import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";
import { fitShared } from "../layout-check";

export const Timeline: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "timeline") return null;
  const c = geo.content;
  const n = o.steps.length;
  const headH = o.headline ? (geo.isV ? 150 : 120) : 0;
  const bodyH = c.h - headH - (o.headline ? 36 : 0);
  const head = o.headline ? (
    <Enter i={0} tokens={tokens} axis={geo.isV ? "y" : "x"}>
      <FitText text={o.headline} width={c.w} height={headH} maxFont={geo.isV ? 92 : 88} minFont={44} role="display" tokens={tokens} color={theme.fg} lineHeight={1.05} maxLines={2} />
    </Enter>
  ) : null;
  if (geo.isV) {
    const rowH = bodyH / n;
    const textW = c.w - 150;
    const labFont = 38;
    const font = fitShared(o.steps.map((s) => s.text), textW, rowH - labFont * 1.4 - 24, { maxFont: 62, minFont: 28, lineHeight: 1.2 });
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", gap: 36 }}>
        {head}
        <div style={{ position: "relative", height: bodyH }}>
          <Rule tokens={tokens} delay={2} color={theme.rule} length={bodyH - rowH * 0.5} thickness={6} axis="y" style={{ position: "absolute", left: 21, top: rowH * 0.25 }} />
          {o.steps.map((s, i) => (
            <Enter key={i} i={1 + i} tokens={tokens} axis="y" style={{ position: "absolute", left: 0, top: i * rowH, width: c.w, height: rowH, display: "flex", gap: 40, alignItems: "flex-start" }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: theme.accent, flex: "none", marginTop: 4 }} />
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <FitText text={s.label} width={textW} height={labFont * 1.4} maxFont={labFont} minFont={labFont} tokens={tokens} color={theme.accentText} uppercase letterSpacing="0.08em" weight={700} maxLines={1} />
                <FitText text={s.text} width={textW} height={rowH - labFont * 1.4 - 24} maxFont={font} minFont={font} fontSize={font} tokens={tokens} color={theme.fg} weight={500} lineHeight={1.2} />
              </div>
            </Enter>
          ))}
        </div>
      </div>
    );
  }
  const colW = c.w / n;
  const textW = colW - 36;
  const labFont = 36;
  const font = fitShared(o.steps.map((s) => s.text), textW, Math.min(bodyH, 400) - 150, { maxFont: 64, minFont: 28, lineHeight: 1.2 });
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 64 }}>
      {head}
      <div style={{ position: "relative", height: Math.min(bodyH, 400) }}>
        <Rule tokens={tokens} delay={2} color={theme.rule} length={c.w} thickness={6} style={{ position: "absolute", left: 0, top: 21 }} />
        {o.steps.map((s, i) => (
          <Enter key={i} i={1 + i} tokens={tokens} axis="x" style={{ position: "absolute", left: i * colW, top: 0, width: colW }}>
            <div style={{ width: 48, height: 48, borderRadius: 24, background: theme.accent }} />
            <div style={{ marginTop: 36, display: "flex", flexDirection: "column", gap: 12, width: textW }}>
              <FitText text={s.label} width={textW} height={labFont * 1.4} maxFont={labFont} minFont={labFont} tokens={tokens} color={theme.accentText} uppercase letterSpacing="0.08em" weight={700} maxLines={1} />
              <FitText text={s.text} width={textW} height={Math.min(bodyH, 400) - 160} maxFont={font} minFont={font} fontSize={font} tokens={tokens} color={theme.fg} weight={500} lineHeight={1.2} />
            </div>
          </Enter>
        ))}
      </div>
    </div>
  );
};
