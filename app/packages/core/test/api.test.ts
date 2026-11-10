import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createApp, type Fetcher } from "../src/index.ts";
import { golden, tempRoot } from "./helpers.ts";

const ID = "sample-illustrative";
const fetcher: Fetcher = async () => ({ status: 200, contentType: "text/html", body: "<title>Fetched</title>" });

function setup(opts: { withGoldenTimed?: boolean } = {}) {
  const t = tempRoot(opts);
  const app = createApp(t.root, { fetcher });
  const req = (path: string, init?: RequestInit) => app.request(path, init);
  const json = (method: string, path: string, body: unknown) =>
    app.request(path, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  return { ...t, req, json };
}

describe("HTTP API", () => {
  it("health, modules, radar", async () => {
    const { req, root } = setup();
    expect(await (await req("/api/health")).json()).toEqual({ ok: true, version: "0.1.0" });
    const mods = (await (await req("/api/modules")).json()) as { name: string; protected: boolean }[];
    expect(mods).toHaveLength(11);
    expect(mods.find((m) => m.name === "compliance")?.protected).toBe(true);
    expect(await (await req("/api/radar")).json()).toEqual({ generatedAt: null, themes: [] });
    mkdirSync(join(root, "episodes/_radar"), { recursive: true });
    writeFileSync(join(root, "episodes/_radar/latest.json"), JSON.stringify({ generatedAt: "2026-11-09T00:00:00Z", themes: [{ id: "t1" }] }));
    expect(((await (await req("/api/radar")).json()) as { themes: unknown[] }).themes).toHaveLength(1);
  });

  it("episodes: list, get, put, create, findings", async () => {
    const { req, json } = setup();
    expect(await (await req("/api/episodes")).json()).toEqual([
      { id: ID, title: golden().title, weekOf: "2026-11-09", state: "draft", golden: true },
    ]);
    const ep = await (await req(`/api/episodes/${ID}`)).json();
    expect(ep.id).toBe(ID);
    expect((await req("/api/episodes/nope")).status).toBe(404);

    expect((await json("PUT", `/api/episodes/${ID}`, { ...ep, title: "" })).status).toBe(400);
    const put = await json("PUT", `/api/episodes/${ID}`, { ...ep, title: "New", post: { ...ep.post, ownerConfirmedAt: "2026-11-09T00:00:00Z" } });
    expect(put.status).toBe(200);
    const saved = await put.json();
    expect(saved.title).toBe("New");
    expect(saved.post.ownerConfirmedAt).toBeUndefined();

    const f = await (await req(`/api/episodes/${ID}/findings`)).json();
    expect(f.gatePass).toBe(false);
    expect(f.durations.masterSeconds).toBeCloseTo(85.6, 0);
    expect(f.findings.some((x: { rule: string }) => x.rule === "timing.master_duration")).toBe(true);

    const created = await json("POST", "/api/episodes", { id: "2026-w46-test", title: "T", weekOf: "2026-11-16", brief: golden().brief });
    expect(created.status).toBe(201);
    const c = await created.json();
    expect(c.audio.narratorVoiceId).toBe("voice-roberto");
    expect(c.design.accent.hex).toMatch(/^#/);
    expect((await json("POST", "/api/episodes", { id: "2026-w46-test", title: "T", weekOf: "2026-11-16", brief: golden().brief })).status).toBe(409);
  });

  it("approvals: publish refused before final", async () => {
    const { json } = setup({ withGoldenTimed: true });
    const r = await json("POST", `/api/episodes/${ID}/approve`, { target: "publish" });
    expect(r.status).toBe(409);
    expect((await r.json()).error).toMatch(/final/);
    expect((await json("POST", `/api/episodes/${ID}/approve`, { target: "final" })).status).toBe(200);
    const p = await json("POST", `/api/episodes/${ID}/approve`, { target: "publish" });
    expect((await p.json()).post.ownerConfirmedAt).toBeTruthy();
    expect((await json("POST", `/api/episodes/${ID}/approve`, { target: "bogus" })).status).toBe(400);
  });

  it("kit and static files with traversal protection", async () => {
    const { req, root } = setup();
    const k = await (await req(`/api/episodes/${ID}/kit`)).json();
    expect(k.files).toContain("kit/post.txt");
    expect(k.postText).toContain("Views are my own.");
    const file = await req(`/api/episodes/${ID}/files/kit/post.txt`);
    expect(file.status).toBe(200);
    expect(await file.text()).toBe(k.postText);
    expect((await req(`/api/episodes/${ID}/files/kit/missing.txt`)).status).toBe(404);
    expect((await req(`/api/episodes/${ID}/files/..%2Fepisode.json`)).status).toBe(400);
    expect((await req(`/api/episodes/${ID}/files/kit/..%2F..%2Fepisode.json`)).status).toBe(400);
    mkdirSync(join(root, "brand/mark"), { recursive: true });
    writeFileSync(join(root, "brand/mark/m.svg"), "<svg/>");
    const b = await req("/api/brand/mark/m.svg");
    expect(b.headers.get("content-type")).toBe("image/svg+xml");
    expect((await req("/api/brand/..%2FCLAUDE.md")).status).toBe(400);
  });

  it("library + import", async () => {
    const { req, json } = setup();
    const r = await json("POST", "/api/import", { input: "https://news.example.com/x" });
    expect(r.status).toBe(201);
    const a = await r.json();
    expect(a.title).toBe("Fetched");
    expect(a.license.kind).toBe("unknown");
    expect(await (await req("/api/library?type=source")).json()).toHaveLength(1);
    expect(await (await req("/api/library?type=visual")).json()).toHaveLength(0);
    expect((await req("/api/library?type=bogus")).status).toBe(400);
  });

  it("feedback + proposals approve/reject", async () => {
    const { req, json, root, store } = setup();
    mkdirSync(join(root, "modules/voice"), { recursive: true });
    writeFileSync(join(root, "modules/voice/banned-phrases.json"), `{ "phrases": [] }\n`);
    const fr = await json("POST", "/api/feedback", { kind: "comment", text: "Never say synergy" });
    expect(fr.status).toBe(201);
    const fb = await fr.json();
    expect(fb.scope).toBe("standing");
    expect(await (await req("/api/feedback")).json()).toHaveLength(1);

    const { createProposal } = await import("../src/index.ts");
    const p = createProposal(store, { feedbackIds: [fb.id], module: "voice", file: "banned-phrases.json", before: `"phrases": []`, after: `"phrases": ["synergy"]`, rationale: "ban" });
    expect((await (await req("/api/proposals")).json())[0].id).toBe(p.id);
    const ap = await (await req(`/api/proposals/${p.id}/approve`, { method: "POST" })).json();
    expect(ap.status).toBe("applied");
    expect(ap.appliedVersion).toBe("0.0.1");
    const mods = (await (await req("/api/modules")).json()) as { name: string; version: string }[];
    expect(mods.find((m) => m.name === "voice")?.version).toBe("0.0.1");

    const fb2 = await (await json("POST", "/api/feedback", { kind: "comment", text: "another" })).json();
    const p2 = createProposal(store, { feedbackIds: [fb2.id], module: "voice", file: "banned-phrases.json", before: `["synergy"]`, after: `["synergy", "leverage"]`, rationale: "ban" });
    expect((await (await req(`/api/proposals/${p2.id}/reject`, { method: "POST" })).json()).status).toBe("rejected");
    expect((await req(`/api/proposals/nope/approve`, { method: "POST" })).status).toBe(404);
  });

  it("CORS allows localhost origins only", async () => {
    const { req } = setup();
    const ok = await req("/api/health", { headers: { origin: "http://localhost:5173" } });
    expect(ok.headers.get("access-control-allow-origin")).toBe("http://localhost:5173");
    const no = await req("/api/health", { headers: { origin: "https://evil.example" } });
    expect(no.headers.get("access-control-allow-origin")).toBeNull();
  });
});
