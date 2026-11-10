/**
 * Runs ONE pipeline step on an episode and saves the result.
 *   npm run step -- <step> <episodeId> [--mock] [--input <file.json>] [--ok-spend]
 * Steps: radar | brainstorm | claims | verify | script | review | narrate | music | post
 * --mock uses the offline mock providers (no keys, no cost). Without it, real providers are used:
 *   ANTHROPIC_API_KEY (authors), OPENAI_COMPAT_API_KEY + OPENAI_COMPAT_BASE_URL (verifier/critic, another family),
 *   ELEVENLABS_API_KEY (narration), GEMINI_API_KEY (music).
 * --ok-spend is the owner's explicit OK to go above the weekly budget for this run.
 */
import { existsSync, readFileSync } from "node:fs";
if (existsSync(".env")) process.loadEnvFile(".env");
import { Episode } from "@wjnp/contracts";
import { Store } from "@wjnp/core";
import {
  AnthropicLLM, ElevenLabsTTS, LyriaMusic, MockLLM, MockMusic, MockTTS, OpenAICompatibleLLM, Router, isoWeekKey, loadModules,
  brainstormBrief, collectRadar, extractClaims, narrate, pickMusic, reviewScenes, verifyClaims, writePost, writeScript,
  type PipelineDeps,
} from "@wjnp/providers";

const args = process.argv.slice(2);
const flag = (n: string) => args.includes(n);
const opt = (n: string) => (args.includes(n) ? args[args.indexOf(n) + 1] : undefined);
const [step, episodeId] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--input");
const STEPS = ["radar", "brainstorm", "claims", "verify", "script", "review", "narrate", "music", "post"];
if (!step || !STEPS.includes(step) || (step !== "radar" && !episodeId)) {
  console.error(`usage: npm run step -- <${STEPS.join("|")}> <episodeId> [--mock] [--input file.json] [--ok-spend]`);
  process.exit(2);
}

const root = process.cwd();
const store = new Store(root);
const modules = loadModules(root);
const mock = flag("--mock");
const input = opt("--input") ? JSON.parse(readFileSync(opt("--input")!, "utf8")) : {};

if (step === "radar") {
  const { radar, errors, itemCount } = await collectRadar({ sources: modules.radar, fetch, now: new Date(), root });
  if (!modules.radar.feeds.length) console.log("radar: no feeds configured yet in modules/radar/sources.json");
  console.log(`radar: ${itemCount} items, ${radar.themes.length} themes, ${errors.length} feed errors`);
  for (const e of errors) console.log(`  feed error ${e.feed}: ${e.error}`);
  process.exit(0);
}

const week = isoWeekKey(new Date());
const otherEpisodeCosts = store
  .listEpisodes()
  .filter((e) => e.id !== episodeId)
  .flatMap((e) => store.getEpisode(e.id).costs)
  .filter((c) => isoWeekKey(new Date(c.at)) === week);

const deps: PipelineDeps = {
  llm: mock ? new MockLLM({ family: "author" }) : new AnthropicLLM(),
  verifierLlm: mock ? new MockLLM({ family: "verifier" }) : new OpenAICompatibleLLM(),
  tts: mock ? new MockTTS() : new ElevenLabsTTS({ pronunciation: modules.pronunciation }),
  music: mock ? new MockMusic() : new LyriaMusic(),
  modules,
  router: new Router(modules.routing),
  now: () => new Date(),
  root,
  otherEpisodeCosts,
  ownerApprovedSpend: flag("--ok-spend"),
};

const before = store.getEpisode(episodeId!);
let after: Episode;
switch (step) {
  case "brainstorm": after = await brainstormBrief(before, deps, input); break;
  case "claims": after = await extractClaims(before, deps, input); break;
  case "verify": after = await verifyClaims(before, deps); break;
  case "script": after = await writeScript(before, deps, input); break;
  case "review": after = await reviewScenes(before, deps); break;
  case "narrate": after = await narrate(before, deps); break;
  case "music": after = await pickMusic(before, deps); break;
  default: after = await writePost(before, deps);
}
const saved = store.saveEpisode(Episode.parse(after));
const spent = saved.costs.slice(before.costs.length).reduce((a, c) => a + c.usd, 0);
console.log(`${step} done for ${saved.id}${mock ? " (mock providers)" : ""} · scenes ${saved.scenes.length} · claims ${saved.claims.length} · cost this step $${spent.toFixed(2)}`);
