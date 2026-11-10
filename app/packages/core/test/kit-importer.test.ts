import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildCaptions, classifyInput, importInput, writeKit, type Fetcher } from "../src/index.ts";
import { golden, tempRoot } from "./helpers.ts";

describe("kit", () => {
  it("writes all five files", () => {
    const { store } = tempRoot();
    const ep = store.getEpisode("sample-illustrative");
    ep.post!.desktopUrl = "https://example.org/desktop";
    store.saveEpisode(ep);
    const k = writeKit(store, "sample-illustrative");
    for (const f of ["post.txt", "first-comment.txt", "CREDITS.md", "captions.srt", "checklist.md"]) expect(existsSync(join(k.dir, f))).toBe(true);
    expect(k.dir).toContain(join("episodes", "_golden", "sample-illustrative", "out", "kit"));
    expect(k.postText).toContain("#AI #Agents");
    expect(k.postText.trim().endsWith("Views are my own.")).toBe(true);
    expect(k.firstComment).toMatch(/^Sources:\n1\. /);
    expect(k.firstComment).toContain("Desktop version: https://example.org/desktop");
    expect(k.credits).toContain("## Voices");
    expect(k.credits).toContain("voice-roberto — narrator");
    const srt = readFileSync(join(k.dir, "captions.srt"), "utf8");
    expect(srt.startsWith("1\n00:00:00,000 --> ")).toBe(true);
    expect(readFileSync(join(k.dir, "checklist.md"), "utf8")).toContain("[ ] Gate passes");
  });
  it("captions use word timings when present, else an even split", () => {
    const ep = golden();
    const first = ep.scenes[0]!;
    first.narration.audio = {
      textSha256: "b".repeat(64),
      path: "a.mp3",
      durationMs: 1000,
      words: [
        { w: "Hello", startMs: 100, endMs: 400 },
        { w: "there", startMs: 450, endMs: 900 },
      ],
    };
    const srt = buildCaptions(ep);
    expect(srt).toContain("1\n00:00:00,100 --> 00:00:00,900\nHello there\n");
    // second cue starts after scene 1 (284 frames ≈ 9.467 s)
    expect(srt).toContain("2\n00:00:09,467 --> ");
  });
});

describe("importer classification", () => {
  it.each([
    ["https://www.example.com/news/agents", "article_url"],
    ["https://arxiv.org/abs/2401.12345v2", "arxiv"],
    ["arXiv:2401.12345", "arxiv"],
    ["2401.12345", "arxiv"],
    ["https://doi.org/10.1145/3544548.3581388", "doi"],
    ["10.1145/3544548.3581388", "doi"],
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "youtube"],
    ["https://youtu.be/dQw4w9WgXcQ", "youtube"],
    ["https://vimeo.com/123456", "video_url"],
    ["https://cdn.example.com/clip.mp4", "video_url"],
    ["/Users/me/Desktop/chart.png", "image_file"],
    ["./data/table.csv", "csv"],
    ["year,value\n2024,1\n2025,2", "csv"],
    ["- agents that pay\n- robots in warehouses\n- open weights", "theme_list"],
    ["Agents that pay\nOn-device models", "theme_list"],
    ["Some long thought about the week. It has sentences.", "text"],
  ])("%s → %s", (input, kind) => {
    expect(classifyInput(input).kind).toBe(kind);
  });
  it("normalises ids", () => {
    expect(classifyInput("https://arxiv.org/pdf/2401.12345v3").value).toBe("2401.12345");
    expect(classifyInput("- a\n- b").themes).toEqual(["a", "b"]);
  });
});

describe("importer", () => {
  const fetcher: Fetcher = async (url) => {
    calls.push(url);
    if (url.includes("oembed")) return { status: 200, contentType: "application/json", body: JSON.stringify({ title: "A keynote", author_name: "Example Conf" }) };
    return { status: 200, contentType: "text/html; charset=utf-8", body: "<html><head><title>Agents &amp; money</title></head></html>" };
  };
  let calls: string[] = [];

  it("imports an article with a snapshot blob and unknown licence", async () => {
    const { store, root } = tempRoot();
    calls = [];
    const a = await importInput(store, "https://news.example.com/a", { fetcher, now: new Date("2026-11-09T12:00:00Z") });
    expect(a.type).toBe("source");
    expect(a.title).toBe("Agents & money");
    expect(a.license.kind).toBe("unknown");
    expect(a.blob && existsSync(join(root, "library/blobs", a.blob.sha256))).toBe(true);
    expect(store.getAsset(a.id)?.id).toBe(a.id);
  });
  it("stores only metadata for video URLs (never downloads)", async () => {
    const { store, root } = tempRoot();
    calls = [];
    const a = await importInput(store, "https://www.youtube.com/watch?v=abc123", { fetcher });
    expect(a.type).toBe("clip");
    expect(a.blob).toBeUndefined();
    expect(a.data.downloaded).toBe(false);
    expect(a.title).toBe("A keynote");
    expect(calls.every((u) => u.includes("oembed"))).toBe(true);
    expect(existsSync(join(root, "library/blobs"))).toBe(false);
    const v = await importInput(store, "https://cdn.example.com/x.mp4", { fetcher });
    expect(v.blob).toBeUndefined();
  });
  it("imports image files, CSV and theme lists; honours an explicit licence", async () => {
    const { store, root } = tempRoot();
    const img = join(root, "pic.png");
    writeFileSync(img, Buffer.from([137, 80, 78, 71]));
    const a = await importInput(store, img, { license: { kind: "own" } });
    expect(a.type).toBe("visual");
    expect(a.license.kind).toBe("own");
    expect(a.blob?.mime).toBe("image/png");
    const csv = await importInput(store, "year,value\n2024,1\n2025,2");
    expect(csv.type).toBe("dataset");
    expect(csv.data.columns).toEqual(["year", "value"]);
    const t = await importInput(store, "- one\n- two");
    expect(t.type).toBe("thesis");
    expect(store.listAssets().length).toBe(3);
    expect(store.listAssets("visual").map((x) => x.id)).toEqual([a.id]);
  });
  it("works offline (no fetcher)", async () => {
    const { store } = tempRoot();
    const a = await importInput(store, "https://news.example.com/b");
    expect(a.title).toBe("https://news.example.com/b");
    expect(a.data.fetched).toBe(false);
  });
});
