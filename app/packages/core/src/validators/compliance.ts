import type { Episode, Finding, OnScreen } from "@wjnp/contracts";
import { err, warn, type ValidationContext } from "./context.ts";

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Word-boundary, case-insensitive, Unicode-aware match for an entity name. */
export function entityRegex(term: string): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escapeRe(term.trim())}(?![\\p{L}\\p{N}_])`, "iu");
}

const NON_TEXT_KEYS = new Set(["template", "claimId", "clipAssetId", "startMs", "endMs"]);

export function onScreenStrings(os: OnScreen): string[] {
  const out: string[] = [];
  const walk = (v: unknown, key?: string) => {
    if (key && NON_TEXT_KEYS.has(key)) return;
    if (typeof v === "string") out.push(v);
    else if (Array.isArray(v)) v.forEach((x) => walk(x));
    else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, k);
  };
  walk(os);
  return out;
}

interface Text {
  where: string;
  text: string;
  sceneId?: string;
}

export function collectTexts(ep: Episode): Text[] {
  const texts: Text[] = [];
  for (const s of ep.scenes) {
    texts.push({ where: `scene ${s.id} narration`, text: s.narration.text, sceneId: s.id });
    for (const t of onScreenStrings(s.onScreen)) texts.push({ where: `scene ${s.id} on-screen`, text: t, sceneId: s.id });
  }
  if (ep.post) {
    texts.push({ where: "post", text: ep.post.text });
    if (ep.post.firstComment) texts.push({ where: "first comment", text: ep.post.firstComment });
    if (ep.post.hashtags.length) texts.push({ where: "hashtags", text: ep.post.hashtags.join(" ") });
  }
  return texts;
}

export function validateCompliance(ep: Episode, ctx: ValidationContext): Finding[] {
  const out: Finding[] = [];
  const texts = collectTexts(ep);

  const entityRes = ctx.blocklist.entities.flatMap((e) =>
    [e.name, ...e.aliases].filter((t) => t.trim()).map((term) => ({ entity: e, term, re: entityRegex(term) })),
  );
  const patterns = ctx.blocklist.patterns.flatMap((p) => {
    try {
      return [{ p, re: new RegExp(p.regex, "iu") }];
    } catch {
      out.push(warn("compliance.bad_pattern", `blocklist pattern ${p.id} is not a valid regex`));
      return [];
    }
  });

  for (const t of texts) {
    const extra = t.sceneId ? { sceneId: t.sceneId } : {};
    const hit = new Set<string>();
    for (const { entity, term, re } of entityRes) {
      if (hit.has(entity.name) || !re.test(t.text)) continue;
      hit.add(entity.name);
      out.push(err("compliance.blocked_entity", `${t.where} mentions blocked ${entity.category} entity "${entity.name}" (as "${term}")`, extra));
    }
    for (const { p, re } of patterns) {
      if (re.test(t.text)) out.push({ rule: `compliance.pattern.${p.id}`, severity: p.severity, message: `${t.where}: ${p.message}`, ...extra });
    }
  }

  for (const s of ep.scenes) {
    if (s.isOpinion && s.onScreen.template !== "personal_take")
      out.push(err("compliance.opinion_template", `opinion scene ${s.id} must use template personal_take (uses ${s.onScreen.template})`, { sceneId: s.id }));
    if (!s.isOpinion && s.onScreen.template === "personal_take")
      out.push(warn("compliance.opinion_flag", `personal_take scene ${s.id} should set isOpinion: true`, { sceneId: s.id }));
  }

  const required = ctx.postFormat.disclaimer.trim();
  if (!ep.post) out.push(warn("compliance.post_missing", "episode has no post yet (disclaimer cannot be checked)"));
  else if (required) {
    const composed = `${ep.post.text}\n${ep.post.disclaimer}`.toLowerCase();
    if (!composed.includes(required.toLowerCase())) out.push(err("compliance.disclaimer", `post must contain the disclaimer "${required}"`));
  }
  return out;
}
