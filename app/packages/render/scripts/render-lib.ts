/** npx tsx packages/render/scripts/render-lib.ts <outDir> [ids...] : renders the 8 native library styles, each with its entry and exit, and three stills per style */
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { bundle } from "@remotion/bundler";
import { renderMedia, renderStill, selectComposition } from "@remotion/renderer";
const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(process.argv[2] ?? "lib-out");
const ids = process.argv.slice(3).length ? process.argv.slice(3) : ["tron", "ascii", "crt", "risograph", "blueprint", "origami", "claymation", "synthwave"];
fs.mkdirSync(out, { recursive: true });
const serveUrl = await bundle({ entryPoint: path.join(here, "..", "src", "index.ts") });
for (const id of ids) {
  const composition = await selectComposition({ serveUrl, id: `lib-${id}`, inputProps: { id } });
  await renderMedia({ composition, serveUrl, codec: "h264", outputLocation: path.join(out, `${id}.mp4`), inputProps: { id }, scale: 0.5, muted: true, logLevel: "error" });
  for (const fr of [40, 110, 190]) await renderStill({ composition, serveUrl, output: path.join(out, `${id}_${fr}.png`), frame: fr, inputProps: { id }, scale: 0.5 });
  console.log("ok", id);
}
