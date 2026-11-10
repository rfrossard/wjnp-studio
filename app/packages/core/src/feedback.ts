import { Feedback, ModuleName, type ModuleName as ModuleNameT } from "@wjnp/contracts";
import { sha256Hex } from "./accent.ts";
import type { Store } from "./store.ts";

export interface FeedbackInput {
  kind: Feedback["kind"];
  text: string;
  episodeId?: string;
  before?: string;
  after?: string;
  target?: Feedback["target"];
}

export interface Classification {
  scope: "one_off" | "standing";
  module?: ModuleNameT;
}
export type Classifier = (fb: FeedbackInput) => Classification;

const STANDING = [
  /\balways\b/i,
  /\bnever\b/i,
  /\bevery (time|episode|video|week)\b/i,
  /\bfrom now on\b/i,
  /\bin general\b/i,
  /\bstop (using|doing|saying)\b/i,
  /\bdon'?t ever\b/i,
  /\bin all (episodes|videos)\b/i,
  /\bgoing forward\b/i,
];

const MODULE_KEYWORDS: [ModuleNameT, RegExp][] = [
  ["compliance", /\b(compliance|employer|legal|blocklist|mention(s|ing)? (of )?(my )?(company|bank))\b/i],
  ["factuality", /\b(source|sources|fact|facts|claim|claims|citation|cite|verify|verified|evidence)\b/i],
  ["publish", /\b(post|hashtags?|linkedin|first comment|disclaimer|caption text)\b/i],
  ["audio", /\b(voice|voices|music|pronunciation|pronounce|narrator|loud|volume|mix)\b/i],
  ["design", /\b(colou?rs?|font|fonts|accent|typography|spacing|motion|animation)\b/i],
  ["templates", /\b(template|templates|layout|scene type)\b/i],
  ["gate", /\b(gate|score|scores|criteria|critique)\b/i],
  ["orchestration", /\b(model|models|cost|budget|tier|routing|escalat\w*)\b/i],
  ["radar", /\b(radar|topic|topics|theme|themes|news|feed|feeds)\b/i],
  ["voice", /\b(tone|phrase|phrases|wording|word|words|script|sentence|cliché|cliche|jargon|say|says)\b/i],
];

/** Keyword classifier: standing if it states a rule ("always", "never", "from now on"…), module guessed from keywords. */
export const keywordClassifier: Classifier = (fb) => {
  const text = [fb.text, fb.before, fb.after].filter(Boolean).join(" ");
  const scope = fb.kind === "metric" || STANDING.some((r) => r.test(text)) ? "standing" : "one_off";
  const module = MODULE_KEYWORDS.find(([, re]) => re.test(text))?.[0];
  return { scope, ...(module ? { module } : {}) };
};

export function addFeedback(store: Store, input: FeedbackInput, opts: { classifier?: Classifier; now?: Date } = {}): Feedback {
  const at = (opts.now ?? new Date()).toISOString();
  const c = (opts.classifier ?? keywordClassifier)(input);
  const stamp = at.replace(/[-:TZ.]/g, "").slice(0, 14);
  const id = `fb-${stamp}-${sha256Hex(`${at}\n${input.kind}\n${input.text}`).slice(0, 6)}`;
  const module = input.target?.module ?? c.module;
  return store.appendFeedback(
    Feedback.parse({
      id,
      at,
      ...(input.episodeId ? { episodeId: input.episodeId } : {}),
      kind: input.kind,
      text: input.text,
      ...(input.before !== undefined ? { before: input.before } : {}),
      ...(input.after !== undefined ? { after: input.after } : {}),
      target: { ...(input.target ?? {}), ...(module ? { module: ModuleName.parse(module) } : {}) },
      scope: c.scope,
      status: "open",
    }),
  );
}

export function listFeedback(store: Store, filter: { status?: Feedback["status"]; episodeId?: string } = {}): Feedback[] {
  return store
    .listFeedback()
    .filter((f) => (!filter.status || f.status === filter.status) && (!filter.episodeId || f.episodeId === filter.episodeId));
}

export function updateFeedback(store: Store, id: string, patch: Partial<Feedback>): Feedback {
  const cur = store.getFeedback(id);
  if (!cur) throw new Error(`Feedback not found: ${id}`);
  return store.appendFeedback({ ...cur, ...patch, id });
}
