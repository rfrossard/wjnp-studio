import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { DURATION_RULES, Episode, FPS } from "@wjnp/contracts";
import { MockLLM, MockTTS, narrationKey, runPipeline, type RadarTheme } from "../src/index";
import { GOLDEN, loadGolden, makeDeps, tmpRoot, VOICES } from "./helpers";

describe("end-to-end pipeline on a copy of the golden fixture (all mocks, temp dir)", () => {
  it("brief -> claims -> verification -> script -> review -> narration -> post, and the result parses as an Episode", async () => {
    const root = tmpRoot();
    const golden = loadGolden();

    // work on a copy in the temp dir; keep only the sources, regenerate everything else
    const dir = join(root, "episodes", "e2e-sample");
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, "episode.json"), readFileSync(GOLDEN, "utf8"));
    const start: Episode = Episode.parse({
      ...golden,
      id: "e2e-sample",
      claims: [],
      scenes: [],
      post: undefined,
      plan: undefined,
      costs: [],
      audio: { narratorVoiceId: "voice-roberto", castVoiceIds: [], musicAssetIds: [] },
    });

    // source texts = the evidence quotes the fixture already carries
    const sourceTexts: Record<string, string> = {};
    for (const c of golden.claims) for (const e of c.evidence) sourceTexts[e.sourceId] = `${sourceTexts[e.sourceId] ?? ""}${e.quote} `;

    const themes: RadarTheme[] = [
      {
        id: "t-1",
        title: "Agents that can transact on a person's behalf",
        thesis: golden.brief.thesis,
        messages: [],
        sources: golden.sources.map((s) => ({ title: s.title, url: s.url, publisher: s.publisher })),
      },
    ];

    const llm = new MockLLM({
      family: "author",
      handlers: {
        // the extraction model returns the fixture's claims (as a real model would after reading the texts)
        extract_claims: () => ({
          claims: golden.claims.map((c) => ({ id: c.id, text: c.text, kind: c.kind, value: c.value, speaker: c.speaker, evidence: c.evidence })),
        }),
      },
    });
    const deps = makeDeps(root, { llm });
    // cast voice for the "analytical" tone, narrator voices from the fixture-like voices.json
    expect(deps.modules.voices?.cast[0]?.tone).toBe(VOICES.cast[0]!.tone);

    const ep = await runPipeline(start, deps, { brainstorm: { themes, ownerNotes: "keep it about accountability" }, extract: { sourceTexts } });

    // contract
    expect(() => Episode.parse(ep)).not.toThrow();
    // brief: exactly 3 messages
    expect(ep.brief.messages.map((m) => m.id)).toEqual(["m1", "m2", "m3"]);
    // claims: verified by the OTHER model + the code rule
    expect(ep.claims.map((c) => c.verdict)).toEqual(["verified", "verified", "verified"]);
    expect(ep.claims.every((c) => c.author?.model === "author-mid" && c.verifier?.model === "other-verifier")).toBe(true);
    // script
    expect(ep.scenes).toHaveLength(9);
    expect(ep.scenes[0]!.onScreen.template).toBe("title_hook");
    expect(ep.scenes.at(-1)!.onScreen.template).toBe("end_card");
    expect(ep.scenes.filter((s) => s.inCut).length).toBeGreaterThanOrEqual(3);
    expect(ep.scenes.filter((s) => s.inCut).length).toBeLessThanOrEqual(4);
    expect(ep.scenes.every((s) => s.gate?.pass)).toBe(true);
    // narration: voices, audio, frames
    const voices = new Set(ep.scenes.map((s) => s.narration.voiceId));
    expect(voices.size).toBeLessThanOrEqual(2);
    expect(ep.scenes[0]!.narration.voiceId).toBe("voice-roberto");
    expect(ep.scenes.find((s) => s.onScreen.template === "quote_card")!.narration.voiceId).toBe("voice-river");
    expect(ep.scenes.find((s) => s.isOpinion)!.narration.voiceId).toBe("voice-roberto");
    expect(ep.audio).toMatchObject({ narratorVoiceId: "voice-roberto", castVoiceIds: ["voice-river"] });
    for (const s of ep.scenes) {
      const a = s.narration.audio!;
      expect(a.textSha256).toBe(narrationKey(s.narration.voiceId, s.narration.text, s.narration.voiceId === "voice-roberto" ? VOICES.narrator.settings : undefined));
      expect(existsSync(join(root, a.path))).toBe(true);
      expect(s.durationFrames).toBe(Math.ceil((a.durationMs / 1000) * FPS) + 20);
      expect(a.words.map((w) => w.w)).toEqual(s.narration.text.split(/\s+/));
    }
    const totalSeconds = ep.scenes.reduce((t, s) => t + s.narration.audio!.durationMs, 0) / 1000;
    expect(totalSeconds).toBeGreaterThanOrEqual(DURATION_RULES.masterSeconds.min - 15);
    expect(totalSeconds).toBeLessThanOrEqual(DURATION_RULES.masterSeconds.max);
    // post
    expect(ep.post!.text.split("\n\n")[0]!.split("\n")).toHaveLength(2);
    expect(ep.post!.hashtags.length).toBeLessThanOrEqual(3);
    expect(ep.post!.firstComment).toContain("https://example.org/s-docs");
    expect(ep.post!.ownerConfirmedAt).toBeUndefined();
    // plan + costs recorded, models per tier
    const kinds = Object.fromEntries(ep.plan!.tasks.map((t) => [t.id, t.model]));
    expect(kinds["brainstorm"]).toBe("author-frontier");
    expect(kinds["extract-claims"]).toBe("author-mid");
    expect(kinds["verify-claims"]).toBe("other-verifier");
    expect(kinds["write-script"]).toBe("author-mid");
    expect(kinds["write-post"]).toBe("author-small");
    expect(ep.costs.length).toBeGreaterThan(0);
    expect(ep.plan!.escalations).toEqual([]);

    // running narration again re-uses the cache: no new TTS calls
    const tts: MockTTS = deps.tts;
    const calls = tts.calls.length;
    expect(calls).toBeGreaterThan(0);
    const { narrate } = await import("../src/index");
    await narrate(ep, deps);
    expect(tts.calls.length).toBe(calls);
  });
});
