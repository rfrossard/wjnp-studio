/**
 * Style library: which of the 36 styles fits each scene of an episode, chosen as a coherent set.
 *
 * Rules (from the motion-director planner and quality gate, adapted to this studio):
 * - Variety budget: one base style carries the episode; at most two accents (DESIGN_RULES.maxStyles = 3).
 * - Coherence: an accent sits within 1 step of the base on formality and 2 steps on energy, and
 *   comes from a different family (an accent that looks like the base adds nothing).
 * - Bookends (title_hook, end_card) keep the base, so the episode opens and closes in one voice.
 * - Accents take a scene only where they are strong for its template and the base is not, and never
 *   more than 40% of the scenes, never two different accents back to back.
 * - A style that needs something unavailable (footage, an external engine, paid generation) is out,
 *   and so is any style below the bar in the library audit.
 * - Transitions are objects: inside one style use its own exit; at a style change hand off with the
 *   outgoing exit if the incoming style can enter that way, otherwise a dip.
 */
import fs from "node:fs";
import path from "node:path";
import { DESIGN_RULES, type NarratorTone } from "@wjnp/contracts";

export interface LibraryStyle {
  id: string;
  name: string;
  family: string;
  engine: "wjnp" | "kit2";
  needs: string[];
  energy: number;
  formality: number;
  topics: string[];
  templates: string[];
  strongFor: string[];
  bestFor: string[];
  avoidFor: string[];
  transitions: { in: string[]; out: string[] };
  baton: string;
  requiredTraits: string[];
  gate: { status: "passed" | "draft" | "below"; score?: number };
  brandSafe: boolean;
  note?: string;
  preview: string | null;
}

export function loadStyleLibrary(root: string): LibraryStyle[] {
  return JSON.parse(fs.readFileSync(path.join(root, "modules", "styles", "catalog.json"), "utf8")) as LibraryStyle[];
}

/** What each narrator tone asks of a style, on the catalog's 1-5 scales. */
export const TONE_TARGET: Record<NarratorTone, { energy: number; formality: number }> = {
  formal: { energy: 2, formality: 5 },
  analytical: { energy: 2, formality: 4 },
  conversational: { energy: 3, formality: 3 },
  energetic: { energy: 4, formality: 2 },
  playful: { energy: 5, formality: 1 },
};

export interface StylePlanInput {
  topicWords: string[];
  tone: NarratorTone;
  scenes: { id: string; template: string }[];
  /** what this episode can supply; anything a style needs beyond this rules it out */
  available?: string[];
  /** allow styles still in draft (not yet through the independent review) */
  allowDraft?: boolean;
  /** only styles this renderer can draw today ("wjnp"), or the kit 2 too */
  engines?: ("wjnp" | "kit2")[];
  maxStyles?: number;
}

export interface StylePlan {
  base: string;
  accents: string[];
  scenes: { sceneId: string; template: string; style: string; why: string; drawAs?: string }[];
  joins: { from: string; to: string; transition: string; baton: string }[];
  ranked: { id: string; score: number }[];
  excluded: { id: string; reason: string }[];
}

const norm = (s: string) => s.toLowerCase().trim();

export function topicHits(s: LibraryStyle, topicWords: string[]): number {
  const words = topicWords.map(norm).filter(Boolean);
  return s.topics.filter((t) => words.some((w) => t.includes(w) || w.includes(t))).length;
}

/** When a style cannot draw a template, the nearest one it can, in order of preference. */
export const ADAPT: Record<string, string[]> = {
  personal_take: ["statement", "quote_card"],
  quote_card: ["statement", "personal_take"],
  bullets: ["timeline", "statement"],
  timeline: ["bullets", "statement"],
  comparison: ["bullets", "stat", "statement"],
  stat: ["statement"],
  statement: ["title_hook", "personal_take"],
  clip: [],
};

export function scoreStyle(s: LibraryStyle, input: StylePlanInput): number {
  const topic = topicHits(s, input.topicWords);
  const target = TONE_TARGET[input.tone];
  const tone = -Math.abs(s.energy - target.energy) - Math.abs(s.formality - target.formality);
  const templates = input.scenes.map((x) => x.template);
  const coverage = templates.length ? templates.filter((t) => s.templates.includes(t)).length / templates.length : 0;
  const audit = s.gate.status === "passed" ? 0.5 : 0;
  return 2 * topic + tone + 4 * coverage + audit;
}

export function planStyles(lib: LibraryStyle[], input: StylePlanInput): StylePlan {
  const max = Math.min(input.maxStyles ?? DESIGN_RULES.maxStyles, DESIGN_RULES.maxStyles);
  const available = new Set((input.available ?? []).map(norm));
  const engines = new Set(input.engines ?? ["wjnp", "kit2"]);
  const excluded: StylePlan["excluded"] = [];
  const usable = lib.filter((s) => {
    if (!engines.has(s.engine)) return excluded.push({ id: s.id, reason: `engine ${s.engine} not available` }), false;
    if (s.gate.status === "below") return excluded.push({ id: s.id, reason: "below the bar in the library audit" }), false;
    if (s.gate.status === "draft" && !input.allowDraft) return excluded.push({ id: s.id, reason: "draft: independent review pending" }), false;
    const missing = s.needs.filter((n) => !available.has(norm(n)));
    if (missing.length) return excluded.push({ id: s.id, reason: `needs ${missing.join(", ")}` }), false;
    return true;
  });
  if (!usable.length) throw new Error("no usable style for this episode");

  const ranked = usable.map((s) => ({ id: s.id, score: Math.round(scoreStyle(s, input) * 100) / 100 })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  const byId = new Map(lib.map((s) => [s.id, s]));
  // The base carries the episode, so it must be able to draw most of it: at least half the scenes.
  const cover = (s: LibraryStyle) => input.scenes.filter((x) => s.templates.includes(x.template)).length / Math.max(1, input.scenes.length);
  const base = byId.get((ranked.find((r) => cover(byId.get(r.id)!) >= 0.5) ?? ranked[0]!).id)!;

  const templates = [...new Set(input.scenes.map((s) => s.template))];
  const bookend = (t: string) => t === "title_hook" || t === "end_card";
  // gaps: templates the base cannot draw at all; weak: templates it draws but is not strong at
  const gaps = templates.filter((t) => !base.templates.includes(t) && !bookend(t));
  const weak = templates.filter((t) => base.templates.includes(t) && !base.strongFor.includes(t) && !bookend(t));
  const coherentWithBase = (s: LibraryStyle) => s.id !== base.id && Math.abs(s.formality - base.formality) <= 1 && Math.abs(s.energy - base.energy) <= 2 && s.family !== base.family && topicHits(s, input.topicWords) > 0;
  // An accent earns its place by filling gaps first; improving a weak template only counts as a tie-break.
  const accents: LibraryStyle[] = [];
  const open = new Set(gaps);
  const candidates = ranked.map((r) => byId.get(r.id)!).filter(coherentWithBase);
  while (accents.length < max - 1) {
    const pick = candidates
      .filter((s) => !accents.includes(s) && !accents.some((a) => a.family === s.family))
      .map((s) => ({ s, fills: [...open].filter((t) => s.templates.includes(t)).length, lifts: weak.filter((t) => s.strongFor.includes(t)).length }))
      .filter((c) => c.fills > 0 || (open.size === 0 && c.lifts > 0))
      .sort((a, b) => b.fills - a.fills || b.lifts - a.lifts)[0];
    if (!pick) break;
    accents.push(pick.s);
    for (const t of [...open]) if (pick.s.templates.includes(t)) open.delete(t);
  }

  const cap = Math.floor(input.scenes.length * 0.4);
  let accentScenes = 0;
  const scenes: StylePlan["scenes"] = [];
  for (const sc of input.scenes) {
    const prev = scenes[scenes.length - 1];
    const isGap = gaps.includes(sc.template);
    // a gap must be filled whatever the cap, since the base cannot draw it; a weak template only within the cap
    const filler = isGap ? accents.find((a) => a.templates.includes(sc.template)) : undefined;
    const lifter = !isGap && weak.includes(sc.template) ? accents.find((a) => a.strongFor.includes(sc.template)) : undefined;
    const pick = filler ?? lifter;
    const clash = !!pick && !!prev && prev.style !== base.id && prev.style !== pick.id;
    if (pick && (filler || (accentScenes < cap && !clash))) {
      accentScenes++;
      scenes.push({ sceneId: sc.id, template: sc.template, style: pick.id, why: filler ? `${base.name} cannot draw ${sc.template}; ${pick.name} can` : `${pick.name} is strong for ${sc.template}, ${base.name} is not` });
    } else {
      if (bookend(sc.template) || base.templates.includes(sc.template)) {
        scenes.push({ sceneId: sc.id, template: sc.template, style: base.id, why: bookend(sc.template) ? "bookends keep the base style" : `base style fits ${sc.template}` });
      } else {
        const as = (ADAPT[sc.template] ?? []).find((t) => base.templates.includes(t));
        scenes.push({ sceneId: sc.id, template: sc.template, style: base.id, ...(as ? { drawAs: as } : {}),
          why: as ? `${base.name} has no ${sc.template}; drawn as ${as} to keep one voice` : `UNCOVERED: no coherent style draws ${sc.template}; rework this scene or change its template` });
      }
    }
  }

  const joins: StylePlan["joins"] = [];
  for (let i = 1; i < scenes.length; i++) {
    const a = byId.get(scenes[i - 1]!.style)!, b = byId.get(scenes[i]!.style)!;
    if (a.id === b.id) { joins.push({ from: scenes[i - 1]!.sceneId, to: scenes[i]!.sceneId, transition: a.transitions.out[0]!, baton: a.baton }); continue; }
    const shared = a.transitions.out.find((t) => b.transitions.in.includes(t));
    joins.push({ from: scenes[i - 1]!.sceneId, to: scenes[i]!.sceneId, transition: shared ?? "dip", baton: shared ? a.baton : "dip through the episode ground" });
  }

  return { base: base.id, accents: accents.filter((a) => scenes.some((s) => s.style === a.id)).map((a) => a.id), scenes, joins, ranked, excluded };
}
