import type { JsonSchema } from "./interfaces";
import { ConfigError, SchemaError } from "./errors";
import { extractJson } from "./util";

export const JSON_ONLY_SUFFIX =
  "\n\nRespond with ONE JSON value only. No prose, no markdown fences, no comments. It must satisfy the schema described above.";

/** Extract JSON from raw model text and parse it with the zod contract; throws SchemaError. */
export function parseModelOutput<T>(
  raw: string,
  schema: JsonSchema<T>,
  ctx: { model: string; usd?: number; usage?: { inputTokens: number; outputTokens: number } },
): T {
  const base = { model: ctx.model, raw: raw.slice(0, 600), ...(ctx.usd !== undefined ? { usd: ctx.usd } : {}), ...(ctx.usage ? { usage: ctx.usage } : {}) };
  let json: unknown;
  try {
    json = extractJson(raw);
  } catch (e) {
    throw new SchemaError(`model ${ctx.model}: ${(e as Error).message}`, base);
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new SchemaError(
      `model ${ctx.model}: output does not match schema: ` +
        parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; "),
      { ...base, issues: parsed.error.issues },
    );
  }
  return parsed.data;
}

export async function readErrorBody(res: Response): Promise<string> {
  try {
    return (await res.text()).slice(0, 300);
  } catch {
    return "";
  }
}

export function requireKey(explicit: string | undefined, envName: string): string {
  const key = explicit ?? process.env[envName];
  if (!key) throw new ConfigError(`${envName} is not set`);
  return key;
}
