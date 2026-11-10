import React from 'react';
import {AbsoluteFill, Audio, Img, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, F, F2} from '../theme';
import {Shot, TIMELINE, TOTAL, clamp, easeIn, easeInOut, expo, lerp, seg, softIn} from './core';
import {AnimeV, CreatorV, HypeV, LedS, Toon3DV} from './ch1';
import {ComicS, FlatS, JourneyS, ManimS} from './ch2';
import {SketchV2} from './sketch2';
import {AnimeV2, ComicV2, DemoV2, JourneyV2} from './v2';
import {DataV3, FlatV3, HypeV3, InkV3, ShadowV3, StrokeV3, Toon3DV3} from './v3';
import {DataS, Extrude3DS, InkS, ParticlesS, StrokeS} from './ch3';
import {BlenderS, GeomapS, NewsS} from './ch4';
import {Archival} from './Archival';
import {BrollS, DemoS, PodcastS, ScreencastS} from './ch5';
import {CollageS, MosaicS, PixelS, SandS, ShadowS} from './ch6';

// ---------- abertura: relances de estilos no beat ----------
const FLASH = [
	{t: 'pixel', bg: '#0b0b1e', c: '#ffd23f', font: F2.pixel, size: 70},
	{t: 'areia', bg: '#f0b866', c: '#3a2510', font: F.itau, size: 130},
	{t: 'HQ!', bg: '#ffd23f', c: '#e63946', font: F2.comic, size: 200},
	{t: '', img: 'math/intro.svg', bg: '#0b0d12', c: '#f3f4f7', font: F.display, size: 80},
	{t: 'AO VIVO', bg: '#d62828', c: '#fff', font: F.display, size: 150},
	{t: 'Blender', bg: '#2a1d14', c: '#f1c7a5', font: F.itau, size: 140},
	{t: 'ANIME', bg: '#ff2e63', c: '#fff', font: F.display, size: 180},
	{t: 'mosaico', bg: '#1a140c', c: '#e8c062', font: F.itau, size: 130},
];
const Intro: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const i = Math.floor(f / 12);
	if (i < FLASH.length) {
		const x = FLASH[i];
		const l = f % 12;
		return (
			<AbsoluteFill style={{background: x.bg, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
				{'img' in x && x.img ? <Img src={staticFile(x.img)} style={{height: 120, transform: `scale(${1 + 0.12 * Math.exp(-l / 3)})`}} /> : <div style={{fontFamily: x.font, fontSize: x.size, color: x.c, transform: `scale(${1 + 0.12 * Math.exp(-l / 3)})`, fontWeight: 800}}>{x.t}</div>}
			</AbsoluteFill>
		);
	}
	const a = softIn(f, 100, 10), b = softIn(f, 130, 10);
	return (
		<AbsoluteFill style={{background: '#0b0d12', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10}}>
			<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 150, color: '#f3f4f7', opacity: a.opacity, transform: `translateY(${a.y}px)`}}>27 estilos.</div>
			<div style={{fontFamily: F.itau, fontWeight: 300, fontSize: 90, color: C.orange, opacity: b.opacity, transform: `translateY(${b.y}px)`}}>Um pedido.</div>
		</AbsoluteFill>
	);
};

// ---------- fechamento ----------
const Outro: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const a = softIn(f, 14, 12), b = softIn(f, 40, 12), c = softIn(f, 90, 12);
	const credits = [
		'Imagens e áudio da reportagem: TV Globo / Jornal Nacional (uso pessoal)',
		'Dados: awesome-opus-5.5-video-prompts (CC BY 4.0) · AWS Terrain Tiles (Mapzen) · Natural Earth',
		'Fontes: Archivo, IBM Plex Mono, Caveat, Bangers, Comic Neue, Press Start 2P (OFL) · Itau Display',
		'Ferramentas: Remotion 4 · Manim CE 0.22 · Blender 5.2 · whisper.cpp · Chrome headless (CDP)',
		'Skills de terceiros reimplementados no kit: explainer-*, motion-broll (Barty-Bart, MIT) · paper-collage-film (@kaye_creatives)',
	];
	return (
		<AbsoluteFill style={{background: '#0b0d12'}}>
			<div style={{position: 'absolute', top: 250, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 56, color: '#9aa3ae', opacity: a.opacity}}>Tudo começa com</div>
			<div style={{position: 'absolute', top: 340, width: 1920, textAlign: 'center', fontFamily: F.mono, fontSize: 76, color: '#f3f4f7', opacity: b.opacity, transform: `translateY(${b.y}px)`}}>
				<span style={{color: C.orange}}>/motion-director</span> seu pedido
			</div>
			<div style={{position: 'absolute', top: 600, width: 1920, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, opacity: c.opacity}}>
				{credits.map((t) => <div key={t} style={{fontFamily: F.mono, fontSize: 20, color: '#6b7380'}}>{t}</div>)}
			</div>
			<div style={{position: 'absolute', bottom: 60, width: 1920, textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: '#4b5260', opacity: c.opacity}}>feito em 08/11/2026</div>
		</AbsoluteFill>
	);
};

const MAP: Record<string, React.FC<{dur: number}>> = {
	intro: Intro, hype: HypeV3, creator: CreatorV, anime: AnimeV2, toon3d: Toon3DV3, led: LedS,
	flat: FlatV3, journey: JourneyV2, manim: ManimS, sketch: SketchV2, comic: ComicV2,
	datastory: DataV3, stroke: StrokeV3, ink: InkV3, particles: ParticlesS, extrude3d: Extrude3DS,
	news: NewsS, geomap: GeomapS, blender: BlenderS, archival: Archival,
	broll: BrollS, podcast: PodcastS, screencast: ScreencastS, demo: DemoV2,
	sand: SandS, shadow: ShadowV3, collage: CollageS, pixel: PixelS, mosaic: MosaicS, outro: Outro,
};
export const DURATION = TOTAL;

export const Biblioteca: React.FC = () => (
	<AbsoluteFill style={{background: '#000'}}>
		{TIMELINE.map((s) => {
			const Comp = MAP[s.id];
			return (
				<Sequence key={s.id} from={s.start} durationInFrames={s.dur} name={s.id}>
					<Shot dur={s.dur} inT={s.inTrans} outT={s.out}>
						<Comp dur={s.dur} />
					</Shot>
				</Sequence>
			);
		})}
		<Audio src={staticFile('audio/score.wav')} />
	</AbsoluteFill>
);
