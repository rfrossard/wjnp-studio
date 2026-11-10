import React from "react";
import { Composition, type CalculateMetadataFunction } from "remotion";
import { LIB_DUR, LIB_STYLES, LibStyleDemo, SLATE, type LibStyleId } from "./library/styles8";
import { Episode, FPS } from "@wjnp/contracts";
import golden from "../../../episodes/_golden/sample-illustrative/episode.json";
import { EpisodeVideo } from "./Episode";
import { OUTPUT_SIZES } from "./brand/tokens";
import type { Layout } from "./layout";
import { type OutputKind, type RenderProps, scenesFor, totalFrames } from "./model";

export const GOLDEN_EPISODE = Episode.parse(golden);

const meta =
  (kind: OutputKind): CalculateMetadataFunction<RenderProps> =>
  ({ props }) => {
    const episode = Episode.parse(props.episode); // fail loudly on a malformed episode
    return { durationInFrames: totalFrames(scenesFor(episode, kind)), fps: FPS, width: OUTPUT_SIZES[kind].width, height: OUTPUT_SIZES[kind].height, props: { ...props, episode } };
  };

const make = (kind: OutputKind, layout: Layout): React.FC<RenderProps> => {
  const C: React.FC<RenderProps> = (p) => <EpisodeVideo {...p} kind={kind} layout={layout} />;
  return C;
};
const Master = make("master", "vertical");
const Desktop = make("desktop", "horizontal");
const Cut = make("cut", "vertical");

export const RemotionRoot: React.FC = () => {
  const defaults: RenderProps = { episode: GOLDEN_EPISODE };
  const common = { fps: FPS, defaultProps: defaults } as const;
  return (
    <>
      <Composition id="master" component={Master} width={1080} height={1920} durationInFrames={totalFrames(scenesFor(GOLDEN_EPISODE, "master"))} calculateMetadata={meta("master")} {...common} />
      <Composition id="desktop" component={Desktop} width={1920} height={1080} durationInFrames={totalFrames(scenesFor(GOLDEN_EPISODE, "desktop"))} calculateMetadata={meta("desktop")} {...common} />
      <Composition id="cut" component={Cut} width={1080} height={1920} durationInFrames={totalFrames(scenesFor(GOLDEN_EPISODE, "cut"))} calculateMetadata={meta("cut")} {...common} />
      {(Object.keys(LIB_STYLES) as LibStyleId[]).map((id) => (
        <Composition key={id} id={`lib-${id}`} component={LibStyleDemo} defaultProps={{ id }} width={1920} height={1080} fps={30} durationInFrames={LIB_DUR + 2 * SLATE} />
      ))}
    </>
  );
};
