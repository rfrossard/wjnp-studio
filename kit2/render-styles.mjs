// Renders, per style of the motion-director library video, three short segments:
//   in  = the first frames, where the previous style hands over (incoming transition)
//   mid = a stretch from the middle of the scene, before the invocation card
//   out = the last frames plus the start of the next scene (outgoing transition)
// One bundle, one composition, each style in its own try/catch so a style that needs
// media missing from the public repo fails alone and is reported, never faked.
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const KIT = process.cwd();
const OUT = process.argv[2];
const only = process.argv.slice(3);
// Sandbox: use a preinstalled Chrome headless shell when remotion.media is unreachable.
const BX = process.env.REMOTION_BROWSER_EXECUTABLE ? {browserExecutable: process.env.REMOTION_BROWSER_EXECUTABLE} : {};
fs.mkdirSync(OUT, {recursive: true});

const plan = JSON.parse(fs.readFileSync(path.join(KIT, 'src/b/plan.json'), 'utf8'));
const OV = plan.overlap;
let at = 0;
const TL = plan.scenes.map((s, i) => {
  const start = at; const ov = OV[s.out] ?? 0; at = start + s.dur - ov;
  return {...s, start, inT: i ? plan.scenes[i - 1].out : 'none', ovIn: i ? (OV[plan.scenes[i - 1].out] ?? 0) : 0, ovOut: ov};
});
const TOTAL = TL[TL.length - 1].start + TL[TL.length - 1].dur;

const serveUrl = await bundle({entryPoint: path.join(KIT, 'src/index.ts'), publicDir: path.join(KIT, 'public')});
const composition = await selectComposition({serveUrl, id: 'Biblioteca', inputProps: {}, ...BX});

const report = [];
for (const s of TL) {
  if (s.id === 'intro' || s.id === 'outro') continue;       // bookends carry employer branding
  if (only.length && !only.includes(s.id)) continue;
  const mid = s.start + Math.round(s.dur * 0.42);
  const segs = {
    in: [s.start, s.start + 42],
    mid: [mid, mid + 54],
    out: [s.start + s.dur - 14, Math.min(TOTAL - 1, s.start + s.dur + 22)],
  };
  const res = {id: s.id, inT: s.inT, outT: s.out, ok: true, files: []};
  for (const [k, [a, b]] of Object.entries(segs)) {
    const file = path.join(OUT, `${s.id}_${k}.mp4`);
    try {
      await renderMedia({composition, serveUrl, codec: 'h264', outputLocation: file, inputProps: {},
        frameRange: [a, b - 1], scale: 0.5, muted: true, logLevel: 'error', timeoutInMilliseconds: 60000, ...BX});
      res.files.push(file);
    } catch (e) {
      res.ok = false; res.error = (res.error ? res.error + " | " : "") + k + ": " + String(e.message || e).split('\n')[0].slice(0, 200);
      continue;
    }
  }
  report.push(res);
  console.log(`${res.ok ? 'OK  ' : 'FAIL'} ${s.id.padEnd(11)} in:${s.inT.padEnd(7)} out:${s.out.padEnd(7)} ${res.error ?? ''}`);
  fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2));
}
console.log('DONE');
