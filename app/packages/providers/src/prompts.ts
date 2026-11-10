import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "prompts");

export type PromptName = "brainstorm" | "extract_claims" | "verify_claims" | "write_script" | "fill_scene" | "critique_scene" | "write_post";

export interface RenderedPrompt {
  system: string;
  prompt: string;
}

/** Fill {{placeholders}}; a placeholder with no value is an error (never ship half-filled prompts). */
export function fillTemplate(tpl: string, vars: Record<string, string>): string {
  return tpl.replace(/\{\{\s*([a-z_][a-z0-9_]*)\s*\}\}/gi, (_, k: string) => {
    if (!(k in vars)) throw new Error(`prompt placeholder {{${k}}} has no value`);
    return vars[k]!;
  });
}

/** Prompt files hold `<!-- SYSTEM -->` and `<!-- USER -->` sections. */
export function loadPrompt(name: PromptName, vars: Record<string, string>, dir: string = DIR): RenderedPrompt {
  const raw = readFileSync(join(dir, `${name}.md`), "utf8");
  const m = /<!--\s*SYSTEM\s*-->([\s\S]*?)<!--\s*USER\s*-->([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`prompt ${name}.md needs <!-- SYSTEM --> and <!-- USER --> sections`);
  return { system: fillTemplate(m[1]!.trim(), vars), prompt: fillTemplate(m[2]!.trim(), vars) };
}

export const CONTEXT_OPEN = "<<<CONTEXT";
export const CONTEXT_CLOSE = "CONTEXT>>>";

/** Context block that real models read as data and MockLLM parses back. */
export function contextBlock(data: unknown): string {
  return `${CONTEXT_OPEN}\n${JSON.stringify(data, null, 2)}\n${CONTEXT_CLOSE}`;
}

export function parseContextBlock(prompt: string): unknown {
  const i = prompt.indexOf(CONTEXT_OPEN);
  const j = prompt.indexOf(CONTEXT_CLOSE);
  if (i < 0 || j < i) return undefined;
  return JSON.parse(prompt.slice(i + CONTEXT_OPEN.length, j).trim());
}
