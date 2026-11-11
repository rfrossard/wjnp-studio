import { describe, expect, it } from "vitest";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DESIGN_RULES } from "@wjnp/contracts";
import { loadStyleLibrary, planStyles, type StylePlanInput } from "../src/styles.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
const lib = loadStyleLibrary(root);
const SCENES = ["title_hook", "statement", "stat", "comparison", "timeline", "bullets", "personal_take", "end_card"].map((t, i) => ({ id: `s${i + 1}`, template: t }));
const plan = (p: Partial<StylePlanInput>) => planStyles(lib, { topicWords: [], tone: "conversational", scenes: SCENES, allowDraft: true, ...p });

describe("style library", () => {
  it("has 37 styles (36 + papercut, 2026-11-10), unique ids, valid templates and transitions", () => {
    expect(lib).toHaveLength(37);
    expect(new Set(lib.map((s) => s.id)).size).toBe(37);
    for (const s of lib) {
      expect(s.templates.length).toBeGreaterThan(0);
      expect(s.strongFor.every((t) => s.templates.includes(t))).toBe(true);
      expect(s.transitions.in.length && s.transitions.out.length).toBeTruthy();
      expect(s.requiredTraits.length).toBeGreaterThanOrEqual(3);
    }
  });
  it("only native styles may claim the personal-brand palette", () => {
    for (const s of lib.filter((x) => x.brandSafe)) expect(s.engine).toBe("wjnp");
  });
});

describe("planStyles", () => {
  it("is deterministic", () => {
    const a = plan({ topicWords: ["architecture", "system"], tone: "analytical" });
    expect(plan({ topicWords: ["architecture", "system"], tone: "analytical" })).toEqual(a);
  });
  it("respects the variety budget", () => {
    for (const tone of ["formal", "analytical", "conversational", "energetic", "playful"] as const) {
      const p = plan({ topicWords: ["data", "story", "launch"], tone });
      expect(new Set(p.scenes.map((s) => s.style)).size).toBeLessThanOrEqual(DESIGN_RULES.maxStyles);
    }
  });
  it("keeps the bookends in the base style", () => {
    const p = plan({ topicWords: ["research", "benchmark"], tone: "analytical" });
    expect(p.scenes[0]!.style).toBe(p.base);
    expect(p.scenes[p.scenes.length - 1]!.style).toBe(p.base);
  });
  it("caps optional accents at 40% of scenes; gaps the base cannot draw are always filled", () => {
    const p = plan({ topicWords: ["process", "pipeline", "data"], tone: "conversational" });
    const optional = p.scenes.filter((s) => s.style !== p.base && !/cannot draw/.test(s.why));
    expect(optional.length).toBeLessThanOrEqual(Math.floor(SCENES.length * 0.4));
  });
  it("gives the base at least half the scenes' templates", () => {
    for (const [w, tone] of [[["launch", "release"], "energetic"], [["science"], "conversational"], [["architecture"], "formal"]] as const) {
      const p = plan({ topicWords: [...w], tone });
      const base = lib.find((s) => s.id === p.base)!;
      expect(SCENES.filter((x) => base.templates.includes(x.template)).length / SCENES.length).toBeGreaterThanOrEqual(0.5);
    }
  });
  it("only puts a scene on a style that can draw its template, or flags it", () => {
    const p = plan({ topicWords: ["launch", "product", "release"], tone: "energetic" });
    for (const sc of p.scenes) {
      const st = lib.find((s) => s.id === sc.style)!;
      expect(st.templates.includes(sc.template) || (sc.drawAs && st.templates.includes(sc.drawAs)) || /UNCOVERED/.test(sc.why)).toBe(true);
    }
  });
  it("only brings in accents related to the topic", () => {
    const p = plan({ topicWords: ["architecture", "system", "infrastructure"], tone: "analytical" });
    for (const id of p.accents) expect(lib.find((s) => s.id === id)!.topics.some((t) => ["architecture", "system", "infrastructure"].some((w) => t.includes(w) || w.includes(t)))).toBe(true);
  });
  it("keeps accents coherent with the base", () => {
    const p = plan({ topicWords: ["system", "architecture", "timeline"], tone: "analytical" });
    const base = lib.find((s) => s.id === p.base)!;
    for (const id of p.accents) {
      const a = lib.find((s) => s.id === id)!;
      expect(Math.abs(a.formality - base.formality)).toBeLessThanOrEqual(1);
      expect(Math.abs(a.energy - base.energy)).toBeLessThanOrEqual(2);
      expect(a.family).not.toBe(base.family);
    }
  });
  it("follows the topic and the tone", () => {
    expect(plan({ topicWords: ["architecture", "system", "spec"], tone: "formal" }).base).toMatch(/blueprint|stroke/);
    expect(plan({ topicWords: ["launch", "announcement", "release"], tone: "playful" }).base).not.toMatch(/blueprint|manim|crt/);
  });
  it("rules out styles whose needs are not available, and says why", () => {
    const p = plan({ topicWords: ["interview", "podcast"], tone: "conversational" });
    expect(p.scenes.some((s) => ["archival", "podcast", "creator"].includes(s.style))).toBe(false);
    expect(p.excluded.find((e) => e.id === "archival")!.reason).toMatch(/footage/);
    const q = plan({ topicWords: ["interview", "podcast"], tone: "conversational", available: ["footage"], scenes: [{ id: "a", template: "clip" }, { id: "b", template: "quote_card" }] });
    expect(["archival", "podcast", "creator", "demo", "screencast", "broll", "blender"]).toContain(q.base);
  });
  it("excludes drafts unless allowed, and styles below the bar always", () => {
    const p = planStyles(lib, { topicWords: ["code"], tone: "analytical", scenes: SCENES });
    expect(p.scenes.some((s) => ["tron", "ascii", "crt", "risograph", "blueprint", "origami", "claymation", "synthwave"].includes(s.style))).toBe(false);
    expect(plan({ topicWords: ["games", "nostalgia"], tone: "playful" }).scenes.some((s) => s.style === "pixel" || s.style === "broll")).toBe(false);
  });
  it("restricts to engines that can render today", () => {
    const p = plan({ topicWords: ["code", "developer"], tone: "analytical", engines: ["wjnp"] });
    for (const s of p.scenes) expect(lib.find((x) => x.id === s.style)!.engine).toBe("wjnp");
  });
  it("hands off between styles with a shared transition, or a dip", () => {
    const p = plan({ topicWords: ["system", "architecture", "process"], tone: "analytical" });
    for (const j of p.joins) {
      const a = lib.find((s) => s.id === p.scenes.find((x) => x.sceneId === j.from)!.style)!;
      const b = lib.find((s) => s.id === p.scenes.find((x) => x.sceneId === j.to)!.style)!;
      if (a.id === b.id) expect(a.transitions.out).toContain(j.transition);
      else expect(j.transition === "dip" || (a.transitions.out.includes(j.transition) && b.transitions.in.includes(j.transition))).toBe(true);
    }
  });
});
