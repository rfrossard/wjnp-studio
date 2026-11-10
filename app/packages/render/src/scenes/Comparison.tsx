import React from "react";
import { Enter, FitText, type SceneProps } from "../common";
import { fitShared } from "../layout-check";
import { NEUTRALS } from "../brand/tokens";

export const Comparison: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  if (o.template !== "comparison") return null;
  const c = geo.content;
  const headH = o.headline ? (geo.isV ? 130 : 110) : 0;
  const gap = geo.isV ? 28 : 40;
  const panelsH = c.h - headH - (o.headline ? 32 : 0);
  const cols = geo.isV ? 1 : 2;
  const rows = geo.isV ? 2 : 1;
  const panelW = (c.w - gap * (cols - 1)) / cols;
  const panelH = (panelsH - gap * (rows - 1)) / rows;
  const padX = 40;
  const innerW = panelW - padX * 2;
  const titleH = 84;
  const itemsH = panelH - titleH - 72;
  const allItems = [...o.left.items, ...o.right.items];
  const maxItems = Math.max(o.left.items.length, o.right.items.length);
  const itemFont = fitShared(allItems, innerW - 36, itemsH / maxItems - 14, { maxFont: geo.isV ? 64 : 68, minFont: 28, role: "text", lineHeight: 1.18 });
  const sides = [
    { side: o.left, focal: false },
    { side: o.right, focal: true },
  ];
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", gap: 32 }}>
      {o.headline ? (
        <Enter i={0} tokens={tokens}>
          <FitText text={o.headline} width={c.w} height={headH} maxFont={geo.isV ? 96 : 92} minFont={44} role="display" tokens={tokens} color={theme.fg} maxLines={1} />
        </Enter>
      ) : null}
      <div style={{ display: "flex", flexDirection: geo.isV ? "column" : "row", gap, flex: 1 }}>
        {sides.map(({ side, focal }, k) => (
          <Enter key={k} i={1 + k * 2} tokens={tokens} axis="y" style={{ width: panelW, height: panelH }}>
            <div style={{ width: panelW, height: panelH, boxSizing: "border-box", padding: `32px ${padX}px`, background: focal ? NEUTRALS.ink : theme.panel, borderTop: `10px solid ${focal ? theme.accent : theme.rule}`, display: "flex", flexDirection: "column", gap: 20 }}>
              <FitText text={side.title} width={innerW} height={titleH} maxFont={60} minFont={30} tokens={tokens} role="display" color={focal ? "#FFFFFF" : theme.muted} uppercase letterSpacing="0.04em" weight={700} maxLines={1} />
              <div style={{ display: "flex", flexDirection: "column", gap: 22, flex: 1, justifyContent: "center", paddingBottom: 24 }}>
                {side.items.map((it, j) => (
                  <Enter key={j} i={2 + k * 2 + j} tokens={tokens} style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
                    <span style={{ width: 14, height: 14, marginTop: itemFont * 0.4, background: focal ? theme.accent : NEUTRALS.grey500, flex: "none" }} />
                    <FitText text={it} width={innerW - 36} height={itemFont * 3} maxFont={itemFont} minFont={itemFont} fontSize={itemFont} tokens={tokens} color={focal ? NEUTRALS.paper : theme.fg} weight={focal ? 600 : 500} lineHeight={1.18} />
                  </Enter>
                ))}
              </div>
            </div>
          </Enter>
        ))}
      </div>
    </div>
  );
};
