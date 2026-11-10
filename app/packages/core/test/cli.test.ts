import { describe, expect, it } from "vitest";
import { parseArgs, run } from "../src/cli.ts";
import { tempRoot } from "./helpers.ts";

async function cli(root: string, ...argv: string[]) {
  const lines: string[] = [];
  const code = await run(argv, { root, out: (l = "") => lines.push(l), err: (l = "") => lines.push(l) });
  return { code, text: lines.join("\n") };
}

describe("cli", () => {
  it("parses flags", () => {
    expect(parseArgs(["gate", "x", "--save", "--title", "Hi", "--k=v"])).toEqual({ _: ["gate", "x"], flags: { save: true, title: "Hi", k: "v" } });
  });
  it("gate / lint / validate / plan / regress / new / library", async () => {
    const { root } = tempRoot();
    const g = await cli(root, "gate", "sample-illustrative");
    expect(g.code).toBe(1);
    expect(g.text).toContain("timing.master_duration");
    expect(g.text).toContain("GATE: FAIL");
    expect((await cli(root, "lint", "sample-illustrative")).code).toBe(0);
    expect((await cli(root, "validate")).text).toContain("OK   sample-illustrative");
    const plan = await cli(root, "plan", "sample-illustrative", "--escalate", "fill_scene.s01", "--reason", "weak");
    expect(plan.text).toContain("escalated fill_scene.s01: mid → frontier (weak)");
    const r1 = await cli(root, "regress");
    expect(r1.code).toBe(0);
    expect(r1.text).toContain("baseline created");
    const r2 = await cli(root, "regress");
    expect(r2.text).not.toContain("baseline created");
    expect(r2.text).toContain("Regression: PASS");
    expect((await cli(root, "new", "2026-w47-x", "--title", "X", "--week", "2026-11-16")).code).toBe(0);
    expect((await cli(root, "validate", "2026-w47-x")).code).toBe(0);
    expect((await cli(root, "library")).text).toContain("Library is empty.");
    expect((await cli(root, "bogus")).code).toBe(1);
  });
  it("feedback add / list / propose / apply", async () => {
    const { root } = tempRoot();
    const { writeModuleFile } = await import("./helpers.ts");
    writeModuleFile(root, "modules/voice/banned-phrases.json", `{ "phrases": [] }\n`);
    const add = await cli(root, "feedback", "add", "Never", "say", "paradigm", "--episode", "sample-illustrative");
    const id = /Logged (\S+)/.exec(add.text)![1]!;
    const prop = await cli(root, "feedback", "propose", "--feedback", id, "--module", "voice", "--file", "banned-phrases.json", "--before", `"phrases": []`, "--after", `"phrases": ["paradigm"]`, "--rationale", "ban");
    expect(prop.code).toBe(0);
    const pid = /Proposal (\S+)/.exec(prop.text)![1]!;
    const apply = await cli(root, "feedback", "apply", pid);
    expect(apply.text).toContain("→ 0.0.1");
    expect((await cli(root, "feedback", "list")).text).toContain("applied");
  });
});
