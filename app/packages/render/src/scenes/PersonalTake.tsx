import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";

export const PersonalTake: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "personal_take") return null;
  const c = geo.content;
  const label = (
    <Enter i={0} tokens={tokens}>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 18, fontFamily: tokens.type.text, fontSize: 44, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: theme.accentText }}>
        <span style={{ width: 18, height: 18, background: theme.accent }} />
        My take
      </div>
    </Enter>
  );
  if (geo.isV) {
    const bodyH = o.body ? 300 : 0;
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
        {label}
        <Rule tokens={tokens} delay={3} color={theme.accent} length={c.w} thickness={6} />
        <Enter i={2} tokens={tokens}>
          <FitText text={o.headline} width={c.w} height={c.h - bodyH - 220} maxFont={132} minFont={52} role="display" tokens={tokens} color={theme.fg} lineHeight={1.06} />
        </Enter>
        {o.body ? (
          <Enter i={4} tokens={tokens}>
            <FitText text={o.body} width={c.w} height={bodyH} maxFont={54} minFont={30} tokens={tokens} color={theme.muted} weight={450} lineHeight={1.3} />
          </Enter>
        ) : null}
      </div>
    );
  }
  const leftW = 420;
  const rightW = c.w - leftW - 80 - 6;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: 40 }}>
      <div style={{ width: leftW }}>{label}</div>
      <Rule tokens={tokens} delay={3} color={theme.accent} length={c.h - 60} thickness={6} axis="y" />
      <div style={{ width: rightW, display: "flex", flexDirection: "column", gap: 36 }}>
        <Enter i={2} tokens={tokens}>
          <FitText text={o.headline} width={rightW} height={o.body ? c.h - 260 : c.h - 40} maxFont={124} minFont={52} role="display" tokens={tokens} color={theme.fg} lineHeight={1.06} />
        </Enter>
        {o.body ? (
          <Enter i={4} tokens={tokens}>
            <FitText text={o.body} width={rightW} height={190} maxFont={54} minFont={30} tokens={tokens} color={theme.muted} weight={450} lineHeight={1.3} />
          </Enter>
        ) : null}
      </div>
    </div>
  );
};
