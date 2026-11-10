import { ClaimVerdict, type Episode } from "@wjnp/contracts";
import { z } from "zod";
import { VerifierIndependenceError } from "../errors";
import { finalVerdict, meetsVerificationRule } from "../verification";
import { clone, runLlmTask, type PipelineDeps } from "./common";

const VerifyOut = z.object({
  verdicts: z.array(z.object({ claimId: z.string(), reasons: z.array(z.string()).default([]), verdict: ClaimVerdict })),
});
type VerifyOut = z.infer<typeof VerifyOut>;

/** Throws if the verifier is the same model as an author of any claim (or the same client object). */
export function assertIndependentVerifier(ep: Episode, deps: PipelineDeps, verifierModel: string): void {
  const authors = new Set(ep.claims.map((c) => c.author?.model.toLowerCase()).filter((m): m is string => !!m));
  if (authors.has(verifierModel.toLowerCase())) {
    throw new VerifierIndependenceError(`verifier model "${verifierModel}" is also an author model; the verifier must differ from the author`);
  }
  if ((deps.verifierLlm as unknown) === (deps.llm as unknown)) {
    throw new VerifierIndependenceError("verifierLlm and llm are the same client; use a client of a different model family");
  }
}

/**
 * Verifier model sets the verdict, but "verified" is only granted when the code rule also holds
 * (>= N independent publishers, one primary). The model cannot override the rule.
 */
export async function verifyClaims(episode: Episode, deps: PipelineDeps): Promise<Episode> {
  const ep = clone(episode);
  if (ep.claims.length === 0) return ep;
  const verifierModel = deps.router.resolve("verify_claims").model;
  assertIndependentVerifier(ep, deps, verifierModel);

  const srcById = new Map(ep.sources.map((s) => [s.id, s]));
  const { value, model } = await runLlmTask(ep, deps, {
    id: "verify-claims",
    kind: "verify_claims",
    prompt: "verify_claims",
    useVerifierLlm: true,
    context: {
      claims: ep.claims.map((c) => ({
        id: c.id,
        kind: c.kind,
        text: c.text,
        ...(c.value ? { value: c.value } : {}),
        ...(c.speaker ? { speaker: c.speaker } : {}),
        evidence: c.evidence.map((e) => ({ ...e, publisher: srcById.get(e.sourceId)?.publisher, sourceTier: srcById.get(e.sourceId)?.tier })),
      })),
    },
    schema: VerifyOut,
    validate: (out: VerifyOut) => {
      const ids = new Set(out.verdicts.map((v) => v.claimId));
      const missing = ep.claims.filter((c) => !ids.has(c.id)).map((c) => c.id);
      return missing.length ? `no verdict for claims: ${missing.join(", ")}` : undefined;
    },
  });
  // the escalation ladder never changes the verifier family, but re-check the model that actually answered
  assertIndependentVerifier(ep, deps, model);

  const at = deps.now().toISOString();
  const verdicts = new Map(value.verdicts.map((v) => [v.claimId, v]));
  for (const c of ep.claims) {
    const v = verdicts.get(c.id)!;
    const rule = meetsVerificationRule(c, ep.sources, deps.modules.factuality);
    const fin = finalVerdict(v.verdict, rule);
    c.verdict = fin.verdict;
    c.verifier = { model, at };
    const notes = [...v.reasons, ...(fin.note ? [fin.note] : [])].filter(Boolean);
    if (notes.length) c.notes = notes.join(" | ");
    else delete c.notes;
  }
  return ep;
}
