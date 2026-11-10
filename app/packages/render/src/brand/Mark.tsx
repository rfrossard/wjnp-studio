import React from "react";
import { MARK_MAIN_PATH, MARK_STREAK_OPACITY, MARK_STREAK_PATH, MARK_VIEWBOX } from "./markPaths";

/** The silhouette mark (path data copied from brand/svg/mark_navy.svg: main path + 0.8 hair-streak path). */
export const Mark: React.FC<{ size: number; color: string }> = ({ size, color }) => (
  <svg width={size} height={size} viewBox={`0 0 ${MARK_VIEWBOX} ${MARK_VIEWBOX}`} role="img" aria-label="Roberto Frossard mark">
    <path fill={color} fillRule="evenodd" d={MARK_MAIN_PATH} />
    <path fill={color} fillOpacity={MARK_STREAK_OPACITY} fillRule="evenodd" d={MARK_STREAK_PATH} />
  </svg>
);
