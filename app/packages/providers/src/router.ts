import type { CostEntry, Escalation, ModelTier, Plan, PlanTask, TaskKind } from "@wjnp/contracts";
import { EscalationExhaustedError, SchemaError, TaskValidationError } from "./errors";
import { defaultRouting, loadModules, type RoutingConfig } from "./modules";
import { isoWeekKey } from "./util";

/** Tasks whose model is pinned to a non-author family regardless of tier. */
const PINNED: Partial<Record<TaskKind, "verifier" | "critic">> = { verify_claims: "verifier", critique_scene: "critic" };

export interface Resolved {
  tier: ModelTier;
  model: string;
  pinned: boolean;
}

export interface RunContext {
  tier: ModelTier;
  model: string;
  attempt: number;
}
export interface RunOutput<T> {
  value: T;
  usd?: number;
  provider?: string;
}

export interface EscalationRequest<T> {
  task: { id: string; kind: TaskKind; tier?: ModelTier; sceneId?: string; dependsOn?: string[] };
  /** mutated: the task is registered and escalations are appended */
  plan: Plan;
  run: (ctx: RunContext) => Promise<RunOutput<T>>;
  /** return a reason string (or throw TaskValidationError) when the value is not acceptable */
  validate?: (value: T, ctx: RunContext) => string | null | undefined | void;
  now?: () => Date;
}

export interface EscalationResult<T> {
  value: T;
  tier: ModelTier;
  model: string;
  escalations: Escalation[];
  costs: CostEntry[];
}

export class Router {
  constructor(readonly config: RoutingConfig = defaultRouting()) {}

  static fromRoot(root?: string): Router {
    return new Router(loadModules(root).routing);
  }

  tierFor(kind: TaskKind): ModelTier {
    return this.config.tasks[kind] ?? "mid";
  }

  modelForTier(tier: ModelTier): string {
    return tier === "code" ? "code" : this.config.tiers[tier].model;
  }

  resolve(kind: TaskKind, tier: ModelTier = this.tierFor(kind)): Resolved {
    const pin = PINNED[kind];
    if (pin) return { tier, model: this.config[pin].model, pinned: true };
    return { tier, model: this.modelForTier(tier), pinned: false };
  }

  /** Tiers to try, starting at `start`, one step up the escalation ladder each time. */
  ladder(start: ModelTier): ModelTier[] {
    const i = this.config.escalation.indexOf(start);
    return i < 0 ? [start] : this.config.escalation.slice(i);
  }

  async runWithEscalation<T>(req: EscalationRequest<T>): Promise<EscalationResult<T>> {
    const now = req.now ?? (() => new Date());
    const startTier = req.task.tier ?? this.tierFor(req.task.kind);
    const first = this.resolve(req.task.kind, startTier);
    // pinned models (verifier/critic) never switch family: one same-model retry, no tier change
    const steps: Resolved[] = first.pinned
      ? [first, first]
      : this.ladder(startTier).map((t) => this.resolve(req.task.kind, t));
    const escalations: Escalation[] = [];
    const costs: CostEntry[] = [];
    const failures: { tier: string; model: string; reason: string }[] = [];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i]!;
      const ctx: RunContext = { tier: step.tier, model: step.model, attempt: i };
      let reason: string | undefined;
      try {
        const out = await req.run(ctx);
        costs.push(cost(req.task.id, out.provider ?? "llm", step.model, out.usd ?? 0, now()));
        reason = normalise(req.validate?.(out.value, ctx));
        if (reason === undefined) {
          this.register(req, step, escalations, costs);
          return { value: out.value, tier: step.tier, model: step.model, escalations, costs };
        }
      } catch (e) {
        if (e instanceof SchemaError) {
          if (e.details.usd) costs.push(cost(req.task.id, "llm", step.model, e.details.usd, now()));
          reason = `SchemaError: ${e.message}`;
        } else if (e instanceof TaskValidationError) {
          reason = `ValidationError: ${e.message}`;
        } else throw e; // network / config errors are not a reason to pay for a bigger model
      }
      failures.push({ tier: step.tier, model: step.model, reason });
      const next = steps[i + 1];
      if (next && !first.pinned) {
        escalations.push({ taskId: req.task.id, from: step.tier, to: next.tier, reason: reason.slice(0, 500), at: now().toISOString() });
      }
    }
    this.register(req, steps[steps.length - 1]!, escalations, costs);
    const err = new EscalationExhaustedError(req.task.id, failures);
    err.costs = costs;
    throw err;
  }

  private register<T>(req: EscalationRequest<T>, final: Resolved, escalations: Escalation[], _costs: CostEntry[]): void {
    const task: PlanTask = {
      id: req.task.id,
      kind: req.task.kind,
      tier: final.tier,
      model: final.model,
      dependsOn: req.task.dependsOn ?? [],
      ...(req.task.sceneId ? { sceneId: req.task.sceneId } : {}),
    };
    const existing = req.plan.tasks.findIndex((t) => t.id === task.id);
    if (existing >= 0) req.plan.tasks[existing] = task;
    else req.plan.tasks.push(task);
    req.plan.escalations.push(...escalations);
  }
}

function normalise(r: string | null | undefined | void): string | undefined {
  return typeof r === "string" && r.length > 0 ? r : undefined;
}

function cost(taskId: string, provider: string, model: string, usd: number, at: Date): CostEntry {
  return { taskId, provider, model, usd, at: at.toISOString() };
}

/* ---------------- budget ---------------- */

export type BudgetCheck =
  | { status: "ok"; spentUsd: number; remainingUsd: number; weeklyBudgetUsd: number; week: string }
  | { status: "needs_owner_ok"; spentUsd: number; amountUsd: number; projectedUsd: number; overByUsd: number; weeklyBudgetUsd: number; week: string };

/**
 * `costs`: cost entries of ALL episodes (entries outside the current ISO week are ignored).
 * `proposedUsd`: the spend about to happen. Above the weekly budget => owner OK required, with the amount.
 */
export function checkBudget(costs: CostEntry[], weeklyBudgetUsd: number, proposedUsd = 0, now: Date = new Date()): BudgetCheck {
  const week = isoWeekKey(now);
  const spentUsd = costs.filter((c) => isoWeekKey(new Date(c.at)) === week).reduce((s, c) => s + c.usd, 0);
  const projectedUsd = spentUsd + proposedUsd;
  if (projectedUsd > weeklyBudgetUsd) {
    return { status: "needs_owner_ok", spentUsd, amountUsd: proposedUsd, projectedUsd, overByUsd: projectedUsd - weeklyBudgetUsd, weeklyBudgetUsd, week };
  }
  return { status: "ok", spentUsd, remainingUsd: weeklyBudgetUsd - projectedUsd, weeklyBudgetUsd, week };
}
