import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import type { Plan } from "@wjnp/contracts";
import {
  EscalationExhaustedError,
  MockLLM,
  MockTTS,
  NarrationCache,
  Router,
  SchemaError,
  TaskValidationError,
  checkBudget,
  defaultRouting,
  narrationKey,
  parseRouting,
  sha256Hex,
  synthesizeCached,
} from "../src/index";
import { testRouter, tmpRoot } from "./helpers";

describe("narration cache", () => {
  it("key is sha256(voiceId \\n text \\n JSON(settings))", () => {
    expect(narrationKey("v", "hello", { a: 1 })).toBe(sha256Hex('v\nhello\n{"a":1}'));
  });

  it("a cache hit never calls TTS a second time", async () => {
    const dir = join(tmpRoot(), "episodes", "e1", "cache");
    const tts = new MockTTS();
    const args = { cache: new NarrationCache(dir), tts, voiceId: "voice-a", elevenVoiceId: "el", text: "one two three four", settings: { stability: 0.5 } };
    const first = await synthesizeCached(args);
    const second = await synthesizeCached({ ...args, cache: new NarrationCache(dir) }); // fresh object, same folder
    expect(first.hit).toBe(false);
    expect(second.hit).toBe(true);
    expect(tts.calls).toHaveLength(1);
    expect(second.entry.audio.equals(first.entry.audio)).toBe(true);
    expect(second.entry.words).toEqual(first.entry.words);
    expect(second.usd).toBe(0);
    expect(existsSync(join(dir, first.entry.file))).toBe(true);
    expect(readdirSync(dir).length).toBe(2); // audio + sidecar
  });

  it("different settings are a different key", async () => {
    const dir = join(tmpRoot(), "cache");
    const tts = new MockTTS();
    const base = { cache: new NarrationCache(dir), tts, voiceId: "v", elevenVoiceId: "el", text: "same text" };
    await synthesizeCached({ ...base, settings: { stability: 0.5 } });
    await synthesizeCached({ ...base, settings: { stability: 0.6 } });
    expect(tts.calls).toHaveLength(2);
  });
});

describe("router", () => {
  it("falls back to built-in defaults with distinct families for verifier/critic", () => {
    const r = parseRouting(undefined);
    expect(r.tasks.brainstorm).toBe("frontier");
    expect(r.tasks.write_script).toBe("mid");
    expect(r.verifier.model).not.toBe(r.tiers.mid.model);
    expect(r.escalation).toEqual(["small", "mid", "frontier"]);
  });

  it("merges a partial routing.json over the defaults", () => {
    const r = parseRouting({ tiers: { mid: { model: "my-mid" } }, weeklyBudgetUsd: 5 });
    expect(r.tiers.mid.model).toBe("my-mid");
    expect(r.tiers.small.model).toBe(defaultRouting().tiers.small.model);
    expect(r.weeklyBudgetUsd).toBe(5);
  });

  it("escalates one tier up on SchemaError, records the Escalation and every CostEntry", async () => {
    const router = testRouter();
    const plan = { tasks: [], escalations: [] };
    const llm = new MockLLM({ handlers: { fill_scene: ['{"wrong": true}', '{"ok": true}'] }, usdPerCall: 0.01 });
    const schema = z.object({ ok: z.boolean() });
    const seen: string[] = [];
    const r = await router.runWithEscalation({
      task: { id: "fill-s01", kind: "fill_scene" },
      plan,
      now: () => new Date("2026-11-10T00:00:00Z"),
      run: async ({ model }) => {
        seen.push(model);
        const res = await llm.complete({ model, system: "", prompt: "", schema, task: "fill_scene" });
        return { value: res.data, usd: res.usd, provider: "mock" };
      },
    });
    expect(seen).toEqual(["author-small", "author-mid"]);
    expect(r.tier).toBe("mid");
    expect(r.escalations).toEqual([{ taskId: "fill-s01", from: "small", to: "mid", reason: expect.stringContaining("SchemaError"), at: "2026-11-10T00:00:00.000Z" }]);
    expect(plan.escalations).toHaveLength(1);
    expect(plan.tasks[0]).toMatchObject({ id: "fill-s01", tier: "mid", model: "author-mid" });
    expect(r.costs).toHaveLength(2); // the failed attempt cost money too
    expect(r.costs.reduce((s, c) => s + c.usd, 0)).toBeCloseTo(0.02);
  });

  it("escalates when validate rejects, and gives up after the top tier", async () => {
    const router = testRouter();
    const plan: Plan = { tasks: [], escalations: [] };
    await expect(
      router.runWithEscalation({
        task: { id: "t1", kind: "fill_scene" },
        plan,
        run: async () => ({ value: 1 }),
        validate: () => "never good enough",
      }),
    ).rejects.toBeInstanceOf(EscalationExhaustedError);
    expect(plan.escalations.map((e) => `${e.from}>${e.to}`)).toEqual(["small>mid", "mid>frontier"]);
  });

  it("does not escalate on network/config errors", async () => {
    const router = testRouter();
    await expect(
      router.runWithEscalation({ task: { id: "t2", kind: "fill_scene" }, plan: { tasks: [], escalations: [] }, run: async () => { throw new Error("ECONNRESET"); } }),
    ).rejects.toThrow("ECONNRESET");
  });

  it("verifier/critic tasks keep their pinned model and retry once without a tier change", async () => {
    const router = testRouter();
    expect(router.resolve("verify_claims").model).toBe("other-verifier");
    expect(router.resolve("critique_scene").model).toBe("other-critic");
    const models: string[] = [];
    let n = 0;
    const r = await router.runWithEscalation({
      task: { id: "v", kind: "verify_claims" },
      plan: { tasks: [], escalations: [] },
      run: async ({ model }) => {
        models.push(model);
        if (n++ === 0) throw new SchemaError("bad");
        return { value: "fine" };
      },
    });
    expect(models).toEqual(["other-verifier", "other-verifier"]);
    expect(r.escalations).toEqual([]);
    expect(TaskValidationError).toBeDefined();
  });
});

describe("weekly budget", () => {
  const at = (iso: string, usd: number) => ({ provider: "x", usd, at: iso });
  const now = new Date("2026-11-11T12:00:00Z"); // ISO week 46
  it("ok within the budget; ignores other weeks", () => {
    const c = [at("2026-11-09T10:00:00Z", 5), at("2026-11-01T10:00:00Z", 100)];
    const b = checkBudget(c, 20, 10, now);
    expect(b).toMatchObject({ status: "ok", spentUsd: 5, remainingUsd: 5 });
  });
  it("needs owner OK with the amount when the budget would be exceeded", () => {
    const b = checkBudget([at("2026-11-09T10:00:00Z", 15)], 20, 8.5, now);
    expect(b).toMatchObject({ status: "needs_owner_ok", amountUsd: 8.5, spentUsd: 15, projectedUsd: 23.5 });
    if (b.status === "needs_owner_ok") expect(b.overByUsd).toBeCloseTo(3.5);
  });
});
