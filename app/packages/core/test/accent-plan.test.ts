import { describe, expect, it } from "vitest";
import { buildPlan, DEFAULT_ACCENTS, DEFAULT_ROUTING, escalate, forbiddenHue, hexToOklchHue, pickAccent, sha256Hex } from "../src/index.ts";
import { golden } from "./helpers.ts";

describe("accent", () => {
  it("is deterministic sha256(id) mod n", () => {
    const a = pickAccent("2026-w46-agents-that-pay", DEFAULT_ACCENTS);
    expect(pickAccent("2026-w46-agents-that-pay", DEFAULT_ACCENTS)).toEqual(a);
    const idx = Number(BigInt("0x" + sha256Hex("2026-w46-agents-that-pay")) % BigInt(DEFAULT_ACCENTS.length));
    expect(a).toEqual(DEFAULT_ACCENTS[idx]);
    const seen = new Set(Array.from({ length: 40 }, (_, i) => pickAccent(`ep-${i}`, DEFAULT_ACCENTS).name));
    expect(seen.size).toBeGreaterThan(1);
  });
  it("computes OKLCH hue", () => {
    expect(hexToOklchHue("#FF0000")).toBeCloseTo(29.2, 0);
    expect(hexToOklchHue("#0000FF")).toBeCloseTo(264.1, 0);
    expect(forbiddenHue("#FF8800")?.name).toBe("orange");
    expect(forbiddenHue("#7B2CBF")?.name).toBe("purple");
    for (const a of DEFAULT_ACCENTS) expect(forbiddenHue(a.hex)).toBeUndefined();
  });
});

describe("plan", () => {
  it("builds one task per kind plus fill/critique/narrate per scene", () => {
    const ep = golden();
    const plan = buildPlan(ep, DEFAULT_ROUTING);
    const kinds = plan.tasks.filter((t) => !t.sceneId).map((t) => t.kind);
    expect(new Set(kinds).size).toBe(kinds.length);
    expect(plan.tasks.filter((t) => t.kind === "fill_scene")).toHaveLength(ep.scenes.length);
    expect(plan.tasks.filter((t) => t.kind === "narrate")).toHaveLength(ep.scenes.length);
    const ids = new Set(plan.tasks.map((t) => t.id));
    for (const t of plan.tasks) for (const d of t.dependsOn) expect(ids.has(d)).toBe(true);
    expect(plan.tasks.find((t) => t.id === "critique_scene.s03")?.dependsOn).toEqual(["fill_scene.s03"]);
    expect(plan.tasks.find((t) => t.kind === "verify_claims")?.model).toBe(DEFAULT_ROUTING.verifier.model);
    expect(plan.tasks.find((t) => t.kind === "fill_scene")?.tier).toBe(DEFAULT_ROUTING.tasks.fill_scene);
  });
  it("escalates up the ladder and records it", () => {
    const routing = { ...DEFAULT_ROUTING, tasks: { ...DEFAULT_ROUTING.tasks, fill_scene: "small" as const } };
    let plan = buildPlan(golden(), routing);
    plan = escalate(plan, "fill_scene.s02", "critic score 2", routing, new Date("2026-11-09T12:00:00Z"));
    const t = plan.tasks.find((x) => x.id === "fill_scene.s02")!;
    expect(t.tier).toBe("mid");
    expect(t.model).toBe(routing.tiers.mid!.model);
    expect(plan.escalations).toEqual([{ taskId: "fill_scene.s02", from: "small", to: "mid", reason: "critic score 2", at: "2026-11-09T12:00:00.000Z" }]);
    plan = escalate(plan, "fill_scene.s02", "again", routing);
    expect(() => escalate(plan, "fill_scene.s02", "top", routing)).toThrow(/top/);
    expect(() => escalate(plan, "render", "code tier", routing)).toThrow(/not on the escalation ladder/);
    expect(() => escalate(plan, "nope", "x", routing)).toThrow();
  });
});
