import type { Accent, Asset, Episode, Finding, Scene } from "@wjnp/contracts";
import type { BlocklistFile, FactualityRulesFile, PostFormatFile } from "../modules.ts";
import { DEFAULT_ACCENTS, DEFAULT_BLOCKLIST, DEFAULT_FACTUALITY, DEFAULT_POST_FORMAT } from "../modules.ts";
import type { Store } from "../store.ts";

/** Everything a validator needs besides the episode. Built from the store, or defaults for pure use. */
export interface ValidationContext {
  factuality: FactualityRulesFile;
  blocklist: BlocklistFile;
  postFormat: PostFormatFile;
  accents: Accent[];
  getAsset: (id: string) => Asset | undefined;
  /** YYYY-MM-DD used for validUntil checks */
  today: string;
}

export function todayIso(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function defaultContext(over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    factuality: DEFAULT_FACTUALITY,
    blocklist: DEFAULT_BLOCKLIST,
    postFormat: DEFAULT_POST_FORMAT,
    accents: DEFAULT_ACCENTS,
    getAsset: () => undefined,
    today: todayIso(),
    ...over,
  };
}

export function contextFromStore(store: Store, over: Partial<ValidationContext> = {}): ValidationContext {
  return {
    factuality: store.factualityRules(),
    blocklist: store.blocklist(),
    postFormat: store.postFormat(),
    accents: store.designTokens().accents,
    getAsset: (id) => store.getAsset(id),
    today: todayIso(),
    ...over,
  };
}

export type Validator = (ep: Episode, ctx: ValidationContext) => Finding[];

export function sortedScenes(ep: Episode): Scene[] {
  return [...ep.scenes].sort((a, b) => a.order - b.order);
}

export const err = (rule: string, message: string, extra: Partial<Finding> = {}): Finding => ({ rule, severity: "error", message, ...extra });
export const warn = (rule: string, message: string, extra: Partial<Finding> = {}): Finding => ({ rule, severity: "warning", message, ...extra });
export const info = (rule: string, message: string, extra: Partial<Finding> = {}): Finding => ({ rule, severity: "info", message, ...extra });
