import type { Episode, Finding } from "@wjnp/contracts";
import { validateCompliance } from "./compliance.ts";
import type { ValidationContext } from "./context.ts";
import { validateDesign } from "./design.ts";
import { validateFactuality } from "./factuality.ts";
import { validateLicensing } from "./licensing.ts";
import { validateStructure } from "./structure.ts";
import { episodeDurations, validateTiming } from "./timing.ts";

export interface GateReport {
  findings: Finding[];
  durations: { masterSeconds: number; cutSeconds: number };
  gatePass: boolean;
}

export const VALIDATORS = {
  structure: validateStructure,
  factuality: validateFactuality,
  compliance: validateCompliance,
  design: validateDesign,
  timing: validateTiming,
  licensing: validateLicensing,
} as const;

export function runGate(ep: Episode, ctx: ValidationContext): GateReport {
  const findings = Object.values(VALIDATORS).flatMap((v) => v(ep, ctx));
  const failedScenes = ep.scenes.filter((s) => s.gate && !s.gate.pass);
  for (const s of failedScenes) findings.push({ rule: "gate.scene_failed", severity: "error", message: `scene ${s.id} failed its quality gate`, sceneId: s.id });
  const gatePass = !findings.some((f) => f.severity === "error");
  return { findings, durations: episodeDurations(ep), gatePass };
}
