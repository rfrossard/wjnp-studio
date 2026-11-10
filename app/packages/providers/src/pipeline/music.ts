import { type Episode } from "@wjnp/contracts";
import { BudgetExceededError, ConfigError } from "../errors";
import { MusicLibrary } from "../music-library";
import { checkBudget } from "../router";
import { clone, type PipelineDeps } from "./common";

/**
 * Picks the episode's background track and makes sure it exists in the shared library
 * (library/assets/music/, shared across all episodes).
 *
 * Resolution order: `brief.music.trackAssetId` (Beto's manual pick, see `npm run music`) > the menu
 * track whose tone matches `brief.tone` > the first menu entry. If modules/audio/music.json has no
 * menu, this is a no-op (musicAssetIds stays whatever it already was, empty by default).
 *
 * If the chosen track is already in the library — because it was pre-generated earlier with
 * `npm run music -- <id> --pregenerate`, or reused from a previous episode — it's free: no provider
 * call, no cost. Only a track the library has never seen triggers a real generation, gated by the
 * same weekly-budget check as narrate().
 */
export async function pickMusic(episode: Episode, deps: PipelineDeps): Promise<Episode> {
  const ep = clone(episode);
  const menu = deps.modules.music?.menu ?? [];
  if (!menu.length) return ep;

  const pickedId = ep.brief.music?.trackAssetId;
  const track = (pickedId && menu.find((t) => t.id === pickedId)) || menu.find((t) => t.tone === ep.brief.tone) || menu[0];
  if (!track) return ep;

  const lib = new MusicLibrary(deps.root);
  if (!lib.has(track.id)) {
    if (!deps.music) throw new ConfigError(`no music provider configured; cannot generate track "${track.id}"`);
    const estimate = deps.estimateMusicUsd ?? (() => 0.04 /* UNVERIFIED Lyria price, see providers/lyria.ts */);
    if (!deps.ownerApprovedSpend) {
      const spent = [...(deps.otherEpisodeCosts ?? []), ...ep.costs];
      const b = checkBudget(spent, deps.modules.routing.weeklyBudgetUsd, estimate(track.seconds), deps.now());
      if (b.status === "needs_owner_ok") throw new BudgetExceededError(b.amountUsd, b.spentUsd, b.weeklyBudgetUsd);
    }
    const r = await deps.music.generate({ prompt: track.prompt, seconds: track.seconds });
    lib.save(track.id, track.name, r.audio, r.mime, ["music", track.tone], deps.now());
    ep.costs.push({ taskId: `music-${track.id}`, provider: "lyria", usd: r.usd, at: deps.now().toISOString() });
  }
  ep.audio.musicAssetIds = [track.id];
  return ep;
}
