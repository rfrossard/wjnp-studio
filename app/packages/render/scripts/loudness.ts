import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Two-pass EBU R128 loudness normalisation to modules/audio/mix.json, video stream copied.
 * Deterministic (linear gain when possible, limiter only if the peak needs it), so the same
 * episode.json still gives the same file. Targets the middle of the allowed integrated range.
 */
export function normalizeLoudness(file: string, root: string) {
  const mixPath = path.join(root, "modules", "audio", "mix.json");
  const mix = JSON.parse(fs.readFileSync(mixPath, "utf8")) as { integratedLufsRange: [number, number]; loudnessRangeMaxLu: number; truePeakMaxDbfs: number };
  const target = (mix.integratedLufsRange[0] + mix.integratedLufsRange[1]) / 2; // -17.5
  const tp = mix.truePeakMaxDbfs - 0.7; // margin under the ceiling after AAC encoding
  const lra = mix.loudnessRangeMaxLu;
  const base = `loudnorm=I=${target}:TP=${tp}:LRA=${lra}`;
  const probe = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-i", file, "-af", `${base}:print_format=json`, "-f", "null", "-"], { encoding: "utf8" });
  const m = /\{[\s\S]*?"input_i"[\s\S]*?\}/.exec(probe.stderr ?? "");
  if (!m) throw new Error("loudnorm measurement failed");
  const j = JSON.parse(m[0]) as Record<string, string>;
  const af = `${base}:measured_I=${j.input_i}:measured_TP=${j.input_tp}:measured_LRA=${j.input_lra}:measured_thresh=${j.input_thresh}:offset=${j.target_offset}:linear=true,aresample=48000`;
  const tmp = file.replace(/\.mp4$/, ".norm.mp4");
  const run = spawnSync("ffmpeg", ["-hide_banner", "-nostats", "-y", "-i", file, "-c:v", "copy", "-af", af, "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", tmp], { encoding: "utf8" });
  if (run.status !== 0) throw new Error(`loudnorm pass failed: ${run.stderr?.slice(-400)}`);
  fs.renameSync(tmp, file);
  console.log(`  loudness: ${j.input_i} LUFS -> target ${target} LUFS, true peak <= ${tp} dBFS`);
}


// CLI: npx tsx packages/render/scripts/loudness.ts <file.mp4>...  (re-normalise already rendered files)
if (process.argv[1] && /loudness\.ts$/.test(process.argv[1])) {
  for (const f of process.argv.slice(2)) normalizeLoudness(path.resolve(f), process.cwd());
}
