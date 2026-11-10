import React from "react";
import { OffthreadVideo, staticFile } from "remotion";
import { FPS } from "@wjnp/contracts";
import { Enter, FitText, type SceneProps } from "../common";
import { NEUTRALS } from "../brand/tokens";

export const Clip: React.FC<SceneProps> = ({ scene, geo, theme, tokens, resolved }) => {
  const o = scene.onScreen;
  if (o.template !== "clip") return null;
  const c = geo.content;
  const file = resolved.clips[o.clipAssetId];
  const vw = geo.isV ? c.w : Math.round(c.w * 0.64);
  const vh = Math.round((vw * 9) / 16);
  const startFrom = Math.round((o.startMs / 1000) * FPS);
  const endAt = Math.round((o.endMs / 1000) * FPS);
  const textW = geo.isV ? c.w : c.w - vw - 56;
  const video = (
    <Enter i={0} tokens={tokens} dist={24}>
      <div style={{ width: vw, height: vh, background: NEUTRALS.ink2, border: file ? "none" : `4px dashed ${NEUTRALS.grey500}`, boxSizing: "border-box", position: "relative", overflow: "hidden" }}>
        {file ? (
          <OffthreadVideo src={staticFile(file)} startFrom={startFrom} endAt={endAt} volume={0} style={{ width: vw, height: vh, objectFit: "cover" }} />
        ) : (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, padding: 40, textAlign: "center" }}>
            <div style={{ fontFamily: tokens.type.text, fontSize: 40, fontWeight: 700, letterSpacing: "0.12em", color: theme.accentText }}>CLIP PLACEHOLDER</div>
            <div style={{ fontFamily: tokens.type.text, fontSize: 30, fontWeight: 450, color: NEUTRALS.grey300, overflowWrap: "anywhere" }}>
              asset “{o.clipAssetId}” not available · {(o.startMs / 1000).toFixed(1)}s–{(o.endMs / 1000).toFixed(1)}s
            </div>
          </div>
        )}
      </div>
    </Enter>
  );
  const text = (
    <Enter i={2} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: 14, width: textW }}>
      <FitText text={o.attribution} width={textW} height={110} maxFont={geo.isV ? 56 : 54} minFont={28} tokens={tokens} color={theme.fg} weight={650} maxLines={2} />
      <FitText text={o.sourceLabel} width={textW} height={60} maxFont={36} minFont={24} tokens={tokens} color={theme.muted} weight={450} maxLines={2} />
    </Enter>
  );
  if (geo.isV) {
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "center", gap: 48 }}>
        {video}
        <div style={{ width: 160, height: 8, background: theme.accent }} />
        {text}
      </div>
    );
  }
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", gap: 56 }}>
      {video}
      <div style={{ display: "flex", flexDirection: "column", gap: 36 }}>
        <div style={{ width: 160, height: 8, background: theme.accent }} />
        {text}
      </div>
    </div>
  );
};
