import { mkdirSync, mkdtempSync, writeFileSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Episode } from "@wjnp/contracts";
import { MockLLM, MockTTS, Router, defaultRouting, loadModules, type PipelineDeps, type ModulesData } from "../src/index";
import type { Alignment } from "../src/index";

export const GOLDEN = join(__dirname, "..", "..", "..", "episodes", "_golden", "sample-illustrative", "episode.json");
export const NOW = new Date("2026-11-10T09:00:00Z");

export const MODELS = {
  frontier: "author-frontier",
  mid: "author-mid",
  small: "author-small",
  verifier: "other-verifier",
  critic: "other-critic",
};

export function testRouter(overrides: Partial<ReturnType<typeof defaultRouting>> = {}): Router {
  const d = defaultRouting({});
  return new Router({
    ...d,
    tiers: { frontier: { model: MODELS.frontier }, mid: { model: MODELS.mid }, small: { model: MODELS.small } },
    verifier: { model: MODELS.verifier },
    critic: { model: MODELS.critic },
    ...overrides,
  });
}

export function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "wjnp-providers-"));
}

export function writeModules(root: string, files: Record<string, unknown>): void {
  for (const [rel, data] of Object.entries(files)) {
    const p = join(root, "modules", rel);
    mkdirSync(join(p, ".."), { recursive: true });
    writeFileSync(p, typeof data === "string" ? data : JSON.stringify(data, null, 2));
  }
}

export const VOICES = {
  narrator: { assetId: "voice-roberto", elevenVoiceId: "el-narrator", settings: { stability: 0.5, similarity_boost: 0.75 } },
  cast: [{ tone: "analytical", assetId: "voice-river", name: "River", elevenVoiceId: "el-river" }],
};

export function loadGolden(): Episode {
  return Episode.parse(JSON.parse(readFileSync(GOLDEN, "utf8")));
}

export function makeDeps(root: string, over: Partial<PipelineDeps> = {}): PipelineDeps & { llm: MockLLM; verifierLlm: MockLLM; tts: MockTTS } {
  writeModules(root, { "audio/voices.json": VOICES });
  const modules: ModulesData = { ...loadModules(root) };
  return {
    llm: new MockLLM({ family: "author" }),
    verifierLlm: new MockLLM({ family: "verifier" }),
    tts: new MockTTS(),
    modules,
    router: testRouter(),
    now: () => NOW,
    root,
    ...over,
  } as PipelineDeps & { llm: MockLLM; verifierLlm: MockLLM; tts: MockTTS };
}

/** 0.1 s per character alignment for a spoken string. */
export function alignmentFor(text: string, step = 0.1): Alignment {
  const chars = [...text];
  return {
    characters: chars,
    character_start_times_seconds: chars.map((_, i) => +(i * step).toFixed(3)),
    character_end_times_seconds: chars.map((_, i) => +((i + 1) * step).toFixed(3)),
  };
}
