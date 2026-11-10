import type { ZodIssue } from "zod";

export interface SchemaErrorDetails {
  model?: string;
  /** truncated raw model output (never contains credentials) */
  raw?: string;
  issues?: ZodIssue[];
  usd?: number;
  usage?: { inputTokens: number; outputTokens: number };
}

/** A model answer that could not be extracted as JSON or did not parse against the zod contract. */
export class SchemaError extends Error {
  override name = "SchemaError";
  details: SchemaErrorDetails;
  constructor(message: string, details: SchemaErrorDetails = {}) {
    super(message);
    this.details = details;
  }
}

/** A step-level rule (code-side) rejected an otherwise parseable output. Escalates like a SchemaError. */
export class TaskValidationError extends Error {
  override name = "TaskValidationError";
}

export class ConfigError extends Error {
  override name = "ConfigError";
}

export class ProviderError extends Error {
  override name = "ProviderError";
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    if (status !== undefined) this.status = status;
  }
}

export class EscalationExhaustedError extends Error {
  override name = "EscalationExhaustedError";
  attempts: { tier: string; model: string; reason: string }[];
  /** money already spent on the failed attempts */
  costs: unknown[] = [];
  constructor(taskId: string, attempts: { tier: string; model: string; reason: string }[]) {
    super(`task ${taskId} failed on every tier: ` + attempts.map((a) => `${a.tier}(${a.model}): ${a.reason}`).join(" | "));
    this.attempts = attempts;
  }
}

export class VerifierIndependenceError extends Error {
  override name = "VerifierIndependenceError";
}

export class BudgetExceededError extends Error {
  override name = "BudgetExceededError";
  amountUsd: number;
  spentUsd: number;
  budgetUsd: number;
  constructor(amountUsd: number, spentUsd: number, budgetUsd: number) {
    super(
      `weekly budget would be exceeded: spent $${spentUsd.toFixed(2)} + $${amountUsd.toFixed(2)} > $${budgetUsd.toFixed(2)}. Owner OK required.`,
    );
    this.amountUsd = amountUsd;
    this.spentUsd = spentUsd;
    this.budgetUsd = budgetUsd;
  }
}
