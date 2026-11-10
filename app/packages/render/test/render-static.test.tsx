import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("remotion", async () => {
  const actual = await vi.importActual<any>("remotion");
  const React = await import("react");
  return {
    ...actual,
    useCurrentFrame: () => 60,
    useVideoConfig: () => ({ width: 1080, height: 1920, fps: 30, durationInFrames: 3000, id: "t" }),
    AbsoluteFill: ({ children, style }: any) => React.createElement("div", { style }, children),
    Sequence: ({ children }: any) => React.createElement("div", null, children),
    Audio: () => React.createElement("audio"),
    OffthreadVideo: () => React.createElement("video"),
    staticFile: (s: string) => `/public/${s}`,
  };
});

import { Episode, TEMPLATE_IDS, PROFILE_URL, SERIES_NAME } from "@wjnp/contracts";
import golden from "../../../episodes/_golden/sample-illustrative/episode.json";
import { SceneView, EpisodeVideo } from "../src/Episode";
import { resolveTokens } from "../src/brand/tokens";
import { NO_ASSETS } from "../src/model";
import { TEMPLATES } from "../src/scenes";

const episode = Episode.parse(golden);
const tokens = resolveTokens();

describe("every template renders to static markup in both layouts", () => {
  it("golden fixture covers every template except clip (clip is tested with a synthetic scene)", () => {
    expect(new Set(episode.scenes.map((s) => s.onScreen.template))).toEqual(new Set(TEMPLATE_IDS.filter((t) => t !== "clip")));
    expect(Object.keys(TEMPLATES).sort()).toEqual([...TEMPLATE_IDS].sort());
  });
  for (const layout of ["vertical", "horizontal"] as const) {
    for (const scene of episode.scenes) {
      it(`${scene.onScreen.template} / ${layout}`, () => {
        const html = renderToStaticMarkup(<SceneView scene={scene} episode={episode} layout={layout} accent={episode.design.accent.hex} tokens={tokens} resolved={NO_ASSETS} />);
        expect(html.length).toBeGreaterThan(500);
        expect(html).not.toMatch(/undefined|NaN|\[object/);
        expect(html).toContain('data-overlay="captions"');
      });
    }
  }
});

describe("content rules", () => {
  const render = (id: string, layout: "vertical" | "horizontal" = "vertical", ep = episode) =>
    renderToStaticMarkup(<SceneView scene={ep.scenes.find((s) => s.id === id)!} episode={ep} layout={layout} accent={ep.design.accent.hex} tokens={tokens} resolved={NO_ASSETS} />);

  it("stat reads the figure from the claim, not from props text", () => {
    const ep = Episode.parse(JSON.parse(JSON.stringify(golden)));
    ep.claims.find((c) => c.id === "c-share")!.value!.display = "99.5 pct";
    expect(render("s03", "vertical", ep)).toContain("99.5 pct");
    expect(render("s03")).toContain("38%");
  });
  it("personal_take shows the My take label", () => expect(render("s08")).toMatch(/My take/));
  it("source chip lists publishers of the claim's sources", () => {
    const html = render("s03");
    expect(html).toContain("Example University");
    expect(html).toContain("Example Times");
  });
  it("scenes without claims have no source chip", () => expect(render("s01")).not.toContain('data-overlay="source-chip"'));
  it("clip shows a labelled placeholder when the asset file is missing", () => {
    const ep = Episode.parse(JSON.parse(JSON.stringify(golden)));
    const s = ep.scenes[1]!;
    (s as any).onScreen = { template: "clip", claimId: "c-quote", clipAssetId: "clip-x", startMs: 0, endMs: 5000, attribution: "Dr. Example Person", sourceLabel: "Example Conference" };
    const html = renderToStaticMarkup(<SceneView scene={s} episode={ep} layout="vertical" accent="#1F7A8C" tokens={tokens} resolved={NO_ASSETS} />);
    expect(html).toContain("CLIP PLACEHOLDER");
    const withFile = renderToStaticMarkup(<SceneView scene={s} episode={ep} layout="vertical" accent="#1F7A8C" tokens={tokens} resolved={{ ...NO_ASSETS, clips: { "clip-x": "clips/clip-x.mp4" } }} />);
    expect(withFile).toContain("<video");
    expect(withFile).not.toContain("CLIP PLACEHOLDER");
  });
  it("clip renders in both layouts", () => {
    const s = { ...episode.scenes[1]!, onScreen: { template: "clip" as const, claimId: "c-quote", clipAssetId: "clip-x", startMs: 0, endMs: 5000, attribution: "Dr. Example Person", sourceLabel: "Example Conference" } };
    for (const layout of ["vertical", "horizontal"] as const) {
      const html = renderToStaticMarkup(<SceneView scene={s} episode={episode} layout={layout} accent="#1F7A8C" tokens={tokens} resolved={NO_ASSETS} />);
      expect(html).toContain("CLIP PLACEHOLDER");
    }
  });
  it("end card has mark, name, series, QR, profile URL, question and disclaimer", () => {
    for (const layout of ["vertical", "horizontal"] as const) {
      const html = render("s09", layout);
      expect(html).toContain("Roberto Frossard");
      expect(html).toContain(SERIES_NAME.replace("'", "&#x27;"));
      expect(html).toContain("linkedin.com/in/robertofrossard");
      expect(html).toContain("What would you let software buy");
      expect(html).toContain("Views are my own.");
      expect(html).toContain('aria-label="QR code to LinkedIn profile"');
      expect(html).toContain('aria-label="Roberto Frossard mark"');
      expect(html).toContain('fill-opacity="0.8"');
    }
    expect(PROFILE_URL).toContain("linkedin.com/in/robertofrossard");
  });
  it("QR uses dark modules on a light panel", () => {
    const html = render("s09");
    expect(html).toMatch(/<rect[^>]*fill="#FFFFFF"/);
    expect(html).toMatch(/<path[^>]*fill="#101214"/);
  });
  it("no orange or purple appears in a rendered scene", () => {
    for (const s of episode.scenes) {
      const html = render(s.id);
      const hexes = [...html.matchAll(/#([0-9a-fA-F]{6})\b/g)].map((m) => m[1]!);
      for (const h of hexes) {
        const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
        const sat = Math.max(r!, g!, b!) - Math.min(r!, g!, b!);
        if (sat > 40) expect(Math.abs(r! - g!) < 40 || b! >= r! - 20 && b! >= g! - 100, `#${h} looks warm/purple`).toBe(true);
      }
    }
  });
  it("whole episode renders in each output kind", () => {
    for (const [kind, layout] of [["master", "vertical"], ["desktop", "horizontal"], ["cut", "vertical"]] as const) {
      const html = renderToStaticMarkup(<EpisodeVideo episode={episode} kind={kind} layout={layout} />);
      expect(html).toContain('data-overlay="progress"');
    }
  });
});
