import type { TTS, TTSRequest, TTSResult } from "./interfaces";
import { ProviderError } from "./errors";
import { readErrorBody, requireKey } from "./llm-common";
import { alignmentDurationMs, spansToWordTimings, type Alignment } from "./alignment";
import { applyPronunciation, type PronunciationEntry } from "./pronunciation";

export interface ElevenLabsOptions {
  apiKey?: string; // default process.env.ELEVENLABS_API_KEY (never logged)
  baseUrl?: string;
  fetch?: typeof fetch;
  modelId?: string; // UNVERIFIED: default "eleven_multilingual_v2" is the documented API default
  outputFormat?: string; // default mp3_44100_128 (documented default)
  /** modules/audio/pronunciation.json */
  pronunciation?: PronunciationEntry[];
  /** cost estimate; depends on the subscription plan */
  usdPer1kChars?: number; // UNVERIFIED against live pricing
}

export const DEFAULT_ELEVEN_USD_PER_1K_CHARS = 0.12; // UNVERIFIED against live pricing

export function mimeForOutputFormat(fmt: string): string {
  if (fmt.startsWith("mp3")) return "audio/mpeg";
  if (fmt.startsWith("pcm")) return "audio/pcm";
  if (fmt.startsWith("opus")) return "audio/ogg";
  if (fmt.startsWith("ulaw") || fmt.startsWith("alaw")) return "audio/basic";
  return "audio/mpeg";
}

/** POST /v1/text-to-speech/{voice_id}/with-timestamps */
export class ElevenLabsTTS implements TTS {
  constructor(private readonly opts: ElevenLabsOptions = {}) {}

  async synthesize(req: TTSRequest): Promise<TTSResult> {
    const key = requireKey(this.opts.apiKey, "ELEVENLABS_API_KEY");
    const f = this.opts.fetch ?? fetch;
    const fmt = this.opts.outputFormat ?? "mp3_44100_128";
    const { spoken, spans: rawSpans } = applyPronunciation(req.text, this.opts.pronunciation ?? []);
    // Per-voice request options ride inside settings (so they are part of the cache key) and are
    // pulled out here: model_id, language_code, and text_prefix (an audio tag such as
    // "[Brazilian accent] " that the model performs but does not speak).
    const { model_id: voiceModel, language_code: languageCode, text_prefix: textPrefix, ...voiceSettings } = (req.settings ?? {}) as Record<string, unknown>;
    const prefix = typeof textPrefix === "string" ? textPrefix : "";
    const fullText = prefix + spoken;
    const spans = rawSpans.map((sp) => ({ ...sp, a: sp.a + prefix.length, b: sp.b + prefix.length }));
    const url =
      `${this.opts.baseUrl ?? "https://api.elevenlabs.io"}/v1/text-to-speech/${encodeURIComponent(req.elevenVoiceId)}/with-timestamps` +
      `?output_format=${encodeURIComponent(fmt)}`;
    const res = await f(url, {
      method: "POST",
      headers: { "content-type": "application/json", "xi-api-key": key },
      body: JSON.stringify({
        text: fullText,
        model_id: (typeof voiceModel === "string" ? voiceModel : undefined) ?? this.opts.modelId ?? "eleven_multilingual_v2",
        ...(typeof languageCode === "string" ? { language_code: languageCode } : {}),
        ...(req.settings ? { voice_settings: voiceSettings } : {}),
        ...(req.seed !== undefined ? { seed: req.seed } : {}),
      }),
    });
    if (!res.ok) throw new ProviderError(`elevenlabs ${res.status}: ${await readErrorBody(res)}`, res.status);
    const body = (await res.json()) as { audio_base64?: string; alignment?: Alignment | null };
    if (!body.audio_base64) throw new ProviderError("elevenlabs: response has no audio_base64");
    if (!body.alignment || !body.alignment.characters?.length) throw new ProviderError("elevenlabs: response has no alignment");
    const words = spansToWordTimings(body.alignment, fullText, spans);
    return {
      audio: Buffer.from(body.audio_base64, "base64"),
      mime: mimeForOutputFormat(fmt),
      // UNVERIFIED: duration is taken from the last character end time, not from decoding the audio.
      durationMs: alignmentDurationMs(body.alignment),
      words,
      usd: (req.text.length / 1000) * (this.opts.usdPer1kChars ?? DEFAULT_ELEVEN_USD_PER_1K_CHARS),
    };
  }
}
