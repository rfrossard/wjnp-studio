import { describe, expect, it } from "vitest";
import { approve, ApprovalError } from "../src/index.ts";
import { tempRoot } from "./helpers.ts";

const ID = "sample-illustrative";

describe("approvals", () => {
  it("refuses publish before final, then publishes and sets ownerConfirmedAt", () => {
    const { store } = tempRoot({ withGoldenTimed: true });
    expect(() => approve(store, ID, "publish")).toThrow(ApprovalError);
    expect(store.getEpisode(ID).post?.ownerConfirmedAt).toBeUndefined();
    approve(store, ID, "brief");
    expect(approve(store, ID, "script").state).toBe("validated");
    expect(approve(store, ID, "final").state).toBe("approved");
    const ep = approve(store, ID, "publish", { now: new Date("2026-11-12T10:00:00Z") });
    expect(ep.post?.ownerConfirmedAt).toBe("2026-11-12T10:00:00.000Z");
    expect(store.getEpisode(ID).post?.ownerConfirmedAt).toBe("2026-11-12T10:00:00.000Z");
    expect(Object.keys(store.getApprovals(ID)).sort()).toEqual(["brief", "final", "publish", "script"]);
  });

  it("refuses final when the gate fails and script when there are factuality errors", () => {
    const { store } = tempRoot(); // golden is ~86 s ⇒ gate fails
    expect(() => approve(store, ID, "final")).toThrow(/gate fails/);
    const ep = store.getEpisode(ID);
    ep.claims[0]!.verdict = "unverified";
    store.saveEpisode(ep);
    try {
      approve(store, ID, "script");
      expect.unreachable();
    } catch (e) {
      expect((e as ApprovalError).findings.some((f) => f.rule === "factuality.claim_unverified")).toBe(true);
    }
  });

  it("saveEpisode can never set ownerConfirmedAt", () => {
    const { store } = tempRoot({ withGoldenTimed: true });
    const ep = store.getEpisode(ID);
    ep.post!.ownerConfirmedAt = "2026-11-12T10:00:00Z";
    expect(store.saveEpisode(ep).post?.ownerConfirmedAt).toBeUndefined();
    expect(store.getEpisode(ID).post?.ownerConfirmedAt).toBeUndefined();
    approve(store, ID, "final");
    approve(store, ID, "publish", { now: new Date("2026-11-12T10:00:00Z") });
    const again = store.getEpisode(ID);
    again.post!.ownerConfirmedAt = "2030-01-01T00:00:00Z";
    expect(() => store.saveEpisode(again)).toThrow(/locked/);
    expect(store.getEpisode(ID).post?.ownerConfirmedAt).toBe("2026-11-12T10:00:00.000Z");
    expect(store.getEpisode(ID).approvals.publish).toBe("2026-11-12T10:00:00.000Z");
  });

  it("approvals cannot be set by a save, and editing the script withdraws script and final approvals", () => {
    const { store } = tempRoot({ withGoldenTimed: true });
    const forged = store.getEpisode(ID);
    forged.approvals = { final: "2026-11-12T10:00:00Z" };
    expect(store.saveEpisode(forged).approvals).toEqual({});
    approve(store, ID, "script");
    approve(store, ID, "final");
    expect(Object.keys(store.getEpisode(ID).approvals).sort()).toEqual(["final", "script"]);
    const edited = store.getEpisode(ID);
    edited.scenes[1]!.narration.text += " One more sentence.";
    const saved = store.saveEpisode(edited);
    expect(saved.approvals).toEqual({});
    expect(saved.state).toBe("validated");
    expect(() => approve(store, ID, "publish")).toThrow(/final/);
  });
});
