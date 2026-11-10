import type { z } from "zod";
import type { WordTiming } from "@wjnp/contracts";

export type JsonSchema<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

export interface LLMRequest<T> {
  model: string;
  system: string;
  prompt: string;
  schema: JsonSchema<T>;
  maxTokens?: number;
  /** optional label (TaskKind); real providers ignore it, MockLLM routes on it */
  task?: string;
}

export interface LLMResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  usd: number;
}

export interface LLM {
  /** provider label, e.g. "anthropic", "openai-compatible", "mock" */
  readonly family: string;
  /** Implementations ask for JSON only, extract it, parse with the schema, throw SchemaError on failure. */
  complete<T>(req: LLMRequest<T>): Promise<LLMResult<T>>;
}

export type VoiceSettings = Record<string, number | boolean | string>;

export interface TTSRequest {
  elevenVoiceId: string;
  text: string;
  settings?: VoiceSettings;
  seed?: number;
}

export interface TTSResult {
  audio: Buffer;
  mime: string;
  durationMs: number;
  /** timings keep the ORIGINAL words (before pronunciation substitution) */
  words: WordTiming[];
  usd: number;
}

export interface TTS {
  synthesize(req: TTSRequest): Promise<TTSResult>;
}

export interface MusicRequest {
  prompt: string;
  seconds: number;
}

export interface MusicResult {
  audio: Buffer;
  mime: string;
  usd: number;
}

export interface Music {
  generate(req: MusicRequest): Promise<MusicResult>;
}
