import { describe, expect, it } from "vitest";
import type { Asset, Episode, Finding } from "@wjnp/contracts";
import {
  runGate,
  validateCompliance,
  validateDesign,
  validateFactuality,
  validateLicensing,
  validateStructure,
  validateTiming,
  episodeDurations,
} from "../src/index.ts";
import { ctx, golden, goldenTimed } from "./helpers.ts";

const errors = (f: Finding[]) => f.filter((x) => x.severity === "error");
const rules = (f: Finding[]) => f.map((x) => x.rule);
const scene = (ep: Episode, id: string) => ep.scenes.find((s) => s.id === id)!;
const claim = (ep: Episode, id: string) => ep.claims.find((c) => c.id === id)!;

describe("factuality", () => {
  it("passes the golden fixture (only the m3 warning)", () => {
    const f = validateFactuality(golden(), ctx());
    expect(errors(f)).toEqual([]);
    expect(rules(f)).toEqual(["factuality.message_unsupported"]);
  });
  it("flags unverified, missing and expired claims", () => {
    const ep = golden();
    claim(ep, "c-launch").verdict = "partial";
    scene(ep, "s04").claimIds = ["c-nope"];
    claim(ep, "c-quote").validUntil = "2026-01-01";
    const r = rules(validateFactuality(ep, ctx()));
    expect(r).toContain("factuality.claim_unverified");
    expect(r).toContain("factuality.claim_missing");
    expect(r).toContain("factuality.expired");
  });
  it("needs independent publishers and a primary source; reference_only does not count", () => {
    const ep = golden();
    ep.sources.find((s) => s.id === "s-press")!.tier = "reference_only";
    expect(rules(validateFactuality(ep, ctx()))).toContain("factuality.independent_sources");
    const ep2 = golden();
    ep2.sources.find((s) => s.id === "s-press")!.publisher = "Example Labs"; // same publisher as s-docs
    expect(errors(validateFactuality(ep2, ctx())).some((f) => f.claimId === "c-launch")).toBe(true);
    const ep3 = golden();
    ep3.sources.find((s) => s.id === "s-docs")!.tier = "tier2";
    expect(rules(validateFactuality(ep3, ctx()))).toContain("factuality.primary_source");
  });
  it("rejects self-verification, unknown evidence sources and wrong claim kinds", () => {
    const ep = golden();
    claim(ep, "c-share").verifier!.model = "fixture-author";
    claim(ep, "c-launch").evidence[0]!.sourceId = "s-ghost";
    claim(ep, "c-quote").kind = "fact";
    delete claim(ep, "c-share").value;
    const r = rules(validateFactuality(ep, ctx()));
    expect(r).toEqual(expect.arrayContaining(["factuality.self_verified", "factuality.evidence_source_missing", "factuality.quote_claim", "factuality.stat_claim"]));
  });
});

describe("compliance", () => {
  it("passes the golden fixture", () => {
    expect(errors(validateCompliance(golden(), ctx()))).toEqual([]);
  });
  it("catches blocked entities (alias, case-insensitive, word boundary) and patterns", () => {
    const ep = golden();
    scene(ep, "s02").narration.text = "This shipped at ITAU this month.";
    ep.post!.text = "You should buy this stock.";
    const blocklist = {
      entities: [{ name: "Itaú", aliases: ["Itau"], category: "employer" }, { name: "Citi", aliases: [], category: "bank" }],
      patterns: [{ id: "advice", regex: "\\byou should buy\\b", message: "advice", severity: "error" as const }],
    };
    const f = validateCompliance(ep, ctx({ blocklist }));
    expect(f.find((x) => x.rule === "compliance.blocked_entity")?.sceneId).toBe("s02");
    expect(rules(f)).toContain("compliance.pattern.advice");
    // word boundary: "city" must not match "Citi"; "Citizens" neither
    const ep2 = golden();
    scene(ep2, "s02").narration.text = "Citizens of the city shop online.";
    expect(validateCompliance(ep2, ctx({ blocklist })).filter((x) => x.rule === "compliance.blocked_entity")).toEqual([]);
  });
  it("scans on-screen strings", () => {
    const ep = golden();
    const os = scene(ep, "s07").onScreen;
    if (os.template === "bullets") os.bullets[1] = "Allowed merchants at Itaú";
    expect(errors(validateCompliance(ep, ctx())).map((f) => f.sceneId)).toContain("s07");
  });
  it("requires personal_take for opinions and the disclaimer in the post", () => {
    const ep = golden();
    scene(ep, "s07").isOpinion = true;
    ep.post!.disclaimer = "";
    const r = rules(validateCompliance(ep, ctx()));
    expect(r).toContain("compliance.opinion_template");
    expect(r).toContain("compliance.disclaimer");
  });
});

describe("design", () => {
  it("passes the golden fixture (accent warning allowed)", () => {
    expect(errors(validateDesign(golden(), ctx()))).toEqual([]);
  });
  it("forbids orange/purple accents, undeclared styles, too many voices, non-narrator bookends", () => {
    const ep = golden();
    ep.design.accent = { name: "orange", hex: "#FF8800" };
    scene(ep, "s03").style = "archival_bw";
    scene(ep, "s04").narration.voiceId = "voice-third";
    scene(ep, "s09").narration.voiceId = "voice-river";
    const r = rules(validateDesign(ep, ctx()));
    expect(r).toEqual(expect.arrayContaining(["design.forbidden_hue", "design.style_not_declared", "design.too_many_voices", "design.narrator_bookends"]));
    const purple = golden();
    purple.design.accent = { name: "violet", hex: "#7B2CBF" };
    expect(rules(validateDesign(purple, ctx()))).toContain("design.forbidden_hue");
  });
  it("warns when the accent is not pickAccent(id)", () => {
    const ep = golden();
    ep.design.accent = { name: "x", hex: "#123456" };
    const f = validateDesign(ep, ctx({ accents: [{ name: "teal", hex: "#1F7A8C" }] }));
    expect(f.find((x) => x.rule === "design.accent_not_picked")?.severity).toBe("warning");
    expect(validateDesign(golden(), ctx({ accents: [{ name: "teal", hex: "#1F7A8C" }] })).some((x) => x.rule === "design.accent_not_picked")).toBe(false);
  });
});

describe("timing", () => {
  it("golden fixture (~86 s) fails master and cut windows", () => {
    const ep = golden();
    const d = episodeDurations(ep);
    expect(d.masterSeconds).toBeCloseTo(85.6, 0);
    expect(rules(validateTiming(ep))).toEqual(expect.arrayContaining(["timing.master_duration", "timing.cut_duration"]));
  });
  it("passes when durations are in range", () => {
    expect(errors(validateTiming(goldenTimed()))).toEqual([]);
  });
  it("estimates from words, needs end_card in cut, and rejects audio longer than the scene", () => {
    const ep = goldenTimed();
    delete scene(ep, "s02").durationFrames;
    scene(ep, "s09").inCut = false;
    scene(ep, "s03").narration.audio = { textSha256: "a".repeat(64), path: "x.mp3", durationMs: 999_999, words: [] };
    const f = validateTiming(ep);
    expect(rules(f)).toEqual(expect.arrayContaining(["timing.estimated", "timing.cut_end_card", "timing.audio_overflow"]));
  });
});

describe("licensing", () => {
  const asset = (id: string, kind: Asset["license"]["kind"], type: Asset["type"] = "visual"): Asset => ({
    id, type, title: id, tags: [], origin: { kind: "file" }, license: { kind }, createdAt: "2026-11-09T12:00:00Z", version: 1, state: "approved", data: {}, usedIn: [],
  });
  const lib = (...a: Asset[]) => (id: string) => a.find((x) => x.id === id);

  it("passes with licensed assets", () => {
    const ep = golden();
    scene(ep, "s02").visualAssetIds = ["img-own"];
    expect(validateLicensing(ep, ctx({ getAsset: lib(asset("img-own", "own")) }))).toEqual([]);
  });
  it("rejects missing, unknown-licence and undecided standard-licence assets", () => {
    const ep = golden();
    scene(ep, "s02").visualAssetIds = ["img-missing", "img-unknown", "img-std"];
    const r = rules(validateLicensing(ep, ctx({ getAsset: lib(asset("img-unknown", "unknown"), asset("img-std", "standard")) })));
    expect(r).toEqual(expect.arrayContaining(["licensing.asset_missing", "licensing.unknown_license", "licensing.clip_decision"]));
    ep.clipDecisions = [{ clipAssetId: "img-std", decision: "quote_card", decidedAt: "2026-11-09T12:00:00Z" }];
    expect(rules(validateLicensing(ep, ctx({ getAsset: lib(asset("img-std", "standard")) })))).not.toContain("licensing.clip_decision");
  });
  it("enforces CLIP_RULES", () => {
    const ep = golden();
    const s = scene(ep, "s05");
    s.onScreen = { template: "clip", claimId: "c-quote", clipAssetId: "yt-talk", startMs: 0, endMs: 20_000, attribution: "Dr. Example", sourceLabel: "Keynote" };
    ep.clipDecisions = [{ clipAssetId: "yt-talk", decision: "short_quote" }];
    const r = rules(validateLicensing(ep, ctx({ getAsset: lib(asset("yt-talk", "standard", "clip")) })));
    expect(r).toEqual(expect.arrayContaining(["licensing.clip_too_long", "licensing.clip_share"]));
  });
});

describe("structure", () => {
  it("passes the golden fixture", () => {
    expect(validateStructure(golden())).toEqual([]);
  });
  it("checks order, first/last templates and message coverage", () => {
    const ep = golden();
    scene(ep, "s02").order = 0; // duplicate order
    scene(ep, "s01").order = 9;
    for (const s of ep.scenes) if (s.messageId === "m3") delete s.messageId;
    const r = rules(validateStructure(ep));
    expect(r).toEqual(expect.arrayContaining(["structure.order", "structure.first_title_hook", "structure.last_end_card", "structure.message_unserved"]));
  });
});

describe("gate", () => {
  it("passes a well-timed golden episode", () => {
    const r = runGate(goldenTimed(), ctx());
    expect(errors(r.findings)).toEqual([]);
    expect(r.gatePass).toBe(true);
    expect(r.durations).toEqual({ masterSeconds: expect.closeTo(300, 0), cutSeconds: expect.closeTo(75, 0) });
  });
  it("fails on the golden fixture's duration and on a failed scene gate", () => {
    expect(runGate(golden(), ctx()).gatePass).toBe(false);
    const ep = goldenTimed();
    scene(ep, "s03").gate = { checks: [], attempts: 1, pass: false };
    const r = runGate(ep, ctx());
    expect(r.gatePass).toBe(false);
    expect(rules(r.findings)).toContain("gate.scene_failed");
  });
});
