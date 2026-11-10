import type { Episode, Finding } from "@wjnp/contracts";
import type { Approvals, Store } from "./store.ts";
import { contextFromStore } from "./validators/context.ts";
import { validateCompliance } from "./validators/compliance.ts";
import { validateFactuality } from "./validators/factuality.ts";
import { runGate } from "./validators/gate.ts";

export type ApprovalTarget = "brief" | "script" | "final" | "publish";
export const APPROVAL_TARGETS: readonly ApprovalTarget[] = ["brief", "script", "final", "publish"];

export class ApprovalError extends Error {
  status = 409 as const;
  constructor(
    message: string,
    public findings: Finding[] = [],
  ) {
    super(message);
  }
}

/**
 * Explicit owner approvals. Recorded in `episodes/<id>/approvals.json`.
 * The publish approval is the ONLY code path that sets `post.ownerConfirmedAt`.
 */
export function approve(store: Store, episodeId: string, target: ApprovalTarget, opts: { now?: Date } = {}): Episode {
  if (!APPROVAL_TARGETS.includes(target)) throw new ApprovalError(`Unknown approval target: ${String(target)}`);
  const now = (opts.now ?? new Date()).toISOString();
  const ep = store.getEpisode(episodeId);
  const ctx = contextFromStore(store);
  const approvals: Approvals = store.getApprovals(episodeId);

  switch (target) {
    case "brief":
      break;
    case "script": {
      const errors = [...validateFactuality(ep, ctx), ...validateCompliance(ep, ctx)].filter((f) => f.severity === "error");
      if (errors.length) throw new ApprovalError(`Script cannot be approved: ${errors.length} factuality/compliance error(s)`, errors);
      if (ep.state === "draft") ep.state = "validated";
      break;
    }
    case "final": {
      const gate = runGate(ep, ctx);
      if (!gate.gatePass)
        throw new ApprovalError(`Final cannot be approved: gate fails`, gate.findings.filter((f) => f.severity === "error"));
      ep.state = "approved";
      break;
    }
    case "publish": {
      if (!approvals.final) throw new ApprovalError("Publish refused: the final video has not been approved");
      if (!ep.post) throw new ApprovalError("Publish refused: the episode has no post");
      const gate = runGate(ep, ctx);
      if (!gate.gatePass) throw new ApprovalError("Publish refused: gate no longer passes", gate.findings.filter((f) => f.severity === "error"));
      ep.state = "locked";
      approvals.publish = now;
      store.saveApprovals(episodeId, approvals);
      return store.saveEpisodeWithConfirmation(ep, now);
    }
  }
  approvals[target] = now;
  store.saveApprovals(episodeId, approvals);
  return store.saveEpisode(ep);
}
