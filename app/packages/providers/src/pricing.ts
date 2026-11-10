// All prices are ESTIMATES used for budget tracking. // UNVERIFIED against live price lists
export interface Price {
  inPerMTok: number;
  outPerMTok: number;
}

export const DEFAULT_PRICES: { match: RegExp; price: Price }[] = [
  { match: /opus/i, price: { inPerMTok: 15, outPerMTok: 75 } }, // UNVERIFIED
  { match: /sonnet/i, price: { inPerMTok: 3, outPerMTok: 15 } }, // UNVERIFIED
  { match: /haiku/i, price: { inPerMTok: 1, outPerMTok: 5 } }, // UNVERIFIED
  { match: /gpt-5-mini|mini/i, price: { inPerMTok: 0.25, outPerMTok: 2 } }, // UNVERIFIED
  { match: /gpt|o\d/i, price: { inPerMTok: 1.25, outPerMTok: 10 } }, // UNVERIFIED
  { match: /gemini/i, price: { inPerMTok: 0.3, outPerMTok: 2.5 } }, // UNVERIFIED
];

/** Conservative fallback so an unknown model never looks free. */
export const FALLBACK_PRICE: Price = { inPerMTok: 5, outPerMTok: 25 };

export function usdForTokens(
  model: string,
  usage: { inputTokens: number; outputTokens: number },
  table: { match: RegExp; price: Price }[] = DEFAULT_PRICES,
): number {
  const p = table.find((t) => t.match.test(model))?.price ?? FALLBACK_PRICE;
  return (usage.inputTokens * p.inPerMTok + usage.outputTokens * p.outPerMTok) / 1_000_000;
}
