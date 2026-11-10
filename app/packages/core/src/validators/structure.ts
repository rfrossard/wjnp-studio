import type { Episode, Finding } from "@wjnp/contracts";
import { err, sortedScenes, type ValidationContext } from "./context.ts";

export function validateStructure(ep: Episode, _ctx?: ValidationContext): Finding[] {
  const out: Finding[] = [];
  if (ep.scenes.length === 0) return [err("structure.no_scenes", "episode has no scenes")];

  const ids = new Set<string>();
  for (const s of ep.scenes) {
    if (ids.has(s.id)) out.push(err("structure.duplicate_scene_id", `duplicate scene id ${s.id}`, { sceneId: s.id }));
    ids.add(s.id);
  }
  const orders = ep.scenes.map((s) => s.order).sort((a, b) => a - b);
  if (orders.some((o, i) => o !== i)) out.push(err("structure.order", `scene orders must be unique and consecutive from 0 (got ${orders.join(",")})`));

  const sorted = sortedScenes(ep);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  if (first.onScreen.template !== "title_hook") out.push(err("structure.first_title_hook", `first scene ${first.id} must be title_hook`, { sceneId: first.id }));
  if (last.onScreen.template !== "end_card") out.push(err("structure.last_end_card", `last scene ${last.id} must be end_card`, { sceneId: last.id }));

  const msgIds = new Set(ep.brief.messages.map((m) => m.id));
  for (const s of ep.scenes)
    if (s.messageId && !msgIds.has(s.messageId)) out.push(err("structure.unknown_message", `scene ${s.id} serves unknown message ${s.messageId}`, { sceneId: s.id }));
  for (const m of ep.brief.messages)
    if (!ep.scenes.some((s) => s.messageId === m.id)) out.push(err("structure.message_unserved", `message ${m.id} is not served by any scene`));
  return out;
}
