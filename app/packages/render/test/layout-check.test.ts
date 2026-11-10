import { describe, expect, it } from "vitest";
import { fitText, insideRect, safeArea, splitBox, textWidth, wrapText } from "../src/layout-check";
import { geometry } from "../src/layout";
import { chipText } from "../src/overlays";
import { activeChunk, captionWords, chunkCaptions } from "../src/captions";
import { musicVolumeAt } from "../src/audio";
import { makeQr } from "../src/brand/Qr";
import { contrast, ensureContrast, safeAccent } from "../src/brand/tokens";
import { sceneFrames } from "../src/model";
import { Episode } from "@wjnp/contracts";
import golden from "../../../episodes/_golden/sample-illustrative/episode.json";

describe("wrapText", () => {
  it("never exceeds the width and keeps all words", () => {
    const text = "Delegation without legible limits is just abdication and other long words";
    const lines = wrapText(text, 600, 48, "display");
    for (const l of lines) expect(textWidth(l, 48, "display")).toBeLessThanOrEqual(600);
    expect(lines.join(" ")).toBe(text);
  });
  it("hard-breaks a word wider than the box", () => {
    const lines = wrapText("Supercalifragilisticexpialidocious", 200, 40);
    expect(lines.length).toBeGreaterThan(1);
    for (const l of lines) expect(textWidth(l, 40)).toBeLessThanOrEqual(200);
  });
});

describe("fitText", () => {
  it("returns maxFont when the text is short", () => {
    const r = fitText({ text: "Hi", boxWidth: 900, boxHeight: 400, maxFont: 100 });
    expect(r.fontSize).toBe(100);
    expect(r.overflow).toBe(false);
  });
  it("shrinks with length and stays inside the box", () => {
    const short = fitText({ text: "From demo to product", boxWidth: 952, boxHeight: 500, maxFont: 140, role: "display" });
    const long = fitText({ text: "From demo to product ".repeat(6), boxWidth: 952, boxHeight: 500, maxFont: 140, role: "display" });
    expect(long.fontSize).toBeLessThan(short.fontSize);
    expect(long.height).toBeLessThanOrEqual(500);
    expect(long.width).toBeLessThanOrEqual(952);
  });
  it("respects maxLines (a figure stays on one line)", () => {
    const r = fitText({ text: "38%", boxWidth: 864, boxHeight: 700, maxFont: 560, role: "display", maxLines: 1 });
    expect(r.lines).toHaveLength(1);
    expect(textWidth("38%", r.fontSize, "display")).toBeLessThanOrEqual(864);
  });
  it("never goes below minFont and flags overflow", () => {
    const r = fitText({ text: "word ".repeat(200), boxWidth: 300, boxHeight: 100, maxFont: 60, minFont: 22 });
    expect(r.fontSize).toBe(22);
    expect(r.overflow).toBe(true);
  });
  it("is deterministic", () => {
    const a = fitText({ text: "abc def ghi jkl", boxWidth: 400, boxHeight: 300, maxFont: 80 });
    expect(fitText({ text: "abc def ghi jkl", boxWidth: 400, boxHeight: 300, maxFont: 80 })).toEqual(a);
  });
});

describe("geometry / safe area", () => {
  it("portrait safe area is a centred 4:5 box", () => {
    expect(safeArea(1080, 1920)).toEqual({ x: 0, y: 285, w: 1080, h: 1350 });
  });
  it("landscape safe area is the whole frame", () => {
    expect(safeArea(1920, 1080)).toEqual({ x: 0, y: 0, w: 1920, h: 1080 });
  });
  it("vertical layout keeps chip, content, captions and progress inside the 4:5 safe area", () => {
    const g = geometry("vertical");
    for (const r of [g.chip, g.content, g.captions, g.progress]) expect(insideRect(r, g.safe)).toBe(true);
    expect(g.content.h).toBeGreaterThan(800);
  });
  it("horizontal layout keeps everything inside the frame and regions do not overlap", () => {
    const g = geometry("horizontal");
    const frame = { x: 0, y: 0, w: g.W, h: g.H };
    for (const r of [g.chip, g.content, g.captions, g.progress]) expect(insideRect(r, frame)).toBe(true);
    expect(g.content.y + g.content.h).toBeLessThanOrEqual(g.captions.y);
    expect(g.chip.y + g.chip.h).toBeLessThanOrEqual(g.content.y);
  });
  it("splitBox divides evenly", () => {
    const cells = splitBox({ x: 0, y: 0, w: 1000, h: 100 }, 2, "row", 20);
    expect(cells.map((c) => c.w)).toEqual([490, 490]);
  });
});

describe("captions", () => {
  const ep = Episode.parse(golden);
  it("distributes words evenly when there is no audio timing", () => {
    const scene = ep.scenes[0]!;
    const words = captionWords(scene);
    expect(words.length).toBe(scene.narration.text.split(/\s+/).length);
    for (let i = 1; i < words.length; i++) expect(words[i]!.startFrame).toBeGreaterThanOrEqual(words[i - 1]!.startFrame);
    expect(words[words.length - 1]!.endFrame).toBeLessThanOrEqual(sceneFrames(scene));
  });
  it("uses real word timings when present", () => {
    const scene = { ...ep.scenes[0]!, narration: { ...ep.scenes[0]!.narration, audio: { textSha256: "a".repeat(64), path: "x.mp3", durationMs: 2000, words: [{ w: "Hello", startMs: 0, endMs: 500 }, { w: "world", startMs: 600, endMs: 1000 }] } } };
    expect(captionWords(scene)).toEqual([{ w: "Hello", startFrame: 0, endFrame: 15 }, { w: "world", startFrame: 18, endFrame: 30 }]);
  });
  it("chunks respect maxChars and cover every word", () => {
    const words = captionWords(ep.scenes[2]!);
    const chunks = chunkCaptions(words, 40);
    for (const c of chunks) expect(c.text.length).toBeLessThanOrEqual(40);
    expect(chunks.flatMap((c) => c.words).length).toBe(words.length);
    expect(activeChunk(chunks, chunks[1]!.startFrame)).toBe(chunks[1]);
  });
});

describe("chip, audio, brand", () => {
  it("chip text fits one line", () => {
    const t = chipText(["Example University", "Example Labs", "Example Times", "Another Publisher"], 400, 26);
    expect(textWidth(t, 26)).toBeLessThanOrEqual(400 - 64);
    expect(t.startsWith("Source: ")).toBe(true);
  });
  it("music ducks under narration and is pure", () => {
    const w = [{ from: 100, to: 200 }];
    expect(musicVolumeAt(150, w, 1000)).toBeLessThan(musicVolumeAt(500, w, 1000));
    expect(musicVolumeAt(150, w, 1000)).toBe(musicVolumeAt(150, w, 1000));
  });
  it("QR is deterministic and uses error correction H (version >= 3 for the profile URL)", () => {
    const a = makeQr("https://www.linkedin.com/in/robertofrossard");
    const b = makeQr("https://www.linkedin.com/in/robertofrossard");
    expect(a).toEqual(b);
    expect(a.size).toBeGreaterThanOrEqual(29);
  });
  it("accent guard rejects orange and purple, keeps teal", () => {
    expect(safeAccent("#1F7A8C")).toBe("#1F7A8C");
    expect(safeAccent("#E8710A")).not.toBe("#E8710A");
    expect(safeAccent("#7B3FA0")).not.toBe("#7B3FA0");
  });
  it("ensureContrast reaches the target", () => {
    expect(contrast(ensureContrast("#1F7A8C", "#101214", 4.5), "#101214")).toBeGreaterThanOrEqual(4.5);
  });
});
