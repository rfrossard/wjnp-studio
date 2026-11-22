/**
 * task_flow (owner reference 2026-11-21, adapted from the "seven occupations, one method" scene).
 *
 * One or two occupations. Each is a sequence of tasks drawn on two lanes, person and agent. A task is
 * marked solid on the lane of whoever does it better and as a pale outline on the other lane. The
 * agent lane is drawn shorter, so the gap at its end reads as time saved. With two occupations the
 * scene splits its time between them. Always labelled as an illustrative split.
 *
 * Vertical: lanes are two columns and time runs downward. Horizontal: lanes are two rows and time
 * runs to the right.
 */
import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { Enter, FitText, type SceneProps } from "../common";
import { sceneFrames } from "../model";

const HUMAN = { fill: "#F2EAD8", ink: "#1D2F46" };
const AGENT = { fill: "#2F5BD3", ink: "#FFFFFF" };
const AGENT_SCALE = 0.62; // agent cards are shorter: the lane ends sooner

type Task = { label: string; best: "human" | "agent" };

const Card: React.FC<{
  task: Task;
  lane: "human" | "agent";
  w: number;
  h: number;
  font: number;
  tokens: SceneProps["tokens"];
  delay: number;
}> = ({ task, lane, w, h, font, tokens, delay }) => {
  const frame = useCurrentFrame();
  const best = task.best === lane;
  const c = lane === "human" ? HUMAN : AGENT;
  // the solid colour arrives a beat after the card: first "both can do it", then "who does it better"
  const solid = best ? interpolate(frame, [delay + 10, delay + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) : 0;
  const appear = interpolate(frame, [delay, delay + 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div
      style={{
        width: w,
        height: h,
        boxSizing: "border-box",
        borderRadius: 8,
        border: `3px solid ${best ? c.fill : "rgba(242,234,216,0.35)"}`,
        background: best ? `rgba(${lane === "human" ? "242,234,216" : "47,91,211"},${solid})` : "rgba(242,234,216,0.06)",
        boxShadow: best ? `0 ${6 * solid}px ${14 * solid}px rgba(0,0,0,${0.35 * solid})` : "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 14px",
        opacity: appear,
        transform: `translateY(${(1 - appear) * 14}px)`,
      }}
    >
      <FitText
        text={task.label}
        width={w - 28}
        height={h - 8}
        maxFont={font}
        minFont={font}
        fontSize={font}
        tokens={tokens}
        color={best && solid > 0.5 ? c.ink : "rgba(242,234,216,0.72)"}
        weight={best ? 700 : 500}
        align="center"
        lineHeight={1.12}
      />
    </div>
  );
};

export const TaskFlow: React.FC<SceneProps> = ({ scene, geo, theme, tokens }) => {
  const o = scene.onScreen;
  const frame = useCurrentFrame();
  if (o.template !== "task_flow") return null;
  const c = geo.content;
  const total = sceneFrames(scene);
  // a short glimpse (teaser beat under 10 s) shows only the first occupation, fully drawn
  const n = total < 300 ? 1 : o.occupations.length;
  const slot = total / n;
  const idx = Math.min(n - 1, Math.floor(frame / slot));
  const occ = o.occupations[idx]!;
  const local = frame - idx * slot;
  // cross-fade between occupations
  // cross-fade only at the switch between occupations; the last one stays drawn up to the join
  const fadeIn = idx > 0 ? interpolate(local, [0, 10], [0, 1], { extrapolateRight: "clamp" }) : 1;
  const fadeOut = idx < n - 1 ? interpolate(local, [slot - 10, slot], [1, 0], { extrapolateLeft: "clamp" }) : 1;
  const fade = Math.min(fadeIn, fadeOut);
  const base = idx * slot; // card delays are relative to the occupation's own start
  const step = Math.max(6, Math.min(16, Math.floor((slot * 0.45) / occ.tasks.length)));

  const headH = geo.isV ? 92 : 70;
  const nameH = geo.isV ? 92 : 64;
  const labelH = geo.isV ? 44 : 38;
  const legendH = geo.isV ? 44 : 36;
  const font = geo.isV ? 30 : 22;
  const top = c.y + (o.headline ? headH + 12 : 0);

  const legend = (
    <div style={{ display: "flex", gap: 26, alignItems: "center", fontFamily: tokens.type.text, fontSize: geo.isV ? 30 : 22, color: theme.muted }}>
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}><i style={{ width: 22, height: 22, background: HUMAN.fill, borderRadius: 4 }} />Person does it better</span>
      <span style={{ display: "flex", gap: 10, alignItems: "center" }}><i style={{ width: 22, height: 22, background: AGENT.fill, borderRadius: 4 }} />Agent does it better</span>
    </div>
  );

  let lanes: React.ReactNode;
  if (geo.isV) {
    const gap = 28;
    const colW = (c.w - gap) / 2;
    const avail = c.y + c.h - (top + nameH + labelH) - legendH - 30;
    const rowGap = 12;
    const cardH = Math.min(130, (avail - rowGap * (occ.tasks.length - 1)) / occ.tasks.length);
    const agentH = cardH * AGENT_SCALE;
    const humanEnd = occ.tasks.length * cardH + (occ.tasks.length - 1) * rowGap;
    const agentEnd = occ.tasks.length * agentH + (occ.tasks.length - 1) * rowGap;
    const savedP = interpolate(local, [step * occ.tasks.length + 20, step * occ.tasks.length + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    lanes = (
      <div style={{ position: "absolute", left: c.x, top: top + nameH, width: c.w }}>
        {(["human", "agent"] as const).map((lane, k) => (
          <div key={lane} style={{ position: "absolute", left: k * (colW + gap), top: 0, width: colW }}>
            <div style={{ height: labelH, fontFamily: tokens.type.text, fontWeight: 700, fontSize: 30, letterSpacing: "0.06em", color: lane === "human" ? HUMAN.fill : "#8FA9F0" }}>{lane === "human" ? "PERSON" : "AI AGENT"}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: rowGap }}>
              {occ.tasks.map((t, j) => (
                <Card key={j} task={t} lane={lane} w={colW} h={lane === "human" ? cardH : agentH} font={font} tokens={tokens} delay={base + 8 + j * step} />
              ))}
            </div>
          </div>
        ))}
        {/* time saved: from the end of the agent lane to the end of the person lane */}
        <div style={{ position: "absolute", left: colW + gap + colW / 2 - 2, top: labelH + agentEnd + 14, height: Math.max(0, (humanEnd - agentEnd - 20) * savedP), width: 4, background: "#8FB09A" }} />
        <div style={{ position: "absolute", left: colW + gap, width: colW, top: labelH + agentEnd + 14 + (humanEnd - agentEnd) / 2 - 22, textAlign: "center", opacity: savedP }}>
          <span style={{ background: theme.bg, padding: "4px 14px", fontFamily: tokens.type.text, fontWeight: 700, fontSize: 30, color: "#8FB09A" }}>time saved</span>
        </div>
        <div style={{ position: "absolute", left: 0, top: labelH + humanEnd + 26 }}>{legend}</div>
      </div>
    );
  } else {
    const labelW = 150;
    const rowW = c.w - labelW;
    const gap = 10;
    const cardW = (rowW - gap * (occ.tasks.length - 1)) / occ.tasks.length;
    const agentW = cardW * AGENT_SCALE;
    const cardH = 110;
    const savedP = interpolate(local, [step * occ.tasks.length + 20, step * occ.tasks.length + 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const agentEnd = occ.tasks.length * agentW + (occ.tasks.length - 1) * gap;
    lanes = (
      <div style={{ position: "absolute", left: c.x, top: top + nameH, width: c.w }}>
        {(["human", "agent"] as const).map((lane, k) => (
          <div key={lane} style={{ position: "absolute", left: 0, top: k * (cardH + 40), width: c.w, display: "flex", alignItems: "center" }}>
            <div style={{ width: labelW, fontFamily: tokens.type.text, fontWeight: 700, fontSize: 22, letterSpacing: "0.06em", color: lane === "human" ? HUMAN.fill : "#8FA9F0" }}>{lane === "human" ? "PERSON" : "AI AGENT"}</div>
            <div style={{ display: "flex", gap }}>
              {occ.tasks.map((t, j) => (
                <Card key={j} task={t} lane={lane} w={lane === "human" ? cardW : agentW} h={cardH} font={font} tokens={tokens} delay={base + 8 + j * step} />
              ))}
            </div>
          </div>
        ))}
        <div style={{ position: "absolute", left: labelW + agentEnd + 14, top: cardH + 40 + cardH / 2 - 2, height: 4, width: Math.max(0, (rowW - agentEnd - 24) * savedP), background: "#8FB09A" }} />
        <div style={{ position: "absolute", left: labelW + agentEnd + 14, width: rowW - agentEnd - 24, top: cardH + 40 + cardH / 2 - 44, textAlign: "center", opacity: savedP, fontFamily: tokens.type.text, fontWeight: 700, fontSize: 22, color: "#8FB09A" }}>time saved</div>
        <div style={{ position: "absolute", left: 0, top: 2 * cardH + 40 + 30 }}>{legend}</div>
      </div>
    );
  }

  return (
    <div data-template="task_flow" style={{ position: "absolute", left: 0, top: 0, width: geo.W, height: geo.H }}>
      {o.headline ? (
        <Enter i={0} tokens={tokens} style={{ position: "absolute", left: c.x, top: c.y, width: c.w }}>
          <FitText text={o.headline} width={c.w} height={headH} maxFont={geo.isV ? 72 : 60} minFont={40} role="display" tokens={tokens} color={theme.fg} maxLines={1} />
        </Enter>
      ) : null}
      <div style={{ opacity: fade }}>
        <div style={{ position: "absolute", left: c.x, top, width: c.w, height: nameH, display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <span style={{ fontFamily: tokens.type.display, fontWeight: 700, fontSize: geo.isV ? 50 : 40, color: theme.fg }}>{occ.name}</span>
          <span style={{ fontFamily: tokens.type.text, fontSize: geo.isV ? 28 : 20, color: theme.muted, border: `2px solid ${theme.muted}`, borderRadius: 16, padding: "2px 12px" }}>{o.note}</span>
        </div>
        {lanes}
      </div>
    </div>
  );
};
