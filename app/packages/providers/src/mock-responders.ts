/* Deterministic fake "model" answers for MockLLM. They read the CONTEXT block of the real prompt, so the
   whole pipeline can run offline. They are NOT clever: they exist to exercise the code-side rules. */
const FILLER =
  "that matters because the evidence points in two directions at once and the useful move is to hold both in view while we keep asking what changes for the person using it and who is accountable when it goes wrong".split(
    " ",
  );

export function fillerWords(n: number, seed = 0): string {
  const out: string[] = [];
  for (let i = 0; i < n; i++) out.push(FILLER[(i + seed) % FILLER.length]!);
  return out.join(" ");
}

type Ctx = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

const cut = (s: string, n: number) => (s.length <= n ? s : s.slice(0, n - 1).trimEnd() + "…");

function brainstorm(ctx: Ctx) {
  const theme = ctx.themes?.[0];
  const titles: string[] = (theme?.sources ?? []).map((s: { title: string }) => s.title);
  const topic: string = theme?.title ?? cut(String(ctx.ownerNotes || "This week in applied AI"), 80);
  return {
    theme: topic,
    thesis: theme?.thesis || `The interesting question about "${topic}" is who is accountable, not what is possible.`,
    messages: [0, 1, 2].map((i) => ({ id: `m${i + 1}`, text: titles[i] ? cut(titles[i], 140) : `A message about ${cut(topic, 60)}` })),
    angle: "A practitioner's view on what changes for the person, not the vendor.",
    avoid: ["naming banks", "market forecasts"],
    tone: "analytical",
    closingQuestion: `What would you let software decide about ${cut(topic, 50)} without asking first?`,
  };
}

function extract(ctx: Ctx) {
  return {
    claims: (ctx.sources as Ctx[]).map((s) => {
      const sentence = String(s.text).trim().split(/(?<=[.!?])\s/)[0]!.slice(0, 280);
      return { id: `c-${s.id}`, text: sentence, kind: "fact", evidence: [{ sourceId: s.id, quote: sentence }] };
    }),
  };
}

const verify = (ctx: Ctx) => ({
  verdicts: (ctx.claims as Ctx[]).map((c) => ({ claimId: c.id, reasons: [], verdict: "verified" })),
});

function onScreenFor(template: string, ctx: Ctx, claim: Ctx | undefined, i: number): Ctx {
  const brief = ctx.brief;
  const msg = brief.messages[i % brief.messages.length].text as string;
  switch (template) {
    case "title_hook":
      return { template, kicker: "What's just now possible?", headline: cut(brief.theme, 70) };
    case "statement":
      return { template, headline: cut(msg, 80), body: claim ? cut(claim.text, 180) : undefined };
    case "stat":
      return { template, claimId: claim!.id, label: cut(claim!.text, 90) };
    case "quote_card":
      return { template, claimId: claim!.id, quote: cut(claim!.quotes[0], 220), attribution: cut(claim!.speaker ?? "Speaker", 80), sourceLabel: "Source talk" };
    case "comparison":
      return { template, headline: cut(msg, 70), left: { title: "Before", items: ["A demo"] }, right: { title: "Now", items: ["A product"] } };
    case "timeline":
      return { template, steps: [{ label: "Then", text: "A prototype" }, { label: "Now", text: "A shipped feature" }] };
    case "bullets":
      return { template, headline: cut(msg, 70), bullets: ["One thing is clear", "One thing is not"] };
    case "personal_take":
      return { template, headline: "The limits must be readable" };
    default:
      return { template: "end_card", question: cut(brief.closingQuestion, 120) };
  }
}

function writeScript(ctx: Ctx) {
  const claims = ctx.verifiedClaims as Ctx[];
  const byKind = (k: string) => claims.filter((c) => c.kind === k);
  let facts = 0;
  return {
    scenes: (ctx.skeleton.beats as Ctx[]).map((beat, i) => {
      const feasible = (t: string) => (t === "stat" ? byKind("number").length > 0 : t === "quote_card" ? byKind("quote").length > 0 : true);
      const template = (beat.templates as string[]).find(feasible) ?? beat.templates[0];
      let claim: Ctx | undefined;
      if (template === "stat") claim = byKind("number")[0];
      else if (template === "quote_card") claim = byKind("quote")[0];
      else if (template === "statement" || template === "bullets") {
        const f = byKind("fact");
        claim = f.length ? f[facts++ % f.length] : undefined;
      }
      const words = Math.round(beat.targetSeconds * ctx.wordsPerSecond);
      const lead = claim && template !== "stat" ? `${claim.text} ` : "";
      const narration = (lead + fillerWords(Math.max(0, words - lead.split(/\s+/).filter(Boolean).length), i)).split(/\s+/).slice(0, words).join(" ");
      const isTake = template === "personal_take";
      const first = i === 0;
      const last = i === ctx.skeleton.beats.length - 1;
      return {
        beatId: beat.id,
        style: ctx.allowedStyles[0],
        onScreen: onScreenFor(template, ctx, claim, i),
        narration,
        claimIds: claim ? [claim.id] : [],
        ...(first || last ? {} : { messageId: `m${(i % 3) + 1}` }),
        isOpinion: isTake,
        inCut: false,
      };
    }),
  };
}

const fill = (ctx: Ctx) => ({ onScreen: ctx.scene.onScreen, narration: ctx.scene.narration });

const critique = (ctx: Ctx) => ({ defects: [], scores: Object.fromEntries((ctx.criteria as string[]).map((c) => [c, 4])) });

function post(ctx: Ctx) {
  const lines = Array.from({ length: ctx.hookLines }, (_, i) => (i === 0 ? cut(ctx.brief.thesis, 90) : cut(ctx.brief.closingQuestion, 90)));
  return { hook: lines, body: "Three messages, each backed by sources listed in the first comment.", hashtags: ["#AI"] };
}

export const DEFAULT_RESPONDERS: Record<string, (ctx: Ctx) => unknown> = {
  brainstorm,
  extract_claims: extract,
  verify_claims: verify,
  write_script: writeScript,
  fill_scene: fill,
  critique_scene: critique,
  write_post: post,
};
