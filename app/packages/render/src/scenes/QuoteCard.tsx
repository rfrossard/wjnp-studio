import React from "react";
import { Enter, FitText, Rule, type SceneProps } from "../common";

export const QuoteCard: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "quote_card") return null;
  const c = geo.content;
  const mark = (
    <Enter i={0} tokens={tokens} dist={20}>
      <div style={{ fontFamily: tokens.type.display, fontSize: geo.isV ? 300 : 420, lineHeight: 0.7, height: geo.isV ? 150 : 260, color: theme.accentText, fontWeight: 700 }}>“</div>
    </Enter>
  );
  const attrib = (w: number) => (
    <Enter i={3} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <FitText text={o.attribution} width={w} height={80} maxFont={geo.isV ? 50 : 48} minFont={28} tokens={tokens} color={theme.fg} weight={650} maxLines={2} />
      <FitText text={o.sourceLabel} width={w} height={50} maxFont={34} minFont={24} tokens={tokens} color={theme.muted} weight={450} maxLines={1} />
    </Enter>
  );
  if (geo.isV) {
    const quoteH = c.h - 150 - 40 - 200 - 40;
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 40 }}>
        {mark}
        <Enter i={1} tokens={tokens}>
          <FitText text={o.quote} width={c.w} height={quoteH} maxFont={104} minFont={40} role="display" italic weight={500} tokens={tokens} color={theme.fg} lineHeight={1.12} />
        </Enter>
        <Rule tokens={tokens} delay={4} color={theme.accent} length={160} thickness={8} />
        {attrib(c.w)}
      </div>
    );
  }
  const leftW = 300;
  const rightW = c.w - leftW - 60;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: 60 }}>
      <div style={{ width: leftW, display: "flex", flexDirection: "column", alignItems: "flex-start" }}>{mark}</div>
      <div style={{ width: rightW, display: "flex", flexDirection: "column", gap: 40 }}>
        <Enter i={1} tokens={tokens}>
          <FitText text={o.quote} width={rightW} height={c.h - 260} maxFont={124} minFont={40} role="display" italic weight={500} tokens={tokens} color={theme.fg} lineHeight={1.12} />
        </Enter>
        <Rule tokens={tokens} delay={4} color={theme.accent} length={160} thickness={8} />
        {attrib(rightW)}
      </div>
    </div>
  );
};
