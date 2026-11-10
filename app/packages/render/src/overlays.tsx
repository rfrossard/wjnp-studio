import React, { useMemo } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import type { Scene } from "@wjnp/contracts";
import { NEUTRALS } from "./brand/tokens";
import { Mark } from "./brand/Mark";
import { activeChunk, captionWords, chunkCaptions } from "./captions";
import type { SceneProps, Theme } from "./common";
import { fitText, textWidth } from "./layout-check";
import { scenePublishers } from "./model";

/** Source chip text, shortened until it fits one line. */
export function chipText(publishers: string[], boxWidth: number, fontSize: number): string {
  const room = boxWidth - 64;
  for (let n = Math.min(3, publishers.length); n >= 1; n--) {
    const more = publishers.length - n;
    const t = `Source: ${publishers.slice(0, n).join(" · ")}${more > 0 ? ` +${more}` : ""}`;
    if (textWidth(t, fontSize, "text") <= room) return t;
  }
  let t = `Source: ${publishers[0] ?? ""}`;
  while (t.length > 9 && textWidth(t + "…", fontSize, "text") > room) t = t.slice(0, -1);
  return t === `Source: ${publishers[0] ?? ""}` ? t : t + "…";
}

export const SourceChip: React.FC<SceneProps> = ({ scene, episode, geo, theme, tokens }) => {
  const pubs = scenePublishers(episode, scene);
  const frame = useCurrentFrame();
  if (!pubs.length) return null;
  const fs = geo.isV ? 26 : 26;
  const text = chipText(pubs, geo.chip.w, fs);
  const o = interpolate(frame, [12, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      data-overlay="source-chip"
      style={{
        position: "absolute",
        left: geo.chip.x,
        top: geo.chip.y,
        height: geo.chip.h,
        maxWidth: geo.chip.w,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "0 22px",
        boxSizing: "border-box",
        background: theme.panel,
        border: `2px solid ${theme.rule}`,
        borderRadius: 4,
        fontFamily: tokens.type.text,
        fontSize: fs,
        fontWeight: 500,
        color: theme.fg,
        whiteSpace: "nowrap",
        overflow: "hidden",
        opacity: o,
      }}
    >
      <span style={{ width: 12, height: 12, background: theme.accent, flex: "none" }} />
      {text}
    </div>
  );
};

export function captionFont(isV: boolean) {
  return isV ? { max: 46, min: 34, maxChars: 62 } : { max: 44, min: 32, maxChars: 84 };
}

export const Captions: React.FC<SceneProps & { captionStyle?: "box" | "shadow" }> = ({ scene, geo, theme, tokens, captionStyle = "box" }) => {
  const frame = useCurrentFrame();
  const cfg = captionFont(geo.isV);
  const padX = 32;
  const innerW = geo.captions.w - padX * 2;
  const innerH = geo.captions.h - 14;
  const { chunks, fontSize } = useMemo(() => {
    const chunks = chunkCaptions(captionWords(scene), cfg.maxChars);
    // one shared font size per scene, so captions do not jump around
    const fontSize = Math.min(...chunks.map((c) => fitText({ text: c.text, boxWidth: innerW, boxHeight: innerH, maxFont: cfg.max, minFont: cfg.min, lineHeight: 1.22, maxLines: 2 }).fontSize), cfg.max);
    return { chunks, fontSize };
  }, [scene, innerW, innerH, cfg.max, cfg.min, cfg.maxChars]);
  const chunk = activeChunk(chunks, frame);

  if (captionStyle === "shadow") {
    // No box — white text with a multi-layer shadow so it reads on any background color.
    const shadow = [
      "0 0 4px rgba(0,0,0,0.9)",
      "0 0 8px rgba(0,0,0,0.85)",
      "0 2px 12px rgba(0,0,0,0.8)",
      "0 0 24px rgba(0,0,0,0.6)",
    ].join(", ");
    const activeShadow = [
      "0 0 6px rgba(0,0,0,0.9)",
      "0 0 12px rgba(0,0,0,0.85)",
      "0 2px 20px rgba(0,0,0,0.8)",
    ].join(", ");
    return (
      <div
        data-overlay="captions"
        style={{
          position: "absolute",
          left: geo.captions.x,
          top: geo.captions.y,
          width: geo.captions.w,
          height: geo.captions.h,
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          padding: `0 ${padX}px`,
          opacity: chunk ? 1 : 0,
        }}
      >
        {chunk ? (
          <div style={{ width: innerW, fontFamily: tokens.type.text, fontSize, lineHeight: 1.22, fontWeight: 700, color: NEUTRALS.paper, overflowWrap: "break-word", textShadow: shadow }}>
            {chunk.words.map((w, i) => {
              const active = frame >= w.startFrame && frame < Math.max(w.endFrame, w.startFrame + 1);
              return (
                <span key={i} style={{ color: active ? theme.accentText : NEUTRALS.paper, textShadow: active ? activeShadow : shadow }}>
                  {w.w}
                  {i < chunk.words.length - 1 ? " " : ""}
                </span>
              );
            })}
          </div>
        ) : null}
      </div>
    );
  }

  // Default: opaque ink box so it stays legible on light and dark scenes.
  return (
    <div
      data-overlay="captions"
      style={{
        position: "absolute",
        left: geo.captions.x,
        top: geo.captions.y,
        width: geo.captions.w,
        height: geo.captions.h,
        boxSizing: "border-box",
        background: NEUTRALS.ink,
        border: theme.tone === "dark" ? `2px solid ${NEUTRALS.grey700}` : "none",
        borderRadius: 4,
        display: "flex",
        alignItems: "center",
        padding: `0 ${padX}px`,
        opacity: chunk ? 1 : 0,
      }}
    >
      {chunk ? (
        <div style={{ width: innerW, fontFamily: tokens.type.text, fontSize, lineHeight: 1.22, fontWeight: 600, color: NEUTRALS.paper, overflowWrap: "break-word" }}>
          {chunk.words.map((w, i) => {
            const active = frame >= w.startFrame && frame < Math.max(w.endFrame, w.startFrame + 1);
            return (
              <span key={i} style={{ color: active ? lightAccent(theme) : NEUTRALS.paper }}>
                {w.w}
                {i < chunk.words.length - 1 ? " " : ""}
              </span>
            );
          })}
        </div>
      ) : null}
    </div>
  );
};

function lightAccent(theme: Theme): string {
  // accent text on the ink caption plate (not the scene background)
  return theme.tone === "dark" ? theme.accentText : accentOnInk(theme.accent);
}
import { ensureContrast } from "./brand/tokens";
function accentOnInk(accent: string) {
  return ensureContrast(accent, NEUTRALS.ink, 5);
}

/** Thin accent progress line across the whole episode. */
export const Progress: React.FC<{ globalFrame: number; total: number; rect: { x: number; y: number; w: number; h: number }; accent: string; track: string }> = ({ globalFrame, total, rect, accent, track }) => (
  <div data-overlay="progress" style={{ position: "absolute", left: rect.x, top: rect.y, width: rect.w, height: rect.h, background: track }}>
    <div style={{ width: `${Math.min(100, ((globalFrame + 1) / total) * 100)}%`, height: "100%", background: accent }} />
  </div>
);

/**
 * The brand mark, very small, on every scene's footer. Identity without the name:
 * the name itself belongs to the end card only.
 */
export const FooterMark: React.FC<SceneProps> = ({ geo, theme }) => (
  <div
    data-overlay="footer-mark"
    style={{
      position: "absolute",
      left: geo.footerMark.x,
      top: geo.footerMark.y,
      width: geo.footerMark.w,
      height: geo.footerMark.h,
      lineHeight: 0,
      opacity: 0.55,
    }}
  >
    <Mark size={geo.footerMark.w} color={theme.muted} />
  </div>
);

export type { Scene };
