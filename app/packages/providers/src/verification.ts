import type { Claim, ClaimVerdict, Source } from "@wjnp/contracts";
import type { FactualityRules } from "./modules";

export interface RuleResult {
  ok: boolean;
  publishers: string[];
  hasPrimary: boolean;
  reasons: string[];
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

/**
 * Code-side verification rule: evidence must come from >= N independent publishers
 * (distinct, normalised publisher names; reference_only sources do not count) and,
 * when required, at least one of them is a primary source. A model can never override this.
 */
export function meetsVerificationRule(claim: Claim, sources: Source[], rules: Pick<FactualityRules, "minIndependentSources" | "requirePrimarySource">): RuleResult {
  const byId = new Map(sources.map((s) => [s.id, s]));
  const used = claim.evidence.map((e) => byId.get(e.sourceId)).filter((s): s is Source => !!s && s.tier !== "reference_only");
  const publishers = [...new Set(used.map((s) => norm(s.publisher)))];
  const hasPrimary = used.some((s) => s.tier === "primary");
  const reasons: string[] = [];
  if (publishers.length < rules.minIndependentSources) reasons.push(`only ${publishers.length} independent publisher(s), need ${rules.minIndependentSources}`);
  if (rules.requirePrimarySource && !hasPrimary) reasons.push("no primary source");
  return { ok: reasons.length === 0, publishers, hasPrimary, reasons };
}

/** Final verdict = model verdict, but "verified" is granted only when the code rule also holds. */
export function finalVerdict(modelVerdict: ClaimVerdict, rule: RuleResult): { verdict: ClaimVerdict; note?: string } {
  if (modelVerdict === "verified" && !rule.ok) {
    return { verdict: "partial", note: `model said verified but rule failed: ${rule.reasons.join("; ")}` };
  }
  return { verdict: modelVerdict };
}
