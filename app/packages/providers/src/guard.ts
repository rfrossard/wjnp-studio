import type { ModulesData } from "./modules";

const BUILTIN_FORECAST = [
  /\bprice targets?\b/i,
  /\bwill (soar|surge|skyrocket|plummet|crash|double|triple)\b/i,
  /\b(forecast|projected|expected) to (reach|grow|hit|exceed)\b/i,
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Cheap code-side pre-check so a bad model output escalates before the real core validators run.
 * It does NOT replace packages/core compliance/factuality validators.
 */
export function guardText(text: string, modules: Pick<ModulesData, "blocklist" | "banned">): string[] {
  const problems: string[] = [];
  for (const e of modules.blocklist.entities) {
    for (const name of [e.name, ...e.aliases]) {
      if (!name) continue;
      if (new RegExp(`(?<![\\p{L}\\p{N}])${esc(name)}(?![\\p{L}\\p{N}])`, "iu").test(text)) problems.push(`blocked name "${name}"`);
    }
  }
  const regexes: { id: string; re: RegExp }[] = [];
  for (const p of [...modules.blocklist.patterns, ...modules.banned.patterns]) {
    try {
      regexes.push({ id: p.id, re: new RegExp(p.regex, "iu") });
    } catch {
      /* a broken rule file must not crash generation; core lint reports it */
    }
  }
  BUILTIN_FORECAST.forEach((re, i) => regexes.push({ id: `forecast-${i + 1}`, re }));
  for (const { id, re } of regexes) if (re.test(text)) problems.push(`pattern ${id}`);
  const lower = text.toLowerCase();
  for (const ph of modules.banned.phrases) if (ph && lower.includes(ph.toLowerCase())) problems.push(`banned phrase "${ph}"`);
  return problems;
}
