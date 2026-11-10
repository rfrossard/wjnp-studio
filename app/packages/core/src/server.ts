import { existsSync, readFileSync, statSync } from "node:fs";
import { extname, join } from "node:path";
import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { AssetType, Feedback, License } from "@wjnp/contracts";
import { z } from "zod";
import { approve, APPROVAL_TARGETS, type ApprovalTarget } from "./approve.ts";
import { addFeedback } from "./feedback.ts";
import { importInput, httpFetcher, type Fetcher } from "./importer.ts";
import { writeKit } from "./kit.ts";
import { approveAndApply, rejectProposal } from "./proposals.ts";
import { safeJoin, Store } from "./store.ts";
import { contextFromStore } from "./validators/context.ts";
import { runGate } from "./validators/gate.ts";

export const VERSION = "0.1.0";
export const PORT = 4317;

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mp3": "audio/mpeg",
  ".wav": "audio/wav",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
  ".md": "text/markdown; charset=utf-8",
  ".srt": "application/x-subrip; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".pdf": "application/pdf",
};

const LOCALHOST = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

function statusOf(e: unknown): number {
  const s = (e as { status?: unknown })?.status;
  if (typeof s === "number") return s;
  if (e instanceof z.ZodError) return 400;
  if (e instanceof SyntaxError) return 400;
  return 500;
}

function fail(c: Context, e: unknown) {
  const status = statusOf(e);
  const details = e instanceof z.ZodError ? e.issues : (e as { findings?: unknown })?.findings;
  return c.json({ error: (e as Error)?.message ?? String(e), ...(details ? { details } : {}) }, status as 400);
}

async function body(c: Context): Promise<unknown> {
  try {
    return await c.req.json();
  } catch {
    throw Object.assign(new Error("Body must be JSON"), { status: 400 });
  }
}

/** Serve a file under `base` (no traversal). */
function serveFile(c: Context, base: string, rel: string) {
  let decoded: string;
  try {
    decoded = decodeURIComponent(rel);
  } catch {
    return c.json({ error: "Bad path" }, 400);
  }
  if (!decoded || decoded.split(/[\\/]/).some((seg) => seg === ".." ) || decoded.includes("\0")) return c.json({ error: "Bad path" }, 400);
  let abs: string;
  try {
    abs = safeJoin(base, decoded);
  } catch {
    return c.json({ error: "Bad path" }, 400);
  }
  if (!existsSync(abs) || !statSync(abs).isFile()) return c.json({ error: "Not found" }, 404);
  const buf = readFileSync(abs);
  return c.body(new Uint8Array(buf), 200, { "content-type": MIME[extname(abs).toLowerCase()] ?? "application/octet-stream" });
}

/** Path after a fixed prefix, from the raw URL (so encoded traversal is checked after decoding). */
function restAfter(c: Context, prefix: RegExp): string {
  const path = new URL(c.req.url).pathname;
  const m = prefix.exec(path);
  return m ? path.slice(m[0].length) : "";
}

export function createApp(root?: string, opts: { fetcher?: Fetcher } = {}) {
  const store = () => new Store(root);
  const app = new Hono();
  app.use(
    "/api/*",
    cors({
      origin: (origin) => (origin && LOCALHOST.test(origin) ? origin : null),
      allowMethods: ["GET", "POST", "PUT", "OPTIONS"],
      allowHeaders: ["content-type"],
    }),
  );
  app.onError((e, c) => fail(c, e));
  app.notFound((c) => c.json({ error: "Not found" }, 404));

  app.get("/api/health", (c) => c.json({ ok: true, version: VERSION }));

  app.get("/api/episodes", (c) => c.json(store().listEpisodes()));

  app.post("/api/episodes", async (c) => {
    const b = z.object({ id: z.string(), title: z.string(), weekOf: z.string(), brief: z.unknown() }).parse(await body(c));
    const s = store();
    if (s.hasEpisode(b.id)) return c.json({ error: `Episode already exists: ${b.id}` }, 409);
    return c.json(s.createEpisode({ ...b, brief: b.brief }), 201);
  });

  app.get("/api/episodes/:id", (c) => c.json(store().getEpisode(c.req.param("id"))));

  app.put("/api/episodes/:id", async (c) => {
    const id = c.req.param("id");
    const b = (await body(c)) as { id?: unknown };
    if (b && typeof b === "object" && b.id !== id) return c.json({ error: `Body id (${String(b.id)}) does not match URL id (${id})` }, 400);
    return c.json(store().saveEpisode(b));
  });

  app.get("/api/episodes/:id/findings", (c) => {
    const s = store();
    return c.json(runGate(s.getEpisode(c.req.param("id")), contextFromStore(s)));
  });

  app.post("/api/episodes/:id/approve", async (c) => {
    const b = z.object({ target: z.enum(APPROVAL_TARGETS as unknown as [ApprovalTarget, ...ApprovalTarget[]]) }).parse(await body(c));
    return c.json(approve(store(), c.req.param("id"), b.target));
  });

  app.get("/api/episodes/:id/kit", (c) => {
    const k = writeKit(store(), c.req.param("id"));
    return c.json({ postText: k.postText, firstComment: k.firstComment, credits: k.credits, files: k.files });
  });

  app.get("/api/episodes/:id/files/*", (c) => {
    const s = store();
    const dir = join(s.episodeDir(c.req.param("id")), "out");
    return serveFile(c, dir, restAfter(c, /^\/api\/episodes\/[^/]+\/files\//));
  });

  app.get("/api/brand/*", (c) => serveFile(c, store().path("brand"), restAfter(c, /^\/api\/brand\//)));

  app.get("/api/library", (c) => {
    const t = c.req.query("type");
    return c.json(store().listAssets(t ? AssetType.parse(t) : undefined));
  });

  app.post("/api/import", async (c) => {
    const b = z.object({ input: z.string().min(1), title: z.string().optional(), license: License.optional() }).parse(await body(c));
    const a = await importInput(store(), b.input, { title: b.title, license: b.license, fetcher: opts.fetcher ?? httpFetcher });
    return c.json(a, 201);
  });

  app.get("/api/feedback", (c) => c.json(store().listFeedback()));

  app.post("/api/feedback", async (c) => {
    const b = z
      .object({
        kind: Feedback.shape.kind,
        text: z.string(),
        episodeId: z.string().optional(),
        before: z.string().optional(),
        after: z.string().optional(),
        target: Feedback.shape.target.optional(),
      })
      .parse(await body(c));
    return c.json(addFeedback(store(), b), 201);
  });

  app.get("/api/proposals", (c) => c.json(store().listProposals()));
  app.post("/api/proposals/:id/approve", (c) => c.json(approveAndApply(store(), c.req.param("id"))));
  app.post("/api/proposals/:id/reject", (c) => c.json(rejectProposal(store(), c.req.param("id"))));

  app.get("/api/modules", (c) => c.json(store().listModules()));

  app.get("/api/radar", (c) => {
    const text = store().readText("episodes/_radar/latest.json");
    if (text === undefined) return c.json({ generatedAt: null, themes: [] });
    const parsed = JSON.parse(text) as { generatedAt?: string; themes?: unknown[] };
    return c.json({ generatedAt: parsed.generatedAt ?? null, themes: Array.isArray(parsed.themes) ? parsed.themes : [] });
  });

  return app;
}

export async function serve(opts: { root?: string; port?: number } = {}) {
  const { serve: nodeServe } = await import("@hono/node-server");
  const port = opts.port ?? PORT;
  const app = createApp(opts.root);
  return nodeServe({ fetch: app.fetch, port, hostname: "127.0.0.1" }, (info) => {
    console.log(`wjnp core API listening on http://localhost:${info.port}`);
  });
}
