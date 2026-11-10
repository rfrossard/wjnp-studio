import type { CharSpan } from "./alignment";

export interface PronunciationEntry {
  term: string;
  say: string;
}

interface Seg {
  os: number;
  oe: number;
  ss: number;
  se: number;
  replaced: boolean;
}

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Whole-word, case-sensitive substitution of `term` -> `say` before synthesis.
 * Returns the string to speak plus one span per ORIGINAL whitespace-delimited word,
 * expressed as char offsets in the spoken string — so timings can keep the original words.
 */
export function applyPronunciation(text: string, entries: PronunciationEntry[]): { spoken: string; spans: CharSpan[] } {
  const usable = entries.filter((e) => e.term.length > 0);
  const segs: Seg[] = [];
  let spoken = "";
  const push = (os: number, oe: number, piece: string, replaced: boolean) => {
    if (oe <= os && !replaced) return;
    segs.push({ os, oe, ss: spoken.length, se: spoken.length + piece.length, replaced });
    spoken += piece;
  };

  if (usable.length === 0) {
    push(0, text.length, text, false);
  } else {
    const say = new Map(usable.map((e) => [e.term, e.say]));
    const alt = [...say.keys()].sort((a, b) => b.length - a.length).map(escapeRe).join("|");
    const re = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${alt})(?![\\p{L}\\p{N}_])`, "gu");
    let cursor = 0;
    for (const m of text.matchAll(re)) {
      const at = m.index!;
      push(cursor, at, text.slice(cursor, at), false);
      push(at, at + m[0].length, say.get(m[0])!, true);
      cursor = at + m[0].length;
    }
    push(cursor, text.length, text.slice(cursor), false);
  }

  const mapStart = (o: number): number => {
    const s = segs.find((g) => o >= g.os && o < g.oe) ?? segs[segs.length - 1];
    if (!s) return 0;
    if (!s.replaced) return s.ss + (o - s.os);
    return s.ss + Math.floor(((o - s.os) / (s.oe - s.os)) * (s.se - s.ss));
  };
  const mapEnd = (o: number): number => {
    const s = segs.find((g) => o > g.os && o <= g.oe) ?? segs[0];
    if (!s) return 0;
    if (!s.replaced) return s.ss + (o - s.os);
    return s.ss + Math.ceil(((o - s.os) / (s.oe - s.os)) * (s.se - s.ss));
  };

  const spans: CharSpan[] = [];
  for (const m of text.matchAll(/\S+/gu)) {
    const os = m.index!;
    const a = mapStart(os);
    const b = Math.max(a + 1, mapEnd(os + m[0].length));
    spans.push({ w: m[0], a, b });
  }
  return { spoken, spans };
}
