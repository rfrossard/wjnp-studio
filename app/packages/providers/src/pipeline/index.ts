import type { Episode } from "@wjnp/contracts";
import { brainstormBrief, type BrainstormInput } from "./brainstorm";
import type { PipelineDeps } from "./common";
import { extractClaims, type ExtractInput } from "./extract";
import { narrate } from "./narrate";
import { pickMusic } from "./music";
import { writePost } from "./post";
import { reviewScenes } from "./scene";
import { writeScript } from "./script";
import { verifyClaims } from "./verify";

export * from "./common";
export { brainstormBrief, type BrainstormInput } from "./brainstorm";
export { extractClaims, type ExtractInput } from "./extract";
export { verifyClaims, assertIndependentVerifier } from "./verify";
export { writeScript, validateScript, normalizeInCut, numbersNotInClaims, ScriptOut, pickSkeleton } from "./script";
export { fillScene, critiqueScene, reviewScenes, validateCritique, CritiqueOut } from "./scene";
export { narrate, pickVoice } from "./narrate";
export { pickMusic } from "./music";
export { writePost, buildFirstComment } from "./post";

export interface PipelineInput {
  brainstorm: BrainstormInput;
  extract: ExtractInput;
  skeletonId?: string;
  /** run the critic/redo loop on every scene (default true) */
  review?: boolean;
}

/** Whole pipeline in order: brief -> claims -> verification -> script -> scene review -> narration -> post. */
export async function runPipeline(episode: Episode, deps: PipelineDeps, input: PipelineInput): Promise<Episode> {
  let ep = await brainstormBrief(episode, deps, input.brainstorm);
  ep = await extractClaims(ep, deps, input.extract);
  ep = await verifyClaims(ep, deps);
  ep = await writeScript(ep, deps, input.skeletonId ? { skeletonId: input.skeletonId } : {});
  if (input.review !== false) ep = await reviewScenes(ep, deps);
  ep = await narrate(ep, deps);
  ep = await pickMusic(ep, deps);
  ep = await writePost(ep, deps);
  return ep;
}
