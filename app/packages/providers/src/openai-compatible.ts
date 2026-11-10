import type { LLM, LLMRequest, LLMResult } from "./interfaces";
import { ProviderError } from "./errors";
import { JSON_ONLY_SUFFIX, parseModelOutput, readErrorBody, requireKey } from "./llm-common";
import { usdForTokens, type Price } from "./pricing";

export interface OpenAICompatibleOptions {
  /** e.g. https://api.openai.com/v1 — read from env OPENAI_COMPAT_BASE_URL when omitted */
  baseUrl?: string;
  baseUrlEnv?: string;
  apiKey?: string;
  apiKeyEnv?: string; // default OPENAI_COMPAT_API_KEY
  fetch?: typeof fetch;
  /** "max_tokens" (most compatible servers) or "max_completion_tokens" (newer OpenAI models) */
  maxTokensParam?: "max_tokens" | "max_completion_tokens"; // UNVERIFIED against live API
  /** send response_format: {type:"json_object"}; disable for servers that reject it */
  jsonMode?: boolean; // UNVERIFIED against live API
  prices?: { match: RegExp; price: Price }[];
  family?: string;
}

/** Chat Completions compatible endpoint; used for the verifier/critic from a different model family. */
export class OpenAICompatibleLLM implements LLM {
  readonly family: string;
  constructor(private readonly opts: OpenAICompatibleOptions = {}) {
    this.family = opts.family ?? "openai-compatible";
  }

  async complete<T>(req: LLMRequest<T>): Promise<LLMResult<T>> {
    const key = requireKey(this.opts.apiKey, this.opts.apiKeyEnv ?? "OPENAI_COMPAT_API_KEY");
    const base = (this.opts.baseUrl ?? process.env[this.opts.baseUrlEnv ?? "OPENAI_COMPAT_BASE_URL"] ?? "https://api.openai.com/v1").replace(/\/$/, "");
    const f = this.opts.fetch ?? fetch;
    const res = await f(`${base}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: req.model,
        [this.opts.maxTokensParam ?? "max_tokens"]: req.maxTokens ?? 8192,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.prompt + JSON_ONLY_SUFFIX },
        ],
        ...(this.opts.jsonMode === false ? {} : { response_format: { type: "json_object" } }),
      }),
    });
    if (!res.ok) throw new ProviderError(`openai-compatible ${res.status}: ${await readErrorBody(res)}`, res.status);
    const body = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
      usage?: { prompt_tokens?: number; completion_tokens?: number };
    };
    const text = body.choices?.[0]?.message?.content ?? "";
    const usage = { inputTokens: body.usage?.prompt_tokens ?? 0, outputTokens: body.usage?.completion_tokens ?? 0 };
    const usd = usdForTokens(req.model, usage, this.opts.prices);
    const data = parseModelOutput(text, req.schema, { model: req.model, usd, usage });
    return { data, usage, usd };
  }
}
