import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { collectRadar, normalizeUrl, parseFeed } from "../src/index";
import { tmpRoot } from "./helpers";

const NOW = new Date("2026-11-10T12:00:00Z");
const day = (n: number) => new Date(NOW.getTime() - n * 86400000).toUTCString();
const iso = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();

const rss = `<?xml version="1.0"?><rss version="2.0"><channel>
<item><title>Agents learn to pay for things on their own</title><link>https://a.example/agents-pay?utm_source=x</link><pubDate>${day(1)}</pubDate><description><![CDATA[<p>Software agents can now complete checkout &amp; payment flows for shoppers.</p>]]></description></item>
<item><title>Old story about agents paying</title><link>https://a.example/old</link><pubDate>${day(9)}</pubDate></item>
<item><title>Undated agents paying story</title><link>https://a.example/undated</link></item>
<item><title>Chip makers report quarterly volumes</title><link>https://a.example/chips</link><pubDate>${day(2)}</pubDate><description>Semiconductor packaging volumes grew across the industry.</description></item>
</channel></rss>`;

const atom = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
<entry><title>Agents learn to pay for things on their own</title><link rel="alternate" href="https://a.example/agents-pay"/><updated>${iso(1)}</updated><summary>duplicate of the first item</summary></entry>
<entry><title>Shoppers hand the checkout to software agents</title><link rel="alternate" href="https://b.example/shoppers-agents"/><updated>${iso(2)}</updated><summary>Agents complete checkout and payment for shoppers in a study.</summary></entry>
</feed>`;

const fetchFeeds = (async (url: string) => {
  if (url === "https://a.example/rss") return new Response(rss, { status: 200 });
  if (url === "https://b.example/atom") return new Response(atom, { status: 200 });
  return new Response("nope", { status: 500 });
}) as unknown as typeof fetch;

describe("radar", () => {
  it("parses RSS and Atom without dependencies", () => {
    const r = parseFeed(rss);
    expect(r).toHaveLength(4);
    expect(r[0]!.summary).toBe("Software agents can now complete checkout & payment flows for shoppers.");
    const a = parseFeed(atom);
    expect(a[1]!.url).toBe("https://b.example/shoppers-agents");
    expect(a[1]!.date).toBeInstanceOf(Date);
  });

  it("keeps the last 7 days, drops undated items, dedupes by URL/title, clusters and writes latest.json", async () => {
    const root = tmpRoot();
    const { radar, errors, itemCount } = await collectRadar({
      sources: {
        publishers: [{ name: "Site A", domain: "a.example" }, { name: "Site B", domain: "b.example" }],
        feeds: [
          { name: "A rss", url: "https://a.example/rss" },
          { name: "B atom", url: "https://b.example/atom" },
          { name: "Broken", url: "https://c.example/rss" },
        ],
      },
      fetch: fetchFeeds,
      now: NOW,
      root,
    });
    expect(errors).toEqual([{ feed: "Broken", error: "HTTP 500" }]);
    // 9-day-old and undated dropped; atom duplicate (same URL without utm) dropped => 3 unique items
    expect(itemCount).toBe(3);
    const all = radar.themes.flatMap((t) => t.sources.map((s) => s.url));
    expect(all).not.toContain("https://a.example/old");
    expect(all).not.toContain("https://a.example/undated");
    expect(all.filter((u) => normalizeUrl(u) === "a.example/agents-pay")).toHaveLength(1);
    // the two "agents pay" items cluster into one theme, the chip story stands alone
    expect(radar.themes).toHaveLength(2);
    const top = radar.themes[0]!;
    expect(top.sources.map((s) => s.publisher).sort()).toEqual(["Site A", "Site B"]);
    expect(top).toMatchObject({ id: expect.stringMatching(/^t-/), title: expect.any(String), thesis: expect.any(String), messages: [] });
    const file = join(root, "episodes", "_radar", "latest.json");
    expect(existsSync(file)).toBe(true);
    const onDisk = JSON.parse(readFileSync(file, "utf8"));
    expect(onDisk.generatedAt).toBe(NOW.toISOString());
    expect(Object.keys(onDisk).sort()).toEqual(["generatedAt", "themes"]);
  });
});
