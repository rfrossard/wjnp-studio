/**
 * Press clippings (owner request 2026-11-21): headline screenshots shown as paper clippings over the
 * scene's picture, one after another during the first part of the scene, then they slide away so the
 * illustration and the text stay readable for the rest of the narration.
 */
import React from "react";
import { Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import type { Scene } from "@wjnp/contracts";
import type { Geometry } from "./layout";
import type { ResolvedAssets } from "./model";
import { sceneFrames } from "./model";
import { papercutLayout } from "./papercut";
import type { DesignTokens } from "./brand/tokens";

type Press = { image: string; credit: string };

export const pressOf = (scene: Scene): Press[] => ((scene as { press?: Press[] }).press ?? []);

export const PressClippings: React.FC<{ scene: Scene; geo: Geometry; resolved: ResolvedAssets; tokens: DesignTokens }> = ({ scene, geo, resolved, tokens }) => {
  const frame = useCurrentFrame();
  const items = pressOf(scene).filter((p) => resolved.images?.[p.image]);
  if (!items.length) return null;
  const total = sceneFrames(scene);
  // clippings use the first 70% of the scene, at least 3 s each when the scene allows it
  const span = Math.min(total * 0.7, Math.max(90 * items.length, total * 0.5));
  const each = span / items.length;
  const k = Math.floor(frame / each);
  if (k >= items.length) return null;
  const p = items[k]!;
  const local = frame - k * each;
  const inP = interpolate(local, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outP = interpolate(local, [each - 10, each], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const box = papercutLayout(geo).picture;
  const maxW = geo.isV ? 800 : box.w - 140;
  const maxH = box.h - 160;
  const tilt = (k % 2 === 0 ? -2.2 : 1.8) * (1 - 0.3 * inP);
  const cx = box.x + box.w / 2;
  const cy = box.y + box.h / 2 + 30;
  return (
    <div
      style={{
        position: "absolute",
        left: cx,
        top: cy,
        transform: `translate(-50%,-50%) translateY(${(1 - inP) * 60 - outP * 40}px) rotate(${tilt}deg) scale(${0.94 + 0.06 * inP})`,
        opacity: inP * (1 - outP),
        background: "#FFFFFF",
        padding: 14,
        boxShadow: "0 18px 40px rgba(0,0,0,0.45), 0 2px 0 rgba(0,0,0,0.15)",
        borderRadius: 2,
      }}
    >
      <Img src={staticFile(resolved.images![p.image]!)} style={{ display: "block", maxWidth: maxW, maxHeight: maxH, objectFit: "contain" }} />
      <div style={{ marginTop: 10, fontFamily: tokens.type.text, fontSize: 22, color: "#3A3F47", letterSpacing: "0.01em" }}>{p.credit}</div>
    </div>
  );
};
