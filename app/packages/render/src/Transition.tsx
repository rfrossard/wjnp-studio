/**
 * Scene-to-scene transition component.
 * Wraps the outgoing and incoming scene with the transition chosen
 * by the episode's design preset.
 */
import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { EASE } from "./brand/tokens";
import type { TransitionKind } from "./brand/presets";

interface TransitionProps {
  kind: TransitionKind;
  /** Total transition duration in frames (applied symmetrically: half out, half in). */
  durationFrames: number;
  /** Frame 0 = start of transition. */
  outgoing: React.ReactNode;
  incoming: React.ReactNode;
  width: number;
  height: number;
}

export const SceneTransition: React.FC<TransitionProps> = ({ kind, durationFrames, outgoing, incoming, width, height }) => {
  const frame = useCurrentFrame();
  const half = durationFrames / 2;
  // progress 0→1 over the full transition
  const p = Math.min(1, frame / durationFrames);

  if (kind === "cut") {
    // No transition — just snap
    return <AbsoluteFill>{p < 0.5 ? outgoing : incoming}</AbsoluteFill>;
  }

  if (kind === "dissolve") {
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ opacity: 1 - p }}>{outgoing}</AbsoluteFill>
        <AbsoluteFill style={{ opacity: p }}>{incoming}</AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (kind === "slide") {
    // Incoming slides in from right; outgoing slides out to left
    const eased = interpolate(p, [0, 1], [0, 1], { easing: EASE.inOut });
    return (
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <AbsoluteFill style={{ transform: `translateX(${-eased * width}px)` }}>{outgoing}</AbsoluteFill>
        <AbsoluteFill style={{ transform: `translateX(${(1 - eased) * width}px)` }}>{incoming}</AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (kind === "zoom") {
    // Outgoing scales up and fades; incoming starts scaled down and grows
    const eased = interpolate(p, [0, 1], [0, 1], { easing: EASE.out });
    const scaleOut = 1 + eased * 0.08;
    const scaleIn  = 0.94 + eased * 0.06;
    return (
      <AbsoluteFill>
        <AbsoluteFill style={{ transform: `scale(${scaleOut})`, opacity: 1 - p }}>{outgoing}</AbsoluteFill>
        <AbsoluteFill style={{ transform: `scale(${scaleIn})`,  opacity: p }}>{incoming}</AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (kind === "wipe") {
    // Hard-edge horizontal wipe from left to right
    const eased = interpolate(p, [0, 1], [0, 1], { easing: EASE.inOut });
    const x = eased * width;
    return (
      <AbsoluteFill>
        <AbsoluteFill>{outgoing}</AbsoluteFill>
        <AbsoluteFill style={{ clipPath: `inset(0 0 0 ${x}px)`, transform: `translateX(-${x}px)` }}>
          <AbsoluteFill style={{ transform: `translateX(${x}px)` }}>{incoming}</AbsoluteFill>
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  // Fallback: dissolve
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ opacity: 1 - p }}>{outgoing}</AbsoluteFill>
      <AbsoluteFill style={{ opacity: p }}>{incoming}</AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Frames to reserve at the boundary between two scenes for the transition. */
export const TRANSITION_FRAMES: Record<TransitionKind, number> = {
  cut:     0,
  dissolve:12,
  slide:   18,
  zoom:    16,
  wipe:    14,
};
