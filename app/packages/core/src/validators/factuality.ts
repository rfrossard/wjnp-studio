import type { Claim, Episode, Finding } from "@wjnp/contracts";
import { err, warn, type ValidationContext } from "./context.ts";

/** Facts before script: scenes cite only verified, independently sourced, unexpired claims. */
export function validateFactuality(ep: Episode, ctx: ValidationContext): Finding[] {
  const out: Finding[] = [];
  const claims = new Map(ep.claims.map((c) => [c.id, c]));
  const sources = new Map(ep.sources.map((s) => [s.id, s]));
  const min = ctx.factuality.minIndependentSources;

  for (const c of ep.claims) {
    const at = { claimId: c.id };
    for (const ev of c.evidence) {
      if (!sources.has(ev.sourceId)) out.push(err("factuality.evidence_source_missing", `claim ${c.id}: evidence cites unknown source ${ev.sourceId}`, at));
    }
    if (c.validUntil && c.validUntil < ctx.today) out.push(err("factuality.expired", `claim ${c.id} expired on ${c.validUntil}`, at));
    if (c.verdict !== "verified") continue;

    const counted = c.evidence.map((e) => sources.get(e.sourceId)).filter((s) => s && s.tier !== "reference_only");
    const publishers = new Set(counted.map((s) => s!.publisher.trim().toLowerCase()));
    if (publishers.size < min)
      out.push(err("factuality.independent_sources", `claim ${c.id}: ${publishers.size} independent publisher(s), needs ≥ ${min} (reference_only sources do not count)`, at));
    if (ctx.factuality.requirePrimarySource && !counted.some((s) => s!.tier === "primary"))
      out.push(err("factuality.primary_source", `claim ${c.id}: no primary source in its evidence`, at));
    if (!c.verifier) out.push(err("factuality.verifier_missing", `claim ${c.id} is verified but has no verifier`, at));
    else if (c.author && c.author.model === c.verifier.model)
      out.push(err("factuality.self_verified", `claim ${c.id}: verifier model (${c.verifier.model}) must differ from author model`, at));
  }

  const verifiedClaim = (id: string): Claim | undefined => {
    const c = claims.get(id);
    return c && c.verdict === "verified" ? c : undefined;
  };

  for (const s of ep.scenes) {
    const at = { sceneId: s.id };
    for (const id of s.claimIds) {
      const c = claims.get(id);
      if (!c) out.push(err("factuality.claim_missing", `scene ${s.id} cites unknown claim ${id}`, { ...at, claimId: id }));
      else if (c.verdict !== "verified") out.push(err("factuality.claim_unverified", `scene ${s.id} cites claim ${id} with verdict "${c.verdict}"`, { ...at, claimId: id }));
    }
    const os = s.onScreen;
    if (os.template === "stat") {
      const c = verifiedClaim(os.claimId);
      if (!c || c.kind !== "number" || !c.value?.display)
        out.push(err("factuality.stat_claim", `stat scene ${s.id} needs a verified number claim with value.display (got ${os.claimId})`, { ...at, claimId: os.claimId }));
    }
    if (os.template === "quote_card" || os.template === "clip") {
      const c = verifiedClaim(os.claimId);
      if (!c || c.kind !== "quote")
        out.push(err("factuality.quote_claim", `${os.template} scene ${s.id} needs a verified quote claim (got ${os.claimId})`, { ...at, claimId: os.claimId }));
    }
  }

  for (const m of ep.brief.messages) {
    const ids = new Set([...m.claimIds, ...ep.scenes.filter((s) => s.messageId === m.id).flatMap((s) => s.claimIds)]);
    if (![...ids].some((id) => verifiedClaim(id))) out.push(warn("factuality.message_unsupported", `message ${m.id} has no verified claim behind it`));
  }
  return out;
}
