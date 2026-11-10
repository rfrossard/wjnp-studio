import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";

export const Statement: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "statement") return null;
  const c = geo.content;
  if (geo.isV) {
    const bodyH = o.body ? 300 : 0;
    const headH = c.h - bodyH - 90;
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
        <Rule tokens={tokens} delay={0} color={theme.accent} length={160} thickness={10} />
        <Enter i={1} tokens={tokens}>
          <FitText text={o.headline} width={c.w} height={headH} maxFont={140} minFont={56} role="display" tokens={tokens} color={theme.fg} lineHeight={1.05} />
        </Enter>
        {o.body ? (
          <Enter i={3} tokens={tokens}>
            <FitText text={o.body} width={c.w} height={bodyH} maxFont={52} minFont={30} tokens={tokens} color={theme.muted} weight={450} lineHeight={1.3} />
          </Enter>
        ) : null}
      </div>
    );
  }
  const colGap = 72;
  const leftW = Math.round((c.w - colGap) * 0.58);
  const rightW = c.w - colGap - leftW - 10;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: colGap / 2 }}>
      <Enter i={0} tokens={tokens} style={{ width: leftW }}>
        <FitText text={o.headline} width={leftW} height={c.h - 40} maxFont={150} minFont={56} role="display" tokens={tokens} color={theme.fg} lineHeight={1.05} />
      </Enter>
      <Rule tokens={tokens} delay={2} color={theme.accent} length={Math.min(c.h - 40, 440)} thickness={10} axis="y" />
      {o.body ? (
        <Enter i={2} tokens={tokens} style={{ width: rightW }}>
          <FitText text={o.body} width={rightW} height={c.h - 40} maxFont={54} minFont={30} tokens={tokens} color={theme.muted} weight={450} lineHeight={1.3} />
        </Enter>
      ) : null}
    </div>
  );
};
