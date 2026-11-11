import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";

export const PersonalTake: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "personal_take") return null;
  const c = geo.content;
  // Owner rule (2026-11-10): reflections are not announced as "My take". The scene shows the idea
  // itself; the accent rule is the only mark that the voice has turned to reflection.
  if (geo.isV) {
    const bodyH = o.body ? 300 : 0;
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
        <Rule tokens={tokens} delay={1} color={theme.accent} length={Math.round(c.w * 0.3)} thickness={8} />
        <Enter i={2} tokens={tokens}>
          <FitText text={o.headline} width={c.w} height={c.h - bodyH - 120} maxFont={132} minFont={52} role="display" tokens={tokens} color={theme.fg} lineHeight={1.06} />
        </Enter>
        {o.body ? (
          <Enter i={4} tokens={tokens}>
            <FitText text={o.body} width={c.w} height={bodyH} maxFont={54} minFont={30} tokens={tokens} color={theme.muted} weight={450} lineHeight={1.3} />
          </Enter>
        ) : null}
      </div>
    );
  }
  const rightW = c.w - 40 - 6;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: 40 }}>
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
