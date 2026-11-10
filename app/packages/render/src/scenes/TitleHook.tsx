import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";

export const TitleHook: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "title_hook") return null;
  const c = geo.content;
  const kickerH = 56;
  const ruleH = 10;
  const gap = geo.isV ? 40 : 36;
  const headW = geo.isV ? c.w : Math.round(c.w * 0.82);
  const headH = c.h - kickerH - ruleH - gap * 2;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap }}>
      {o.kicker ? (
        <Enter i={0} tokens={tokens}>
          <FitText text={o.kicker} width={c.w} height={kickerH} maxFont={geo.isV ? 38 : 38} minFont={26} tokens={tokens} color={theme.accentText} uppercase letterSpacing="0.08em" weight={600} maxLines={1} />
        </Enter>
      ) : null}
      <Rule tokens={tokens} delay={4} color={theme.accent} length={geo.isV ? 220 : 280} thickness={ruleH} />
      <Enter i={2} tokens={tokens} dist={36}>
        <FitText text={o.headline} width={headW} height={headH} maxFont={geo.isV ? 164 : 148} minFont={56} role="display" tokens={tokens} color={theme.fg} weight={650} lineHeight={1.04} />
      </Enter>
    </div>
  );
};
