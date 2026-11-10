import { describe, expect, it } from "vitest";
import {
  AnthropicLLM,
  ElevenLabsTTS,
  LyriaMusic,
  MockLLM,
  MockMusic,
  MockTTS,
  OpenAICompatibleLLM,
  SchemaError,
  alignmentToWords,
  applyPronunciation,
  extractJson,
} from "../src/index";
import { z } from "zod";
import { alignmentFor } from "./helpers";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

describe("alignment -> word timings", () => {
  it("groups character timings into whitespace-delimited words", () => {
    const words = alignmentToWords(alignmentFor("Hi there  you"));
    expect(words).toEqual([
      { w: "Hi", startMs: 0, endMs: 200 },
      { w: "there", startMs: 300, endMs: 800 },
      { w: "you", startMs: 1000, endMs: 1300 },
    ]);
  });
});

describe("pronunciation substitution", () => {
  it("substitutes whole words only and keeps spans for the original words", () => {
    const { spoken, spans } = applyPronunciation("AI said AIR is not AI's fault", [{ term: "AI", say: "A I" }]);
    expect(spoken).toBe("A I said AIR is not A I's fault");
    expect(spans.map((s) => s.w)).toEqual(["AI", "said", "AIR", "is", "not", "AI's", "fault"]);
    expect(spoken.slice(spans[0]!.a, spans[0]!.b)).toBe("A I");
    expect(spoken.slice(spans[2]!.a, spans[2]!.b)).toBe("AIR");
  });

  it("ElevenLabsTTS sends the substituted text but returns ORIGINAL words with the right timings", async () => {
    const original = "Try GPT-5 now";
    const spokenExpected = "Try G P T five now";
    let seen: { url: string; headers: Record<string, string>; body: any } | undefined;
    const fetchMock = (async (url: string, init: RequestInit) => {
      seen = { url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) };
      return json({ audio_base64: Buffer.from("abc").toString("base64"), alignment: alignmentFor(seen.body.text) });
    }) as unknown as typeof fetch;
    const tts = new ElevenLabsTTS({ apiKey: "test-key", fetch: fetchMock, pronunciation: [{ term: "GPT-5", say: "G P T five" }] });
    const r = await tts.synthesize({ elevenVoiceId: "voiceX", text: original, settings: { stability: 0.4 }, seed: 7 });
    expect(seen!.url).toContain("/v1/text-to-speech/voiceX/with-timestamps");
    expect(seen!.headers["xi-api-key"]).toBe("test-key");
    expect(seen!.body.text).toBe(spokenExpected);
    expect(seen!.body.voice_settings).toEqual({ stability: 0.4 });
    expect(seen!.body.seed).toBe(7);
    expect(r.words.map((w) => w.w)).toEqual(["Try", "GPT-5", "now"]);
    // "GPT-5" covers spoken chars 4..14 ("G P T five") => 400ms..1400ms
    expect(r.words[1]).toEqual({ w: "GPT-5", startMs: 400, endMs: 1400 });
    expect(r.durationMs).toBe(spokenExpected.length * 100);
    expect(r.mime).toBe("audio/mpeg");
    expect(r.audio.toString()).toBe("abc");
  });

  it("never puts the key in an error message", async () => {
    const tts = new ElevenLabsTTS({ apiKey: "secret-key-123", fetch: (async () => json({ detail: "nope" }, 401)) as unknown as typeof fetch });
    await expect(tts.synthesize({ elevenVoiceId: "v", text: "x" })).rejects.toThrow(/401/);
    await expect(tts.synthesize({ elevenVoiceId: "v", text: "x" })).rejects.not.toThrow(/secret-key-123/);
  });
});

describe("LLM clients", () => {
  const schema = z.object({ a: z.number() });
  it("AnthropicLLM extracts fenced JSON, parses it and prices usage", async () => {
    let body: any;
    const f = (async (_u: string, init: RequestInit) => {
      body = JSON.parse(init.body as string);
      expect((init.headers as Record<string, string>)["x-api-key"]).toBe("k");
      return json({ content: [{ type: "text", text: 'Sure:\n```json\n{"a": 3}\n```' }], usage: { input_tokens: 1000, output_tokens: 100 } });
    }) as unknown as typeof fetch;
    const r = await new AnthropicLLM({ apiKey: "k", fetch: f }).complete({ model: "claude-sonnet-x", system: "s", prompt: "p", schema });
    expect(r.data).toEqual({ a: 3 });
    expect(r.usage).toEqual({ inputTokens: 1000, outputTokens: 100 });
    expect(r.usd).toBeGreaterThan(0);
    expect(body.system).toBe("s");
  });

  it("throws SchemaError when the answer does not match the contract", async () => {
    const f = (async () => json({ content: [{ type: "text", text: '{"a":"x"}' }], usage: {} })) as unknown as typeof fetch;
    await expect(new AnthropicLLM({ apiKey: "k", fetch: f }).complete({ model: "m", system: "", prompt: "", schema })).rejects.toBeInstanceOf(SchemaError);
    const g = (async () => json({ content: [{ type: "text", text: "no json here" }], usage: {} })) as unknown as typeof fetch;
    await expect(new AnthropicLLM({ apiKey: "k", fetch: g }).complete({ model: "m", system: "", prompt: "", schema })).rejects.toBeInstanceOf(SchemaError);
  });

  it("OpenAICompatibleLLM posts chat/completions with a bearer key", async () => {
    let url = "";
    const f = (async (u: string, init: RequestInit) => {
      url = u;
      expect((init.headers as Record<string, string>).authorization).toBe("Bearer k2");
      return json({ choices: [{ message: { content: '{"a": 1}' } }], usage: { prompt_tokens: 10, completion_tokens: 5 } });
    }) as unknown as typeof fetch;
    const r = await new OpenAICompatibleLLM({ apiKey: "k2", baseUrl: "https://example.test/v1/", fetch: f }).complete({ model: "gpt-x", system: "s", prompt: "p", schema });
    expect(url).toBe("https://example.test/v1/chat/completions");
    expect(r.data.a).toBe(1);
  });

  it("LyriaMusic reads inlineData from the first audio part and uses the clip model for <=30 s", async () => {
    let url = "";
    const f = (async (u: string) => {
      url = u;
      return json({ candidates: [{ content: { parts: [{ text: "lyrics" }, { inlineData: { data: Buffer.from("mp3!").toString("base64"), mimeType: "audio/mpeg" } }] } }] });
    }) as unknown as typeof fetch;
    const r = await new LyriaMusic({ apiKey: "g", fetch: f }).generate({ prompt: "calm", seconds: 30 });
    expect(url).toContain("lyria-3-clip-preview:generateContent");
    expect(r.audio.toString()).toBe("mp3!");
  });
});

describe("mocks", () => {
  it("MockTTS makes a valid silent WAV at 150 wpm with evenly spaced words", async () => {
    const text = Array.from({ length: 75 }, (_, i) => `w${i}`).join(" ");
    const r = await new MockTTS().synthesize({ elevenVoiceId: "x", text });
    expect(r.durationMs).toBe(30000);
    expect(r.audio.toString("ascii", 0, 4)).toBe("RIFF");
    expect(r.audio.toString("ascii", 8, 12)).toBe("WAVE");
    expect(r.audio.readUInt32LE(40)).toBe(r.audio.length - 44);
    expect(r.words).toHaveLength(75);
    expect(r.words[1]!.startMs - r.words[0]!.startMs).toBe(400);
  });

  it("MockMusic and MockLLM are deterministic and network free", async () => {
    const m = await new MockMusic().generate({ prompt: "p", seconds: 2 });
    expect(m.audio.readUInt32LE(40)).toBe(2 * 8000 * 2);
    const llm = new MockLLM({ handlers: { brainstorm: ['{"a":1}'] } });
    const r = await llm.complete({ model: "m", system: "", prompt: "", schema: z.object({ a: z.number() }), task: "brainstorm" });
    expect(r.data.a).toBe(1);
    expect(extractJson("x {\"k\": [1, {\"z\": \"}\"}]} y")).toEqual({ k: [1, { z: "}" }] });
  });
});
