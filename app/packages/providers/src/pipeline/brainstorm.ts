import { Brief, type Episode } from "@wjnp/contracts";
import { z } from "zod";
import { guardText } from "../guard";
import type { RadarTheme } from "../radar";
import { clone, collectStrings, runLlmTask, type PipelineDeps } from "./common";

export interface BrainstormInput {
  themes: RadarTheme[];
  ownerNotes?: string;
}

const MUST_AVOID = ["naming banks", "market forecasts"];

/** Frontier tier: radar themes + owner notes => Brief (exactly 3 messages, tone, closing question). */
export async function brainstormBrief(episode: Episode, deps: PipelineDeps, input: BrainstormInput): Promise<Episode> {
  const ep = clone(episode);
  const { value } = await runLlmTask(ep, deps, {
    id: "brainstorm",
    kind: "brainstorm",
    prompt: "brainstorm",
    context: { themes: input.themes, ownerNotes: input.ownerNotes ?? "", weekOf: ep.weekOf },
    schema: Brief as z.ZodType<z.infer<typeof Brief>, z.ZodTypeDef, unknown>,
    validate: (b) => {
      if (!b.closingQuestion.trim()) return "closingQuestion is empty";
      const bad = guardText(collectStrings(b).join("\n"), deps.modules);
      return bad.length ? `brief violates guard: ${bad.join(", ")}` : undefined;
    },
  });
  ep.brief = {
    ...value,
    messages: value.messages.map((m, i) => ({ ...m, id: `m${i + 1}`, claimIds: [] })),
    avoid: [...new Set([...value.avoid, ...MUST_AVOID])],
  };
  return ep;
}
