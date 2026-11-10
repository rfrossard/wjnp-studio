import { createHash } from "node:crypto";
import type { Accent } from "@wjnp/contracts";

export function sha256Hex(input: string | Uint8Array): string {
  return createHash("sha256").update(input).digest("hex");
}

/** Deterministic accent: sha256(episodeId) mod accents.length. */
export function pickAccent(episodeId: string, accents: readonly Accent[]): Accent {
  if (accents.length === 0) throw new Error("pickAccent: no accents available");
  const n = BigInt("0x" + sha256Hex(episodeId));
  const idx = Number(n % BigInt(accents.length));
  return accents[idx]!;
}

const srgbToLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);

/** OKLCH of a #rrggbb colour. Hue in degrees [0, 360). */
export function hexToOklch(hex: string): { l: number; c: number; h: number } {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) throw new Error(`Invalid hex colour: ${hex}`);
  const v = parseInt(m[1]!, 16);
  const r = srgbToLinear(((v >> 16) & 255) / 255);
  const g = srgbToLinear(((v >> 8) & 255) / 255);
  const b = srgbToLinear((v & 255) / 255);
  const l_ = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m_ = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s_ = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
  const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
  const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
  const C = Math.sqrt(A * A + B * B);
  let h = (Math.atan2(B, A) * 180) / Math.PI;
  if (h < 0) h += 360;
  return { l: L, c: C, h };
}

export function hexToOklchHue(hex: string): number {
  return hexToOklch(hex).h;
}
