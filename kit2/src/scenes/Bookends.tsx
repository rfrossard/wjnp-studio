import React from 'react';
import {AbsoluteFill, Img, staticFile, useCurrentFrame} from 'remotion';
import {C, F, SAFE} from '../theme';
import {BEAT, clamp, softIn} from '../lib';

// Abertura: ponto laranja pulsando no beat + frase
export const Intro: React.FC = () => {
	const frame = useCurrentFrame();
	const since = (frame % BEAT) / BEAT;
	const r = 8 * (1 + 0.35 * Math.exp(-since * 5)) * clamp(frame / 6);
	const s = softIn(frame, 6, 12);
	const out = clamp((frame - 50) / 8);
	return (
		<AbsoluteFill style={{background: C.stage}}>
			<div
				style={{
					position: 'absolute', top: 300, width: 1920, textAlign: 'center',
					fontFamily: F.itau, fontWeight: 300, fontSize: 64, lineHeight: '78px', color: C.ink,
					opacity: s.opacity * (1 - out), transform: `translateY(${s.y}px)`, filter: `blur(${s.blur + out * 8}px)`,
				}}
			>
				Onze formatos para contar
				<br />
				nossas hipóteses e pesquisas
			</div>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				<circle cx={960} cy={540} r={r} fill={C.orange} />
			</svg>
		</AbsoluteFill>
	);
};

// Fechamento: quais skills geram cada formato + logo do International Hub (tratamento 01, sólido escuro)
const LOGO_H = 230;
const HUB_W = (LOGO_H * 606) / 386;
const LIST_X = 640;

export const SKILL_ROWS: {n: string; name: string; cmd: string}[] = [
	{n: '01', name: 'Teaser de hipótese', cmd: '/hub-internacional-video + /motion-director (LED)'},
	{n: '02', name: 'Explicador de pesquisa', cmd: '/flat-science-explainer'},
	{n: '03', name: 'Diário de campo', cmd: '/paper-collage-film'},
	{n: '04', name: 'Linha do tempo', cmd: '/motion-director (nanquim e selo)'},
	{n: '05', name: 'Jornada do experimento', cmd: '/explainer-engaging'},
	{n: '06', name: 'Demo de protótipo', cmd: '/motion-broll · /explainer-default'},
	{n: '07', name: 'Data story', cmd: '/hub-internacional-video (data story)'},
	{n: '08', name: 'Paper explicado', cmd: '/hub-internacional-video (estilo 03)'},
	{n: '09', name: 'Entrevista editorial', cmd: '/editorial-archival-edit + /object-separation'},
	{n: '10', name: 'Visão de futuro', cmd: '/hub-internacional-video (3D, tratamento 07)'},
	{n: '11', name: 'Anúncio', cmd: '/explainer-high-energy'},
];

export const Outro: React.FC<{from: number}> = ({from}) => {
	const frame = useCurrentFrame() - from;
	const logo = softIn(frame, 6, 14);
	const title = softIn(frame, 18, 12);
	const foot = softIn(frame, 40 + SKILL_ROWS.length * 5, 12);
	return (
		<AbsoluteFill style={{background: C.stage}}>
			<Img
				src={staticFile('brand/hub-solid-dark.svg')}
				style={{position: 'absolute', left: SAFE + 20, top: 540 - LOGO_H / 2, width: HUB_W, height: LOGO_H, opacity: logo.opacity, transform: `translateY(${logo.y}px)`, filter: `blur(${logo.blur}px)`}}
			/>
			<div style={{position: 'absolute', left: LIST_X - 50, top: 150, width: 2, height: 780, background: C.hairline, opacity: logo.opacity}} />
			<div style={{position: 'absolute', left: LIST_X, top: 128, width: 1920 - LIST_X - SAFE, fontFamily: F.itau, fontWeight: 300, fontSize: 46, lineHeight: '56px', color: C.ink, opacity: title.opacity, transform: `translateY(${title.y}px)`, filter: `blur(${title.blur}px)`}}>
				Para gerar os vídeos nos formatos e estilos mostrados, use os seguintes skills:
			</div>
			<div style={{position: 'absolute', left: LIST_X, top: 270}}>
				{SKILL_ROWS.map((r, i) => {
					const s = softIn(frame, 36 + i * 5, 10);
					return (
						<div key={r.n} style={{display: 'flex', alignItems: 'baseline', height: 52, opacity: s.opacity, transform: `translateY(${s.y}px)`, filter: `blur(${s.blur}px)`}}>
							<div style={{width: 52, fontFamily: F.mono, fontSize: 22, color: C.orange}}>{r.n}</div>
							<div style={{width: 380, fontFamily: F.display, fontWeight: 700, fontSize: 27, color: C.ink, whiteSpace: 'nowrap'}}>{r.name}</div>
							<div style={{fontFamily: F.mono, fontSize: 24, color: C.ink, whiteSpace: 'nowrap', opacity: 0.92}}>{r.cmd}</div>
						</div>
					);
				})}
			</div>
			<div style={{position: 'absolute', left: LIST_X, top: 870, fontFamily: F.mono, fontSize: 21, lineHeight: '32px', color: C.muted, opacity: foot.opacity, transform: `translateY(${foot.y}px)`}}>
				Som em qualquer formato: <span style={{color: C.ink}}>/sound-effects</span> · roteiro e direção: <span style={{color: C.ink}}>/motion-director</span>
				<br />
				Exemplo: <span style={{color: C.ink}}>/hub-internacional-video teaser de 30 s sobre a nossa hipótese</span>
			</div>
		</AbsoluteFill>
	);
};
