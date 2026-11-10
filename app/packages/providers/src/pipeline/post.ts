import type { Episode } from "@wjnp/contracts";
import { z } from "zod";
import { guardText } from "../guard";
import { clone, collectStrings, runLlmTask, type PipelineDeps } from "./common";

/** Deterministic first comment: sources behind the verified claims, built by code from the episode. */
export function buildFirstComment(ep: Episode, template: string): string {
  const used = new Set(ep.claims.filter((c) => c.verdict === "verified").flatMap((c) => c.evidence.map((e) => e.sourceId)));
  const lines = ep.sources.filter((s) => used.has(s.id)).map((s) => `- ${s.title} (${s.publisher}): ${s.url}`);
  const block = lines.join("\n");
  return template.includes("{{sources}}") ? template.replace("{{sources}}", block) : `${template}\n${block}`;
}

/** Small tier: 2-line hook + body + hashtags. Disclaimer and first comment are added by code. Never sets ownerConfirmedAt. */
export async function writePost(episode: Episode, deps: PipelineDeps): Promise<Episode> {
  const ep = clone(episode);
  const fmt = deps.modules.postFormat;
  const verified = ep.claims.filter((c) => c.verdict === "verified");
  if (verified.length === 0) throw new Error("writePost: no verified claims");
  const PostOut = z.object({
    hook: z.array(z.string().min(1).max(110)).length(fmt.hookLines),
    body: z.string().min(1).max(600),
    hashtags: z.array(z.string().regex(/^#\w+$/)).max(fmt.maxHashtags),
  });
  type PostOut = z.infer<typeof PostOut>;

  const { value } = await runLlmTask(ep, deps, {
    id: "write-post",
    kind: "write_post",
    prompt: "write_post",
    context: {
      brief: { thesis: ep.brief.thesis, tone: ep.brief.tone, messages: ep.brief.messages.map((m) => m.text), closingQuestion: ep.brief.closingQuestion },
      verifiedClaims: verified.map((c) => ({ id: c.id, text: c.text, ...(c.value ? { value: c.value } : {}) })),
      hookLines: fmt.hookLines,
      maxHashtags: fmt.maxHashtags,
    },
    schema: PostOut,
    validate: (o: PostOut) => {
      const bad = guardText(collectStrings(o).join("\n"), deps.modules);
      return bad.length ? bad.join(", ") : undefined;
    },
  });
  ep.post = {
    text: `${value.hook.join("\n")}\n\n${value.body.trim()}`,
    hashtags: value.hashtags,
    firstComment: buildFirstComment(ep, fmt.firstCommentTemplate),
    disclaimer: fmt.disclaimer,
    // ownerConfirmedAt is intentionally never set here: only an explicit owner action publishes.
  };
  return ep;
}
