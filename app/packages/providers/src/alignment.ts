import type { WordTiming } from "@wjnp/contracts";

/** ElevenLabs character-level alignment (field names confirmed on elevenlabs.io/docs convert-with-timestamps). */
export interface Alignment {
  characters: string[];
  character_start_times_seconds: number[];
  character_end_times_seconds: number[];
}

/** A word as a half-open char range [a, b) over the string that was actually spoken. */
export interface CharSpan {
  w: string;
  a: number;
  b: number;
}

const ms = (s: number) => Math.round(s * 1000);

/** Split the spoken text on whitespace and time each word from its first/last character. */
export function alignmentToWords(al: Alignment): WordTiming[] {
  const text = al.characters.join("");
  const spans: CharSpan[] = [];
  for (const m of text.matchAll(/\S+/gu)) spans.push({ w: m[0], a: m.index!, b: m.index! + m[0].length });
  return spansToWordTimings(al, text, spans);
}

/**
 * Time arbitrary spans (offsets into `spokenText`) from the character alignment.
 * If the API echoed different text than we sent (normalisation), offsets are scaled proportionally.
 */
export function spansToWordTimings(al: Alignment, spokenText: string, spans: CharSpan[]): WordTiming[] {
  const n = al.characters.length;
  if (n === 0) return [];
  // string offset -> character index (characters may be longer than one UTF-16 unit)
  const offToIdx: number[] = [];
  al.characters.forEach((c, i) => {
    for (let k = 0; k < Math.max(1, c.length); k++) offToIdx.push(i);
  });
  const alignedLen = offToIdx.length;
  const ratio = spokenText.length > 0 ? alignedLen / spokenText.length : 1;
  const idxAt = (off: number) => offToIdx[Math.min(alignedLen - 1, Math.max(0, Math.floor(off * ratio)))]!;
  const out: WordTiming[] = [];
  for (const s of spans) {
    if (s.b <= s.a) continue;
    const first = idxAt(s.a);
    const last = Math.max(first, idxAt(s.b - 1));
    const start = ms(al.character_start_times_seconds[first] ?? 0);
    const end = Math.max(start, ms(al.character_end_times_seconds[last] ?? al.character_start_times_seconds[last] ?? 0));
    out.push({ w: s.w, startMs: start, endMs: end });
  }
  return out;
}

export function alignmentDurationMs(al: Alignment): number {
  const ends = al.character_end_times_seconds;
  return ends.length ? ms(Math.max(...ends)) : 0;
}
