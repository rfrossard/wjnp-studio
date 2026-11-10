import type { Music, MusicRequest, MusicResult } from "./interfaces";
import { ProviderError } from "./errors";
import { readErrorBody, requireKey } from "./llm-common";

export interface LyriaOptions {
  apiKey?: string; // default process.env.GEMINI_API_KEY (never logged)
  baseUrl?: string;
  fetch?: typeof fetch;
  clipModel?: string; // documented: lyria-3-clip-preview (fixed 30 s, MP3)
  proModel?: string; // documented: lyria-3-pro-preview (~2 min songs, MP3/WAV)
  usdPerGeneration?: number; // UNVERIFIED: pricing not found in the docs page
}

/**
 * Gemini API music generation: POST /v1beta/models/{model}:generateContent with
 * generationConfig.responseModalities = ["AUDIO","TEXT"]; audio arrives as base64 in
 * candidates[0].content.parts[].inlineData.data (confirmed on ai.google.dev/gemini-api/docs/music-generation).
 */
export class LyriaMusic implements Music {
  constructor(private readonly opts: LyriaOptions = {}) {}

  async generate(req: MusicRequest): Promise<MusicResult> {
    const key = requireKey(this.opts.apiKey, "GEMINI_API_KEY");
    const f = this.opts.fetch ?? fetch;
    // The clip model always yields 30 s and cannot be changed; longer asks go to the pro model.
    const model = req.seconds <= 30 ? (this.opts.clipModel ?? "lyria-3-clip-preview") : (this.opts.proModel ?? "lyria-3-pro-preview");
    // UNVERIFIED against live API: duration on the pro model is only influenced through the prompt text, not guaranteed.
    const prompt = `${req.prompt}\nInstrumental only, no vocals.${req.seconds > 30 ? ` Target length about ${Math.round(req.seconds)} seconds.` : ""}`;
    const res = await f(`${this.opts.baseUrl ?? "https://generativelanguage.googleapis.com"}/v1beta/models/${model}:generateContent`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["AUDIO", "TEXT"] },
      }),
    });
    if (!res.ok) throw new ProviderError(`lyria ${res.status}: ${await readErrorBody(res)}`, res.status);
    type Part = { inlineData?: { data?: string; mimeType?: string }; inline_data?: { data?: string; mime_type?: string } };
    const body = (await res.json()) as { candidates?: { content?: { parts?: Part[] } }[] };
    const parts = body.candidates?.[0]?.content?.parts ?? [];
    for (const p of parts) {
      const data = p.inlineData?.data ?? p.inline_data?.data;
      if (data) {
        // UNVERIFIED against live API: the docs do not name the MIME field; we read mimeType/mime_type and default to MP3.
        const mime = p.inlineData?.mimeType ?? p.inline_data?.mime_type ?? "audio/mpeg";
        return { audio: Buffer.from(data, "base64"), mime, usd: this.opts.usdPerGeneration ?? 0.04 /* UNVERIFIED */ };
      }
    }
    throw new ProviderError("lyria: response has no audio part");
  }
}
