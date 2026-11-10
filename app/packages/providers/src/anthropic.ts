import type { LLM, LLMRequest, LLMResult } from "./interfaces";
import { ProviderError } from "./errors";
import { JSON_ONLY_SUFFIX, parseModelOutput, readErrorBody, requireKey } from "./llm-common";
import { usdForTokens, type Price } from "./pricing";

export interface AnthropicOptions {
  apiKey?: string; // default: process.env.ANTHROPIC_API_KEY (never logged)
  baseUrl?: string;
  fetch?: typeof fetch;
  anthropicVersion?: string;
  temperature?: number; // omitted unless set (some newer models restrict it)
  prices?: { match: RegExp; price: Price }[];
}

/** Anthropic Messages API (POST /v1/messages). */
export class AnthropicLLM implements LLM {
  readonly family = "anthropic";
  constructor(private readonly opts: AnthropicOptions = {}) {}

  async complete<T>(req: LLMRequest<T>): Promise<LLMResult<T>> {
    const key = requireKey(this.opts.apiKey, "ANTHROPIC_API_KEY");
    const f = this.opts.fetch ?? fetch;
    const res = await f(`${this.opts.baseUrl ?? "https://api.anthropic.com"}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": this.opts.anthropicVersion ?? "2023-06-01",
      },
      body: JSON.stringify({
        model: req.model,
        max_tokens: req.maxTokens ?? 8192,
        system: req.system,
        messages: [{ role: "user", content: req.prompt + JSON_ONLY_SUFFIX }],
        ...(this.opts.temperature !== undefined ? { temperature: this.opts.temperature } : {}),
      }),
    });
    if (!res.ok) throw new ProviderError(`anthropic ${res.status}: ${await readErrorBody(res)}`, res.status);
    const body = (await res.json()) as {
      content?: { type: string; text?: string }[];
      usage?: { input_tokens?: number; output_tokens?: number };
    };
    const text = (body.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
    const usage = { inputTokens: body.usage?.input_tokens ?? 0, outputTokens: body.usage?.output_tokens ?? 0 };
    const usd = usdForTokens(req.model, usage, this.opts.prices);
    const data = parseModelOutput(text, req.schema, { model: req.model, usd, usage });
    return { data, usage, usd };
  }
}
