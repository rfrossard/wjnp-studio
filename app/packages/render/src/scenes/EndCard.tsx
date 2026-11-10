import React from "react";
import { PROFILE_URL, SERIES_NAME } from "@wjnp/contracts";
import { Mark } from "../brand/Mark";
import { Qr } from "../brand/Qr";
import { NEUTRALS } from "../brand/tokens";
import { Enter, FitText, Rule, type SceneProps } from "../common";

/** Fallback name; actual name comes from episode.design.narratorName */
export const DEFAULT_NARRATOR_NAME = "Roberto Frossard";
export const PROFILE_DISPLAY = PROFILE_URL.replace(/^https?:\/\/(www\.)?/, "");

export const EndCard: React.FC<SceneProps> = ({ scene, episode, geo, theme, tokens }) => {
  const NAME = (episode.design as any).narratorName ?? DEFAULT_NARRATOR_NAME;
  const o = scene.onScreen;
  if (o.template !== "end_card") return null;
  const c = geo.content;
  const disclaimer = episode.post?.disclaimer || "Views are my own.";
  const qrSize = geo.isV ? 292 : 327; // 14% smaller than the original 340 / 380
  // The series title carries this block; the name sits under it, deliberately quiet.
  const markSize = geo.isV ? 128 : 140;
  const identity = (w: number) => (
    <div style={{ display: "flex", alignItems: "center", gap: 20, width: w }}>
      <Enter i={0} tokens={tokens}>
        <Mark size={markSize} color={theme.muted} />
      </Enter>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <FitText text={SERIES_NAME} width={w - markSize - 20} height={52} maxFont={38} minFont={26} tokens={tokens} color={theme.accentText} weight={600} maxLines={1} />
        <FitText text={NAME} width={w - markSize - 20} height={34} maxFont={26} minFont={20} tokens={tokens} color={theme.muted} weight={500} maxLines={1} />
      </div>
    </div>
  );
  const qr = (
    <Enter i={3} tokens={tokens} style={{ width: qrSize, flex: "none" }}>
      <div style={{ background: NEUTRALS.white, padding: 14, lineHeight: 0, width: qrSize, boxSizing: "border-box" }}>
        <Qr text={PROFILE_URL} size={qrSize - 28} dark={NEUTRALS.ink} light={NEUTRALS.white} mark />
      </div>
    </Enter>
  );
  const linkBlock = (w: number) => (
    <Enter i={4} tokens={tokens} style={{ display: "flex", flexDirection: "column", gap: 16, width: w }}>
      <FitText text={PROFILE_DISPLAY} width={w} height={60} maxFont={44} minFont={24} tokens={tokens} color={theme.fg} weight={600} maxLines={1} />
      <FitText text={disclaimer} width={w} height={32} maxFont={24} minFont={18} tokens={tokens} color={theme.muted} weight={450} maxLines={1} />
    </Enter>
  );
  if (geo.isV) {
    return (
      <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        {identity(c.w)}
        <Rule tokens={tokens} delay={2} color={theme.accent} length={c.w} thickness={6} />
        <Enter i={2} tokens={tokens} style={{ flex: 1, display: "flex", alignItems: "center" }}>
          <FitText text={o.question} width={c.w} height={420} maxFont={96} minFont={40} role="display" tokens={tokens} color={theme.fg} lineHeight={1.08} />
        </Enter>
        <div style={{ display: "flex", gap: 40, alignItems: "flex-end" }}>
          {qr}
          {linkBlock(c.w - qrSize - 40)}
        </div>
      </div>
    );
  }
  const rightW = 560;
  const leftW = c.w - rightW - 80;
  return (
    <div style={{ position: "absolute", left: c.x, top: c.y, width: c.w, height: c.h, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ width: leftW, display: "flex", flexDirection: "column", gap: 44 }}>
        {identity(leftW)}
        <Rule tokens={tokens} delay={2} color={theme.accent} length={leftW} thickness={6} />
        <Enter i={2} tokens={tokens}>
          <FitText text={o.question} width={leftW} height={300} maxFont={96} minFont={40} role="display" tokens={tokens} color={theme.fg} lineHeight={1.08} />
        </Enter>
      </div>
      <div style={{ width: rightW, display: "flex", flexDirection: "column", gap: 28 }}>
        {qr}
        {linkBlock(rightW)}
      </div>
    </div>
  );
};
