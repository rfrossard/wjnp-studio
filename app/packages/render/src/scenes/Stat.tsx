import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";
import { claimOf } from "../model";

export const Stat: React.FC<SceneProps> = ({ scene, episode, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "stat") return null;
  // The figure is read from the claim, never from props text.
  const display = claimOf(episode, o.claimId)?.value?.display ?? "—";
  const c = geo.content;
  if (geo.isV) {
    const figH = Math.round(c.h * 0.46);
    const labH = Math.round(c.h * 0.26);
    const ctxH = Math.round(c.h * 0.08);
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 30 }}>
        <Enter i={0} tokens={tokens} dist={40}>
          <FitText text={display} width={c.w} height={figH} maxFont={520} minFont={120} role="display" tokens={tokens} color={theme.accentText} weight={700} lineHeight={0.95} maxLines={1} letterSpacing="-0.03em" />
        </Enter>
        <Rule tokens={tokens} delay={4} color={theme.accent} length={c.w} thickness={6} />
        <Enter i={2} tokens={tokens}>
          <FitText text={o.label} width={c.w} height={labH} maxFont={66} minFont={34} tokens={tokens} color={theme.fg} weight={600} lineHeight={1.18} />
        </Enter>
        {o.context ? (
          <Enter i={3} tokens={tokens}>
            <FitText text={o.context} width={c.w} height={ctxH} maxFont={34} minFont={24} tokens={tokens} color={theme.muted} weight={450} maxLines={2} />
          </Enter>
        ) : null}
      </div>
    );
  }
  const colGap = 80;
  const leftW = Math.round(c.w * 0.5);
  const rightW = c.w - leftW - colGap - 6;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: colGap / 2 }}>
      <Enter i={0} tokens={tokens} dist={40} style={{ width: leftW }}>
        <FitText text={display} width={leftW} height={c.h - 20} maxFont={560} minFont={120} role="display" tokens={tokens} color={theme.accentText} weight={700} lineHeight={0.95} maxLines={1} letterSpacing="-0.03em" />
      </Enter>
      <Rule tokens={tokens} delay={4} color={theme.accent} length={c.h - 120} thickness={6} axis="y" />
      <div style={{ width: rightW, display: "flex", flexDirection: "column", gap: 28 }}>
        <Enter i={2} tokens={tokens}>
          <FitText text={o.label} width={rightW} height={Math.round(c.h * 0.55)} maxFont={72} minFont={34} tokens={tokens} color={theme.fg} weight={600} lineHeight={1.18} />
        </Enter>
        {o.context ? (
          <Enter i={3} tokens={tokens}>
            <FitText text={o.context} width={rightW} height={90} maxFont={34} minFont={24} tokens={tokens} color={theme.muted} weight={450} maxLines={2} />
          </Enter>
        ) : null}
      </div>
    </div>
  );
};
