import { ClaimKind, Evidence, type Claim, type Episode } from "@wjnp/contracts";
import { z } from "zod";
import { guardText } from "../guard";
import { addDays, clone, runLlmTask, slug, type PipelineDeps } from "./common";

export interface ExtractInput {
  /** plain text of each source, keyed by source id */
  sourceTexts: Record<string, string>;
}

const ExtractOut = z.object({
  claims: z
    .array(
      z.object({
        id: z.string().min(1),
        text: z.string().min(1),
        kind: ClaimKind,
        value: z.object({ display: z.string(), number: z.number().optional(), unit: z.string().optional() }).optional(),
        speaker: z.string().optional(),
        evidence: z.array(Evidence).min(1),
      }),
    )
    .min(1),
});
type ExtractOut = z.infer<typeof ExtractOut>;

const squash = (s: string) =>
  s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, " ").trim().toLowerCase();

/** Mid tier: atomic claims, each with evidence quotes that must appear verbatim in the provided source text. */
export async function extractClaims(episode: Episode, deps: PipelineDeps, input: ExtractInput): Promise<Episode> {
  const ep = clone(episode);
  const sources = ep.sources.filter((s) => input.sourceTexts[s.id]);
  if (sources.length === 0) throw new Error("extractClaims: no source text provided for any episode source");
  const known = new Map(sources.map((s) => [s.id, squash(input.sourceTexts[s.id]!)]));

  const { value, model } = await runLlmTask(ep, deps, {
    id: "extract-claims",
    kind: "extract_claims",
    prompt: "extract_claims",
    context: {
      sources: sources.map((s) => ({ id: s.id, publisher: s.publisher, title: s.title, tier: s.tier, kind: s.kind, text: input.sourceTexts[s.id] })),
    },
    schema: ExtractOut,
    validate: (out: ExtractOut) => {
      const problems: string[] = [];
      for (const c of out.claims) {
        if (c.kind === "number" && !c.value) problems.push(`${c.id}: number claim without value`);
        if (c.kind === "quote" && !c.speaker) problems.push(`${c.id}: quote claim without speaker`);
        const bad = guardText(c.text, deps.modules);
        if (bad.length) problems.push(`${c.id}: ${bad.join(", ")}`);
        for (const e of c.evidence) {
          const text = known.get(e.sourceId);
          if (text === undefined) problems.push(`${c.id}: evidence source "${e.sourceId}" unknown or has no text`);
          else if (!text.includes(squash(e.quote))) problems.push(`${c.id}: evidence quote not found verbatim in ${e.sourceId}`);
        }
      }
      return problems.length ? problems.slice(0, 6).join("; ") : undefined;
    },
  });

  const now = deps.now();
  const taken = new Set<string>();
  ep.claims = value.claims.map((c, i): Claim => {
    let id = slug(c.id, `c-${i + 1}`);
    while (taken.has(id)) id = `${id}-${i + 1}`;
    taken.add(id);
    return {
      id,
      text: c.text,
      kind: c.kind,
      ...(c.value ? { value: c.value } : {}),
      ...(c.speaker ? { speaker: c.speaker } : {}),
      evidence: c.evidence,
      verdict: "unverified",
      author: { model },
      validUntil: addDays(now, deps.modules.factuality.validityDays[c.kind]),
    };
  });
  return ep;
}
