import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F, SAFE} from '../theme';
import {clamp, easeIn, easeInOut, expo, lerp, seg} from '../lib';
import {FormatLabel} from '../Label';

// Formato 11: anúncio no beat — palavras que batem, uma forma que carrega cada transição, moldura de visor (HUD)
const WORDS = [
	{t: 'Uma pergunta', f0: 6, bg: C.orange, fg: '#fff'},
	{t: 'Um método', f0: 66, bg: C.navy, fg: '#fff'},
	{t: 'Parceiros', f0: 126, bg: C.stage, fg: '#fff'},
];
const FS = 170;

// letras reveladas por máscara, uma a cada 2 frames (≈ 1/16 de nota a 120 BPM)
const Slam: React.FC<{text: string; f: number; f0: number; fg: string}> = ({text, f, f0, fg}) => (
	<div style={{display: 'flex', fontFamily: F.display, fontWeight: 800, fontSize: FS, lineHeight: 1, color: fg, letterSpacing: '-0.02em', whiteSpace: 'nowrap'}}>
		{text.split('').map((ch, i) => {
			const u = (f - f0 - i * 2) / 7;
			const e = expo(u);
			return (
				<span key={i} style={{display: 'inline-block', overflow: 'hidden', height: FS * 1.05}}>
					<span style={{display: 'inline-block', transform: `translateY(${(1 - e) * FS}px)`}}>{ch === ' ' ? ' ' : ch}</span>
				</span>
			);
		})}
	</div>
);

export const Hype: React.FC = () => {
	const f = useCurrentFrame();
	const wi = f < 66 ? 0 : f < 126 ? 1 : 2;
	const w = WORDS[wi];
	const next = WORDS[wi + 1];
	// transição: o ponto final cresce e inunda a tela com o fundo seguinte
	const flood = next ? easeIn(seg(f, next.f0 - 14, next.f0)) : 0;
	const dotIn = clamp((f - w.f0 - w.t.length * 2 - 4) / 4);
	// fim: tudo se recolhe num ponto que some
	const end = easeInOut(seg(f, 196, 236));
	const tc = `00:${String(Math.floor(f / 30)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
	const textW = w.t.length * FS * 0.6;
	const dotX = 960 + textW / 2 + 30, dotY = 600;
	return (
		<AbsoluteFill style={{background: w.bg}}>
			<AbsoluteFill style={{transform: `scale(${1 - end * 0.9})`, opacity: 1 - clamp((end - 0.7) / 0.3)}}>
				<div style={{position: 'absolute', top: 470, width: 1920, display: 'flex', justifyContent: 'center', transform: `scale(${1 + 0.04 * Math.exp(-((f - w.f0) % 15) / 4)})`}}>
					<Slam text={w.t} f={f} f0={w.f0} fg={w.fg} />
					<div style={{width: 34, height: 34, borderRadius: 17, background: wi === 0 ? '#fff' : C.orange, alignSelf: 'flex-end', marginBottom: 28, marginLeft: 10, transform: `scale(${dotIn})`}} />
				</div>
				{next && flood > 0 && (
					<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
						<circle cx={dotX} cy={dotY} r={lerp(17, 2300, flood)} fill={next.bg} />
					</svg>
				)}
			</AbsoluteFill>
			{/* HUD: cantoneiras, contador de cena e timecode */}
			<svg width={1920} height={1080} style={{position: 'absolute', opacity: 0.55 * (1 - end)}}>
				{[[60, 60, 1, 1], [1860, 60, -1, 1], [60, 1020, 1, -1], [1860, 1020, -1, -1]].map(([x, y, sx, sy], i) => (
					<path key={i} d={`M${x},${y + sy * 40} L${x},${y} L${x + sx * 40},${y}`} stroke="#fff" strokeWidth={2.5} fill="none" />
				))}
			</svg>
			<div style={{position: 'absolute', right: SAFE, top: 74, fontFamily: F.mono, fontSize: 18, color: '#fff', opacity: 0.6 * (1 - end)}}>CENA 11 / 11</div>
			<div style={{position: 'absolute', right: SAFE, bottom: 74, fontFamily: F.mono, fontSize: 18, color: '#fff', opacity: 0.6 * (1 - end), display: 'flex', alignItems: 'center', gap: 10}}>
				<span style={{width: 10, height: 10, borderRadius: 5, background: f % 30 < 15 ? '#fff' : 'transparent', display: 'inline-block'}} />
				{tc}
			</div>
			<div style={{position: 'absolute', left: SAFE, bottom: 74, fontFamily: F.mono, fontSize: 18, color: '#fff', opacity: 0.6 * (1 - end)}}>ANÚNCIO</div>
			{f < 196 && <FormatLabel frame={f} f0={4} n={11} name="ANÚNCIO" traits="no beat · HUD · formas que carregam" accent={wi === 0 ? C.navy : C.orange} traitsColor={wi === 0 ? 'rgba(255,255,255,0.85)' : undefined} />}
		</AbsoluteFill>
	);
};
