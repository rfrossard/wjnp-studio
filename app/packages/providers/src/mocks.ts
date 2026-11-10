import type { WordTiming } from "@wjnp/contracts";
import { DURATION_RULES } from "@wjnp/contracts";
import type { LLM, LLMRequest, LLMResult, Music, MusicRequest, MusicResult, TTS, TTSRequest, TTSResult } from "./interfaces";
import { parseModelOutput } from "./llm-common";
import { DEFAULT_RESPONDERS } from "./mock-responders";
import { parseContextBlock } from "./prompts";

export type MockResponder = (ctx: any, req: LLMRequest<unknown>) => unknown; // eslint-disable-line @typescript-eslint/no-explicit-any

export interface MockLLMOptions {
  /**
   * Per task kind: a function (ctx, req) => output, or a queue of outputs consumed one per call
   * (the last one repeats). An output may be an object (JSON-encoded) or a raw string.
   */
  handlers?: Record<string, MockResponder | unknown[]>;
  family?: string;
  usdPerCall?: number;
}

/** Deterministic, offline. Goes through the same JSON extraction + zod parsing as the real clients. */
export class MockLLM implements LLM {
  readonly family: string;
  readonly calls: { model: string; task: string; system: string; prompt: string }[] = [];
  private readonly queues = new Map<string, unknown[]>();

  constructor(private readonly opts: MockLLMOptions = {}) {
    this.family = opts.family ?? "mock";
  }

  async complete<T>(req: LLMRequest<T>): Promise<LLMResult<T>> {
    const task = req.task ?? "unknown";
    this.calls.push({ model: req.model, task, system: req.system, prompt: req.prompt });
    const ctx = parseContextBlock(req.prompt);
    const h = this.opts.handlers?.[task];
    let out: unknown;
    if (Array.isArray(h)) {
      const q = this.queues.get(task) ?? [...h];
      this.queues.set(task, q);
      out = q.length > 1 ? q.shift() : q[0];
    } else if (typeof h === "function") {
      out = h(ctx, req as LLMRequest<unknown>);
    } else {
      const d = DEFAULT_RESPONDERS[task];
      if (!d) throw new Error(`MockLLM has no responder for task "${task}"`);
      out = d(ctx as never);
    }
    const raw = typeof out === "string" ? out : JSON.stringify(out);
    const usage = { inputTokens: Math.ceil((req.system.length + req.prompt.length) / 4), outputTokens: Math.ceil(raw.length / 4) };
    const usd = this.opts.usdPerCall ?? 0;
    const data = parseModelOutput(raw, req.schema, { model: req.model, usd, usage });
    return { data, usage, usd };
  }
}

/* ---------------- audio ---------------- */

/** Valid silent PCM WAV (16-bit mono). */
export function silentWav(durationMs: number, sampleRate = 8000): Buffer {
  const samples = Math.round((durationMs / 1000) * sampleRate);
  const dataBytes = samples * 2;
  const b = Buffer.alloc(44 + dataBytes);
  b.write("RIFF", 0, "ascii");
  b.writeUInt32LE(36 + dataBytes, 4);
  b.write("WAVE", 8, "ascii");
  b.write("fmt ", 12, "ascii");
  b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); // PCM
  b.writeUInt16LE(1, 22); // mono
  b.writeUInt32LE(sampleRate, 24);
  b.writeUInt32LE(sampleRate * 2, 28);
  b.writeUInt16LE(2, 32);
  b.writeUInt16LE(16, 34);
  b.write("data", 36, "ascii");
  b.writeUInt32LE(dataBytes, 40);
  return b;
}

/** Silent WAV whose length follows 150 words/min, with evenly spaced word timings. */
export class MockTTS implements TTS {
  readonly calls: TTSRequest[] = [];
  async synthesize(req: TTSRequest): Promise<TTSResult> {
    this.calls.push(req);
    const tokens = req.text.split(/\s+/).filter(Boolean);
    const n = tokens.length;
    const durationMs = Math.round((n / DURATION_RULES.wordsPerMinute) * 60000);
    const words: WordTiming[] = tokens.map((w, i) => ({
      w,
      startMs: Math.round((i * durationMs) / n),
      endMs: Math.round(((i + 1) * durationMs) / n),
    }));
    return { audio: silentWav(durationMs), mime: "audio/wav", durationMs, words, usd: 0 };
  }
}

export class MockMusic implements Music {
  readonly calls: MusicRequest[] = [];
  async generate(req: MusicRequest): Promise<MusicResult> {
    this.calls.push(req);
    return { audio: silentWav(req.seconds * 1000), mime: "audio/wav", usd: 0 };
  }
}
