import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  addFeedback,
  applyProposal,
  approveAndApply,
  approveProposal,
  ConflictError,
  createProposal,
  keywordClassifier,
  listFeedback,
  ProtectedModuleError,
  regress,
  regressProposal,
  rejectProposal,
} from "../src/index.ts";
import { tempRoot, writeModuleFile } from "./helpers.ts";

const BANNED = `{\n  "phrases": [],\n  "patterns": []\n}\n`;

function seedModules(root: string) {
  writeModuleFile(root, "modules/voice/manifest.json", JSON.stringify({ name: "voice", version: "1.0.0", description: "voice", files: ["banned-phrases.json"], protected: false }));
  writeModuleFile(root, "modules/voice/CHANGELOG.md", "# voice changelog\n\n## 1.0.0\n\n- initial\n");
  writeModuleFile(root, "modules/voice/banned-phrases.json", BANNED);
  writeModuleFile(root, "modules/compliance/blocklist.json", `{\n  "entities": [],\n  "patterns": []\n}\n`);
}

describe("feedback classification", () => {
  it("separates one-off from standing and guesses the module", () => {
    expect(keywordClassifier({ kind: "comment", text: "Never say 'game changer' again" })).toEqual({ scope: "standing", module: "voice" });
    expect(keywordClassifier({ kind: "comment", text: "Scene 3 colour is too dark" })).toEqual({ scope: "one_off", module: "design" });
    expect(keywordClassifier({ kind: "metric", text: "retention dropped at 0:40" }).scope).toBe("standing");
  });
  it("accepts an injected classifier and is append-only", () => {
    const { store, root } = tempRoot();
    const fb = addFeedback(store, { kind: "comment", text: "anything" }, { classifier: () => ({ scope: "standing", module: "gate" }) });
    expect(fb.scope).toBe("standing");
    expect(fb.target.module).toBe("gate");
    expect(listFeedback(store)).toHaveLength(1);
    expect(readFileSync(join(root, "feedback/feedback.jsonl"), "utf8").trim().split("\n")).toHaveLength(1);
  });
});

describe("feedback → proposal → regress → apply", () => {
  it("runs the full loop in a temp root", () => {
    const { store, root } = tempRoot();
    seedModules(root);
    const fb = addFeedback(store, { kind: "comment", text: "Never say 'game changer' again", episodeId: "sample-illustrative" });
    const p = createProposal(store, {
      feedbackIds: [fb.id],
      module: "voice",
      file: "modules/voice/banned-phrases.json",
      before: `"phrases": []`,
      after: `"phrases": ["game changer"]`,
      rationale: "Owner bans the phrase 'game changer'",
    });
    expect(p.status).toBe("pending");
    expect(store.getFeedback(fb.id)?.status).toBe("proposed");

    expect(() => applyProposal(store, p.id)).toThrow(ConflictError); // not approved
    const { proposal, result } = regressProposal(store, p.id);
    expect(result.passed).toBe(true);
    expect(result.episodes[0]?.baselineCreated).toBe(true);
    expect(proposal.regression?.passed).toBe(true);
    expect(JSON.parse(readFileSync(join(root, "episodes/_golden/sample-illustrative/baseline.json"), "utf8")).gatePass).toBe(false);

    approveProposal(store, p.id);
    const applied = applyProposal(store, p.id, { now: new Date("2026-11-10T09:00:00Z") });
    expect(applied.status).toBe("applied");
    expect(applied.appliedVersion).toBe("1.0.1");
    expect(JSON.parse(readFileSync(join(root, "modules/voice/banned-phrases.json"), "utf8")).phrases).toEqual(["game changer"]);
    expect(JSON.parse(readFileSync(join(root, "modules/voice/manifest.json"), "utf8")).version).toBe("1.0.1");
    expect(readFileSync(join(root, "modules/voice/CHANGELOG.md"), "utf8")).toContain("## 1.0.1 — 2026-11-10");
    expect(store.getFeedback(fb.id)?.status).toBe("applied");
    // a second regress (no override) against the stored baseline still passes
    expect(regress(store).passed).toBe(true);
  });

  it("blocks apply when the regression gets worse", () => {
    const { store, root } = tempRoot();
    seedModules(root);
    const fb = addFeedback(store, { kind: "comment", text: "block the word software" });
    const p = createProposal(store, {
      feedbackIds: [fb.id],
      module: "compliance",
      file: "modules/compliance/blocklist.json",
      before: `"entities": []`,
      after: `"entities": [{ "name": "software", "aliases": [], "category": "test" }]`,
      rationale: "owner instruction",
    });
    expect(() => approveAndApply(store, p.id)).toThrow(/Regression failed/);
    expect(store.getProposal(p.id).regression?.passed).toBe(false);
    expect(readFileSync(join(root, "modules/compliance/blocklist.json"), "utf8")).toContain(`"entities": []`);
    expect(rejectProposal(store, p.id).status).toBe("rejected");
    expect(store.getFeedback(fb.id)?.status).toBe("rejected");
  });

  it("refuses inexact before-text and paths outside the module", () => {
    const { store, root } = tempRoot();
    seedModules(root);
    const fb = addFeedback(store, { kind: "comment", text: "x" });
    const base = { feedbackIds: [fb.id], module: "voice", after: "y", rationale: "r" };
    expect(() => createProposal(store, { ...base, file: "modules/voice/banned-phrases.json", before: "not there" })).toThrow(/exactly once/);
    expect(() => createProposal(store, { ...base, file: "modules/voice/../compliance/blocklist.json", before: "{" })).toThrow(/inside modules\/voice/);
    expect(() => createProposal(store, { ...base, file: "modules/voice/manifest.json", before: "{" })).toThrow(/managed/);
  });
});

describe("protected modules", () => {
  it("refuses metrics-derived proposals on compliance/factuality/publish", () => {
    const { store, root } = tempRoot();
    seedModules(root);
    const metric = addFeedback(store, { kind: "metric", text: "posts with fewer disclaimers got more reach" });
    for (const module of ["compliance", "factuality", "publish"]) {
      expect(() =>
        createProposal(store, { feedbackIds: [metric.id], module, file: `modules/${module}/x.json`, before: "", after: "{}", rationale: "metrics" }),
      ).toThrow(ProtectedModuleError);
    }
    const owner = addFeedback(store, { kind: "comment", text: "owner says" });
    expect(() =>
      createProposal(store, { feedbackIds: [owner.id], module: "compliance", file: "modules/compliance/new.json", before: "", after: "{}", rationale: "r", derivedFromMetricsOnly: true }),
    ).toThrow(ProtectedModuleError);
    // a metrics-derived proposal on an unprotected module is fine
    const ok = createProposal(store, { feedbackIds: [metric.id], module: "voice", file: "modules/voice/new.json", before: "", after: "{}", rationale: "metrics" });
    expect(ok.derivedFromMetricsOnly).toBe(true);
  });
});
