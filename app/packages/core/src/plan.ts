import { Plan, type Episode, type ModelTier, type PlanTask, type TaskKind } from "@wjnp/contracts";
import { DEFAULT_ROUTING, type Routing } from "./modules.ts";
import { sortedScenes } from "./validators/context.ts";

export function modelFor(kind: TaskKind, tier: ModelTier, routing: Routing): string | undefined {
  if (kind === "verify_claims") return routing.verifier.model;
  if (kind === "critique_scene") return routing.critic.model;
  return routing.tiers[tier]?.model;
}

/** Deterministic plan: one task per kind, plus fill/critique/narrate per scene. */
export function buildPlan(ep: Episode, routing: Routing = DEFAULT_ROUTING): Plan {
  const tasks: PlanTask[] = [];
  const add = (id: string, kind: TaskKind, dependsOn: string[], sceneId?: string) => {
    const tier = routing.tasks[kind];
    const model = modelFor(kind, tier, routing);
    tasks.push({ id, kind, tier, ...(model ? { model } : {}), ...(sceneId ? { sceneId } : {}), dependsOn });
  };
  add("brainstorm", "brainstorm", []);
  add("plan", "plan", ["brainstorm"]);
  add("extract_claims", "extract_claims", ["plan"]);
  add("verify_claims", "verify_claims", ["extract_claims"]);
  add("write_script", "write_script", ["verify_claims"]);
  const scenes = sortedScenes(ep);
  for (const s of scenes) {
    add(`fill_scene.${s.id}`, "fill_scene", ["write_script"], s.id);
    add(`critique_scene.${s.id}`, "critique_scene", [`fill_scene.${s.id}`], s.id);
    add(`narrate.${s.id}`, "narrate", [`critique_scene.${s.id}`], s.id);
  }
  add("write_post", "write_post", ["write_script"]);
  add("lint", "lint", [...scenes.map((s) => `critique_scene.${s.id}`), "write_post"]);
  add("mix", "mix", scenes.length ? scenes.map((s) => `narrate.${s.id}`) : ["write_script"]);
  add("render", "render", ["lint", "mix"]);
  add("audit", "audit", ["render"]);
  return Plan.parse({ tasks, escalations: [] });
}

/** Move a task one step up the escalation ladder and record why. Returns a new plan. */
export function escalate(plan: Plan, taskId: string, reason: string, routing: Routing = DEFAULT_ROUTING, now: Date = new Date()): Plan {
  const task = plan.tasks.find((t) => t.id === taskId);
  if (!task) throw new Error(`No task ${taskId} in plan`);
  const ladder = routing.escalation;
  const idx = ladder.indexOf(task.tier);
  if (idx === -1) throw new Error(`Task ${taskId} runs on tier "${task.tier}", which is not on the escalation ladder (${ladder.join(" → ")})`);
  const to = ladder[idx + 1];
  if (!to) throw new Error(`Task ${taskId} is already at the top of the escalation ladder (${task.tier})`);
  const model = modelFor(task.kind, to, routing);
  const tasks = plan.tasks.map((t) => {
    if (t.id !== taskId) return t;
    const { model: _old, ...rest } = t;
    return { ...rest, tier: to, ...(model ? { model } : {}) };
  });
  return Plan.parse({
    tasks,
    escalations: [...plan.escalations, { taskId, from: task.tier, to, reason, at: now.toISOString() }],
  });
}
