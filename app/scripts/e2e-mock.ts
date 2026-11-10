/**
 * End-to-end check WITHOUT paid APIs: copies the golden fixture to episodes/e2e-mock, narrates it with the
 * mock TTS (silent audio + word timings), then prints the gate, writes the publish kit.
 * Render afterwards with: npx tsx packages/render/scripts/render.ts e2e-mock cut
 */
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Episode } from "@wjnp/contracts";
import { MockLLM, MockTTS, Router, loadModules, narrate } from "@wjnp/providers";
import { Store, runGate, contextFromStore, writeKit } from "@wjnp/core";

const root = process.cwd();
const dir = join(root, "episodes", "e2e-mock");
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const golden = JSON.parse(readFileSync(join(root, "episodes/_golden/sample-illustrative/episode.json"), "utf8"));
writeFileSync(join(dir, "episode.json"), JSON.stringify({ ...golden, id: "e2e-mock", title: "[Illustrative] mock end-to-end" }, null, 2));

const store = new Store(root);
const modules = loadModules(root);
const narrated = await narrate(store.getEpisode("e2e-mock"), {
  llm: new MockLLM({ family: "author" }), verifierLlm: new MockLLM({ family: "verifier" }), tts: new MockTTS(),
  modules, router: new Router(modules.routing), now: () => new Date(), root,
});
const saved = store.saveEpisode(Episode.parse(narrated));
const withAudio = saved.scenes.filter((s) => s.narration.audio).length;
console.log(`narrated ${withAudio}/${saved.scenes.length} scenes; first audio path: ${saved.scenes[0]?.narration.audio?.path}`);
const gate = runGate(saved, contextFromStore(store));
console.log(`gate: ${gate.gatePass ? "PASS" : "FAIL"} · master ${gate.durations.masterSeconds}s · cut ${gate.durations.cutSeconds}s`);
for (const f of gate.findings) console.log(`  ${f.severity.toUpperCase()} ${f.rule}: ${f.message}`);
const kit = writeKit(store, "e2e-mock");
console.log("kit files:", kit.files.join(", "));
