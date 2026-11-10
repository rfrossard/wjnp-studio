/** Builds the illustrative golden episode used by every package's tests. All facts in it are FICTIONAL fixtures. */
import { writeFileSync } from "node:fs";
import { Episode, FPS, DURATION_RULES } from "@wjnp/contracts";

const now = "2026-11-09T12:00:00+00:00";
const src = (id: string, publisher: string, tier: "primary" | "tier1" | "tier2", kind: any, title: string) => ({
  id, url: `https://example.org/${id}`, title: `[ILLUSTRATIVE FIXTURE] ${title}`, publisher, capturedAt: now, tier, kind, publishedAt: "2026-11-05",
});
const frames = (text: string) => Math.round((text.trim().split(/\s+/).length / DURATION_RULES.wordsPerMinute) * 60 * FPS) + 20;
let order = 0;
const scene = (id: string, onScreen: any, text: string, extra: Record<string, unknown> = {}) => ({
  id, order: order++, style: "editorial_data", onScreen, narration: { voiceId: "voice-roberto", text },
  durationFrames: frames(text), state: "draft", ...extra,
});

const episode = Episode.parse({
  schemaVersion: 1,
  id: "sample-illustrative",
  title: "[Illustrative] When software starts to shop",
  weekOf: "2026-11-09",
  brief: {
    theme: "Agents that can transact on a person's behalf",
    thesis: "The interesting question is no longer whether an agent can buy something, but who it answers to when it does.",
    messages: [
      { id: "m1", text: "Agent checkout moved from demo to product this year.", claimIds: ["c-launch", "c-share"] },
      { id: "m2", text: "Trust, not capability, is now the bottleneck.", claimIds: ["c-quote"] },
      { id: "m3", text: "Delegation needs limits a person can read.", claimIds: [] },
    ],
    angle: "A practitioner's view: what changes for the customer, not for the vendor.",
    avoid: ["naming banks", "market forecasts"],
    tone: "analytical",
    closingQuestion: "What would you let software buy for you without asking first?",
  },
  sources: [
    src("s-paper", "Example University", "primary", "paper", "A field study of delegated purchasing"),
    src("s-docs", "Example Labs", "primary", "official_doc", "Agent checkout: product documentation"),
    src("s-press", "Example Times", "tier1", "press", "Shoppers hand the cart to software"),
    src("s-talk", "Example Conference", "primary", "video", "Keynote: delegation and its limits"),
  ],
  claims: [
    { id: "c-launch", kind: "fact", text: "Example Labs shipped agent checkout as a generally available product.", verdict: "verified",
      evidence: [{ sourceId: "s-docs", quote: "Agent checkout is generally available." }, { sourceId: "s-press", quote: "The feature left preview this month." }],
      verifier: { model: "fixture-verifier", at: now }, author: { model: "fixture-author" }, validUntil: "2027-02-01" },
    { id: "c-share", kind: "number", text: "In the study, 38% of participants let the agent complete a purchase without review.", verdict: "verified",
      value: { display: "38%", number: 38, unit: "%" },
      evidence: [{ sourceId: "s-paper", quote: "38% completed the purchase without reviewing the cart.", locator: "Table 2" }, { sourceId: "s-press", quote: "More than a third skipped the review step." }],
      verifier: { model: "fixture-verifier", at: now }, author: { model: "fixture-author" }, validUntil: "2027-02-01" },
    { id: "c-quote", kind: "quote", speaker: "Dr. Example Person", text: "Dr. Example Person said that delegation without legible limits is abdication.", verdict: "verified",
      evidence: [{ sourceId: "s-talk", quote: "Delegation without legible limits is just abdication.", locator: "12:40" }, { sourceId: "s-press", quote: "She called limitless delegation 'abdication'." }],
      verifier: { model: "fixture-verifier", at: now }, author: { model: "fixture-author" }, validUntil: "2027-02-01" },
  ],
  scenes: [
    scene("s01", { template: "title_hook", kicker: "What's just now possible?", headline: "Your software just learned to shop." },
      "This week, software stopped asking for your card and started using it. Here is what is actually new, and what is not.", { inCut: true }),
    scene("s02", { template: "statement", headline: "From demo to product", body: "Agent checkout is now generally available, not a preview." },
      "For two years this was a demo. This month it shipped as a real product, with real money moving.", { claimIds: ["c-launch"], messageId: "m1" }),
    scene("s03", { template: "stat", claimId: "c-share", label: "let the agent buy without reviewing the cart", context: "Illustrative field study, 2026" },
      "And people are using it more freely than you might expect. In one field study, more than a third of participants never looked at the cart.", { claimIds: ["c-share"], messageId: "m1", inCut: true }),
    scene("s04", { template: "comparison", headline: "What changed", left: { title: "Before", items: ["Agent recommends", "You click buy", "You own the mistake"] }, right: { title: "Now", items: ["Agent decides", "Agent pays", "Who owns the mistake?"] } },
      "Before, the agent recommended and you clicked. Now the agent decides and pays. The open question is who owns the mistake.", { messageId: "m2" }),
    scene("s05", { template: "quote_card", claimId: "c-quote", quote: "Delegation without legible limits is just abdication.", attribution: "Dr. Example Person", sourceLabel: "Example Conference keynote" },
      "One researcher put it sharply on stage this week. Delegation without limits you can read is not delegation at all.", { claimIds: ["c-quote"], messageId: "m2", narration: { voiceId: "voice-river", text: "One researcher put it sharply on stage this week. Delegation without limits you can read is not delegation at all." } }),
    scene("s06", { template: "timeline", headline: "How a delegated purchase runs", steps: [{ label: "Intent", text: "You state a goal and a budget" }, { label: "Search", text: "The agent compares options" }, { label: "Mandate", text: "It checks the limits you set" }, { label: "Pay", text: "It completes the purchase" }] },
      "Here is the flow. You state a goal and a budget. The agent searches, checks the limits you set, and then pays.", { messageId: "m3" }),
    scene("s07", { template: "bullets", headline: "Limits a person can read", bullets: ["A ceiling per purchase", "A list of allowed merchants", "A receipt in plain language"] },
      "So what do readable limits look like? A ceiling per purchase, a list of allowed merchants, and a receipt in plain language.", { messageId: "m3" }),
    scene("s08", { template: "personal_take", headline: "Capability is solved. Accountability is not.", body: "I would start with the receipt, not the agent." },
      "My take. The capability is here. The accountability is not. If I were building this, I would start with the receipt, not the agent.", { isOpinion: true, messageId: "m3", inCut: true }),
    scene("s09", { template: "end_card", question: "What would you let software buy for you without asking first?" },
      "So here is my question for you. What would you let software buy for you without asking first? Tell me in the comments.", { inCut: true }),
  ],
  design: { profile: "personal", accent: { name: "teal", hex: "#1F7A8C" }, styles: ["editorial_data"] },
  audio: { narratorVoiceId: "voice-roberto", castVoiceIds: ["voice-river"], musicAssetIds: [] },
  post: { text: "Your software just learned to shop.\nThe question is who it answers to.\n\n[Illustrative fixture post]", hashtags: ["#AI", "#Agents"], firstComment: "Sources: see CREDITS." },
  moduleVersions: {},
});
writeFileSync("episodes/_golden/sample-illustrative/episode.json", JSON.stringify(episode, null, 2) + "\n");
const total = episode.scenes.reduce((a, s) => a + (s.durationFrames ?? 0), 0) / FPS;
console.log("golden episode written:", episode.scenes.length, "scenes,", total.toFixed(1), "s (short fixture, not a full 5 min episode)");
