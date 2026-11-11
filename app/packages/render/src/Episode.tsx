import React, { useMemo } from "react";
import { AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame } from "remotion";
import type { Episode as EpisodeT, Scene } from "@wjnp/contracts";
import { musicVolumeAt, narrationWindows } from "./audio";
import { resolveTokens, safeAccent, type DesignTokens } from "./brand/tokens";
import { resolvePreset, presetToTokens } from "./brand/presets";
import { makeTheme, SCENE_TONE, type SceneProps } from "./common";
import { geometry, type Layout } from "./layout";
import { NO_ASSETS, type OutputKind, type RenderProps, type ResolvedAssets, sceneFrames, scenePublishers, scenesFor, totalFrames } from "./model";
import { Captions, FooterMark, Progress, SourceChip } from "./overlays";
import { SceneTransition } from "./Transition";
import { TRANSITION_FRAMES } from "./Transition";
import { TEMPLATES } from "./scenes";
import { ComicOverlay, ComicPanel, NewscastLowerThird, NewscastTicker, newscastBlocks, skinGeometry, skinOf } from "./skins";
import { PapercutBackdrop, papercutVariant } from "./papercut";

const illustrationSrc = (scene: Scene, resolved: ResolvedAssets): string | undefined => {
  const id = (scene as { skin?: { illustration?: string } }).skin?.illustration;
  const rel = id ? resolved.images?.[id] : undefined;
  return rel ? staticFile(rel) : undefined;
};

export const SceneView: React.FC<{
  scene: Scene;
  episode: EpisodeT;
  layout: Layout;
  accent: string;
  tokens: DesignTokens;
  resolved: ResolvedAssets;
  toneOverride?: "light" | "dark";
  /** The transition layer paints a scene a second time; only the base layer carries its audio. */
  silent?: boolean;
  /** frame at which this scene starts in the output, so papercut motion runs on across cuts */
  globalFrom?: number;
}> = ({ scene, episode, layout, accent, tokens, resolved, toneOverride, silent, globalFrom = 0 }) => {
  const base = geometry(layout);
  // The chip row is reserved only when the scene cites a publisher; otherwise it goes back to
  // the content box, so an uncited scene does not carry an empty band above its content.
  const kind = skinOf(scene);
  const chipped = scenePublishers(episode, scene).length || kind === "comic"
    ? base
    : { ...base, content: { ...base.content, y: base.chip.y, h: base.content.h + (base.content.y - base.chip.y) } };
  const geo = skinGeometry(chipped, scene);
  const sceneTone = SCENE_TONE[scene.onScreen.template] ?? "light";
  // a comic panel is printed on paper, whatever the preset's tone
  const variant = kind === "papercut" ? papercutVariant(scene) : undefined;
  const tone = kind === "comic" ? "light" : variant ? (variant === "night" ? "dark" : "light") : toneOverride ?? sceneTone;
  const theme = makeTheme(tone, accent);
  // papercut: captions and the mark sit on the dark water band, whatever the sky
  const bandTheme = variant ? makeTheme("dark", accent) : theme;
  // comic lettering is a heavy sans, never the preset's mono display face
  // comic and papercut are hand-made looks: a heavy sans, never the preset's mono display face
  const sTokens = kind === "comic" || kind === "papercut" ? { ...tokens, type: { ...tokens.type, display: tokens.type.text } } : tokens;
  const props: SceneProps = { scene, episode, layout, geo, theme, tokens: sTokens, resolved };
  const T = TEMPLATES[scene.onScreen.template];
  const narr = resolved.narration[scene.id];
  return (
    <AbsoluteFill style={{ background: theme.bg, overflow: "hidden" }}>
      {kind === "comic" ? <ComicPanel geo={geo} accent={accent} /> : null}
      {variant ? <PapercutBackdrop geo={geo} variant={variant} globalFrom={globalFrom} image={illustrationSrc(scene, resolved)} /> : null}
      <T {...props} />
      {kind === "comic" ? <ComicOverlay scene={scene} geo={geo} tokens={sTokens} /> : null}
      {kind === "newscast" ? <NewscastLowerThird scene={scene} episode={episode} geo={geo} theme={theme} tokens={tokens} /> : null}
      <SourceChip {...props} />
      <FooterMark {...props} theme={bandTheme} />
      <Captions {...props} theme={bandTheme} captionStyle={episode.design.captionStyle ?? "highlight"} />
      {narr && !silent ? <Audio src={staticFile(narr)} /> : null}
    </AbsoluteFill>
  );
};

export const EpisodeVideo: React.FC<RenderProps & { kind: OutputKind; layout: Layout }> = ({ episode, tokens: rawTokens, resolved: res, kind, layout }) => {
  const resolved = res ?? NO_ASSETS;
  const presetCfg = useMemo(() => resolvePreset(
    (episode.design as any).preset ?? "signal",
    (episode.design as any).overrides,
    (episode.design as any).captionStyle,
  ), [episode]);
  const tokens = useMemo(() => {
    // module tokens over defaults first, then the preset wins on typography:
    // the font pair IS the design choice, so it must not be overridden by modules/design/tokens.json
    const moduleTokens = resolveTokens(rawTokens);
    const base = presetToTokens(presetCfg);
    return { ...moduleTokens, type: base.type, preset: base.preset };
  }, [presetCfg, rawTokens]);
  const accent = safeAccent(episode.design.accent.hex);
  const scenes = useMemo(() => scenesFor(episode, kind), [episode, kind]);
  const total = totalFrames(scenes);
  const frame = useCurrentFrame();
  const geo = geometry(layout);
  const windows = useMemo(() => narrationWindows(scenes, (s) => Boolean(resolved.narration[s.id])), [scenes, resolved]);
  // Lay out every scene first, so the transitions can reach both sides of a join.
  const placed = useMemo(() => {
    let at = 0;
    return scenes.map((s) => {
      const from = at;
      const dur = sceneFrames(s);
      at += dur;
      return { scene: s, from, dur };
    });
  }, [scenes]);
  const newsBlocks = useMemo(() => newscastBlocks(placed), [placed]);
  const tKind = presetCfg.transition;
  const tFrames = TRANSITION_FRAMES[tKind];
  const tone = tokens.preset?.defaultTone;
  const fromOf = (s: Scene) => placed.find((p) => p.scene.id === s.id)?.from ?? 0;
  const view = (s: Scene, silent?: boolean) => (
    <SceneView scene={s} episode={episode} layout={layout} accent={accent} tokens={tokens} resolved={resolved} toneOverride={tone} silent={silent} globalFrom={fromOf(s)} />
  );
  return (
    <AbsoluteFill style={{ background: tokens.neutrals.ink! }}>
      {placed.map(({ scene: s, from, dur }) => (
        <Sequence key={s.id} from={from} durationInFrames={dur} layout="none" name={`${s.id} ${s.onScreen.template}`}>
          {view(s)}
        </Sequence>
      ))}
      {/* Handoff layer: over the first tFrames of each incoming scene, both sides are drawn.
          The outgoing scene is offset by -prev.dur so it continues from where it stopped
          instead of replaying its entrance, and both copies are silent so narration plays once. */}
      {tFrames > 0
        ? placed.slice(1).map((cur, i) => {
            const prev = placed[i]!;
            return (
              <Sequence key={`t-${cur.scene.id}`} from={cur.from} durationInFrames={tFrames} layout="none" name={`transition ${tKind}`}>
                <SceneTransition
                  kind={tKind}
                  durationFrames={tFrames}
                  width={geo.W}
                  height={geo.H}
                  outgoing={
                    <Sequence from={-prev.dur} durationInFrames={prev.dur + tFrames} layout="none">
                      {view(prev.scene, true)}
                    </Sequence>
                  }
                  incoming={view(cur.scene, true)}
                />
              </Sequence>
            );
          })
        : null}
      <NewscastTicker episode={episode} scenes={scenes} blocks={newsBlocks} geo={geo} accent={accent} tokens={tokens} />
      <Progress globalFrame={frame} total={total} rect={geo.progress} accent={accent} track="rgba(128,128,128,0.35)" />
      {resolved.music[0] ? <Audio src={staticFile(resolved.music[0])} loop volume={(f) => musicVolumeAt(f, windows, total)} /> : null}
    </AbsoluteFill>
  );
};
