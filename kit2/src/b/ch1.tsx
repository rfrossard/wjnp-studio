import React, {useMemo} from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, random, staticFile, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {C, F, F2} from '../theme';
import {Invoke, Vertical, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from './core';
import {Led} from '../scenes/Led';
import words from './words.json';

const FPS = 30;
type W = [string, number, number];
const WORDS = words as W[];

// ============ 1 · Anúncio no beat (hype), vertical ============
export const HypeV: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const items = [
		{t: 'NOVO', s: 'vídeo', f0: 6, bg: C.orange, fg: '#fff'},
		{t: 'TODA', s: 'semana', f0: 66, bg: '#101318', fg: '#fff'},
		{t: 'FEITO', s: 'em código', f0: 126, bg: '#f2efe8', fg: '#111'},
		{t: '27', s: 'estilos', f0: 186, bg: C.orange, fg: '#111'},
	];
	let wi = 0;
	items.forEach((it, i) => { if (f >= it.f0 - 2) wi = i; });
	const w = items[wi];
	const next = items[wi + 1];
	const flood = next ? easeIn(seg(f, next.f0 - 12, next.f0 - 2)) : 0;
	const tc = `00:00:${String(Math.floor(f / 30)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
	const settle = f > 250;
	return (
		<Vertical label="9:16 · Reels / Shorts" aside={<Invoke id="hype" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: w.bg}}>
				<div style={{position: 'absolute', top: 700, width: 1080, textAlign: 'center', transform: `scale(${1 + 0.05 * Math.exp(-((f - w.f0) % 15) / 4)})`}}>
					<div style={{display: 'flex', justifyContent: 'center', overflow: 'hidden', height: 300}}>
						{w.t.split('').map((ch, i) => {
							const e = expo((f - w.f0 - i * 2) / 7);
							return <span key={i} style={{display: 'inline-block', fontFamily: F.display, fontWeight: 800, fontSize: 280, lineHeight: '300px', color: w.fg, transform: `translateY(${(1 - e) * 300}px)`}}>{ch}</span>;
						})}
					</div>
					<div style={{fontFamily: F.itau, fontWeight: 300, fontSize: 110, color: w.fg, opacity: clamp((f - w.f0 - 10) / 6), fontStyle: 'italic'}}>{w.s}</div>
				</div>
				{next && flood > 0 && (
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						<circle cx={540} cy={1180} r={lerp(20, 2300, flood)} fill={next.bg} />
					</svg>
				)}
				{/* HUD */}
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6}}>
					{[[60, 120, 1, 1], [1020, 120, -1, 1], [60, 1800, 1, -1], [1020, 1800, -1, -1]].map(([x, y, sx, sy], i) => (
						<path key={i} d={`M${x},${y + sy * 50} L${x},${y} L${x + sx * 50},${y}`} stroke={w.fg} strokeWidth={4} fill="none" />
					))}
				</svg>
				<div style={{position: 'absolute', left: 100, bottom: 150, fontFamily: F.mono, fontSize: 30, color: w.fg, opacity: 0.6}}>REC ● {tc}</div>
				<div style={{position: 'absolute', right: 100, top: 160, fontFamily: F.mono, fontSize: 30, color: w.fg, opacity: 0.6}}>{String(wi + 1).padStart(2, '0')} / 04</div>
				{settle && <div style={{position: 'absolute', bottom: 330, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 40, color: '#111', opacity: clamp((f - 250) / 10)}}>@biblioteca · siga</div>}
			</AbsoluteFill>
		</Vertical>
	);
};

// ============ 2 · Edição punchy de criador, vertical ============
// trecho 36,9–44,4 s do clipe; remove a repetição "numa"; legendas grandes; zoom punch nas palavras-chave
const CRE_WORDS = WORDS.filter(([w, s]) => s >= 36.9 && s < 44.45 && w !== 'numa');
const CRE_CUTS = (() => {
	const cuts: {a: number; b: number}[] = [];
	for (const [, s, e] of CRE_WORDS) {
		const last = cuts[cuts.length - 1];
		if (last && s - last.b < 0.22) last.b = e; else cuts.push({a: Math.max(0, s - 0.06), b: e + 0.04});
	}
	let at = 18;
	return cuts.map((c) => { const len = Math.round((c.b - c.a) * FPS); const r = {...c, at, len}; at += len; return r; });
})();
// tempo do programa → tempo do clipe (para legenda/zoom)
const progToSrc = (fr: number) => {
	for (const c of CRE_CUTS) if (fr >= c.at && fr < c.at + c.len) return c.a + (fr - c.at) / FPS;
	return -1;
};
const PUNCH = ['cinco', 'solução', 'saúde', 'guardanapo'];

export const CreatorV: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const src = progToSrc(f);
	const endProg = CRE_CUTS[CRE_CUTS.length - 1].at + CRE_CUTS[CRE_CUTS.length - 1].len;
	// palavra atual e grupo de até 3 palavras
	const wi = CRE_WORDS.findIndex(([, s, e]) => src >= s - 0.03 && src <= e + 0.05);
	const gStart = wi >= 0 ? wi - (wi % 3) : -1;
	const group = gStart >= 0 ? CRE_WORDS.slice(gStart, gStart + 3) : [];
	// zoom punch
	let z = 1;
	for (const [w, s] of CRE_WORDS) if (PUNCH.includes(w.toLowerCase().replace(/[^a-záéíóúãõç]/g, ''))) { const t = src - s; if (t > 0 && t < 1.2) z = Math.max(z, 1 + 0.18 * spring01(t, 18, 0.55) * (t < 0.9 ? 1 : 1 - (t - 0.9) / 0.3)); }
	const face = src < 39.6 ? '50% 50%' : '64% 40%';
	return (
		<Vertical label="9:16 · Reels / Shorts" aside={<Invoke id="creator" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: '#000'}}>
				{CRE_CUTS.map((c, i) => (
					<Sequence key={i} from={c.at} durationInFrames={c.len} layout="none">
						<AbsoluteFill style={{transform: `scale(${z})`}}>
							<OffthreadVideo src={staticFile('source/clipe.mp4')} trimBefore={Math.round(c.a * FPS)} volume={1.5} style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: face}} />
						</AbsoluteFill>
					</Sequence>
				))}
				{f >= endProg && (() => { const c = CRE_CUTS[CRE_CUTS.length - 1]; return (
					<Freeze frame={Math.round(c.a * FPS) + c.len - 2}>
						<AbsoluteFill><OffthreadVideo src={staticFile('source/clipe.mp4')} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: face}} /></AbsoluteFill>
					</Freeze>); })()}
				{/* barra de progresso estilo stories */}
				<div style={{position: 'absolute', left: 40, right: 40, top: 40, height: 8, borderRadius: 4, background: 'rgba(255,255,255,0.3)'}}>
					<div style={{height: 8, borderRadius: 4, width: `${clamp(f / endProg) * 100}%`, background: '#fff'}} />
				</div>
				{group.length > 0 && (
					<div style={{position: 'absolute', top: 1180, width: 1080, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 26px', padding: '0 60px'}}>
						{group.map(([w, s], k) => {
							const on = src >= s - 0.03;
							const cur = gStart + k === wi;
							const pop = on ? 0.8 + 0.2 * spring01(src - s, 20, 0.6) : 1;
							return (
								<span key={k} style={{fontFamily: F.display, fontWeight: 800, fontSize: 104, lineHeight: '120px', textTransform: 'uppercase', color: cur ? '#ffd23f' : '#fff', opacity: on ? 1 : 0.0, transform: `scale(${pop})`, display: 'inline-block', WebkitTextStroke: '6px #000', paintOrder: 'stroke fill', textShadow: '0 8px 0 rgba(0,0,0,0.35)'}}>
									{w.replace(/[.,]/g, '')}
								</span>
							);
						})}
					</div>
				)}
				<div style={{position: 'absolute', top: 1720, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 26, color: 'rgba(255,255,255,0.75)'}}>Imagens: TV Globo / Jornal Nacional</div>
			</AbsoluteFill>
		</Vertical>
	);
};

// ============ 3 · Anime com cortes rápidos (personagem original) ============
const SpeedLines: React.FC<{f: number; color?: string; cx?: number; cy?: number}> = ({f, color = '#fff', cx = 540, cy = 900}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		{Array.from({length: 90}, (_, i) => {
			const a = random(`sl${i}`) * Math.PI * 2 + f * 0.002;
			const r0 = 380 + random(`sr${i}-${Math.floor(f / 2)}`) * 260;
			const w = 2 + random(`sw${i}`) * 9;
			return <line key={i} x1={cx + Math.cos(a) * r0} y1={cy + Math.sin(a) * r0} x2={cx + Math.cos(a) * 2400} y2={cy + Math.sin(a) * 2400} stroke={color} strokeWidth={w} opacity={0.7} />;
		})}
	</svg>
);
const Hero: React.FC<{f: number; close?: boolean}> = ({f, close}) => {
	// personagem original: cabelo em mechas laranja, olhos grandes, sombra cel recortada
	const sway = Math.sin(f / 6) * 4;
	const blink = f % 70 < 3;
	return (
		<svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, transform: close ? 'scale(2.6) translateY(140px)' : 'none', transformOrigin: '540px 760px'}}>
			<defs><clipPath id="face"><ellipse cx={540} cy={820} rx={230} ry={270} /></clipPath></defs>
			<path d="M300,1920 C320,1300 760,1300 780,1920 Z" fill="#1b2b52" />
			<path d="M300,1920 C320,1300 560,1320 540,1920 Z" fill="#14203e" />
			<ellipse cx={540} cy={820} rx={230} ry={270} fill="#ffe0c7" />
			<ellipse cx={600} cy={860} rx={230} ry={270} fill="#f4c6a6" clipPath="url(#face)" />
			{[[-1, 0], [1, 0]].map(([s], i) => (
				<g key={i} transform={`translate(${540 + s * 92} 840)`}>
					<ellipse rx={62} ry={blink ? 6 : 80} fill="#fff" />
					{!blink && <><ellipse rx={44} ry={62} cy={8} fill="#ff6200" /><ellipse rx={24} ry={36} cy={14} fill="#2a0e00" /><circle cx={-16} cy={-18} r={14} fill="#fff" /></>}
				</g>
			))}
			<path d="M500,990 Q540,1010 580,990" stroke="#a0543a" strokeWidth={6} fill="none" strokeLinecap="round" />
			{/* mechas */}
			{Array.from({length: 9}, (_, i) => {
				const x = 300 + i * 60, tip = 520 + (i % 2) * 40;
				return <path key={i} d={`M${x - 40},700 L${x + sway * (i % 3 - 1)},${tip - 160} L${x + 50},690 Z`} fill={i % 2 ? '#ff6200' : '#e04f00'} />;
			})}
			<path d="M300,720 C320,520 760,520 780,720 C700,650 380,650 300,720 Z" fill="#ff6200" />
		</svg>
	);
};
export const AnimeV: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	// lista de planos (frames): gancho, olhos, título 1, título 2, barra 99%, impacto, "em breve"
	const shots = [0, 40, 75, 120, 165, 230, 262, 300];
	const si = shots.findIndex((s, i) => f >= s && (i === shots.length - 1 || f < shots[i + 1]));
	const shake = (n: number) => (random(`sh${f}`) - 0.5) * n;
	const local = f - shots[si];
	const bgs = ['#ff2e63', '#111', '#ff2e63', '#f5f5f5', '#111', '#fff', '#111', '#0b0d12'];
	const onThrees = Math.floor(f / 3) * 3; // animação de personagem "on threes"
	return (
		<Vertical label="9:16 · trailer" aside={<Invoke id="anime" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: bgs[si], transform: `translate(${si === 5 ? shake(30) : 0}px, ${si === 5 ? shake(30) : 0}px)`}}>
				{(si === 0 || si === 2 || si === 4) && <SpeedLines f={f} color={si === 0 ? '#fff' : si === 2 ? '#111' : '#ff2e63'} />}
				{si === 0 && <Hero f={onThrees} />}
				{si === 1 && <Hero f={onThrees} close />}
				{si === 0 && <div style={{position: 'absolute', top: 240, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 90, color: '#fff', transform: `skewX(-10deg) scale(${1 + 0.3 * Math.exp(-local / 4)})`, WebkitTextStroke: '6px #111', paintOrder: 'stroke fill'}}>EPISÓDIO 1</div>}
				{si === 2 && <div style={{position: 'absolute', top: 760, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 170, color: '#fff', transform: `skewX(-12deg) translateX(${(1 - expo(local / 6)) * 900}px)`, WebkitTextStroke: '8px #111', paintOrder: 'stroke fill'}}>O RENDER</div>}
				{si === 3 && <div style={{position: 'absolute', top: 700, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 120, lineHeight: '130px', color: '#111', transform: `skewX(-12deg) translateX(${-(1 - expo(local / 6)) * 900}px)`}}>QUE NÃO<br /><span style={{color: '#ff2e63'}}>TERMINAVA</span></div>}
				{si === 4 && (
					<div style={{position: 'absolute', top: 860, left: 140, width: 800}}>
						<div style={{height: 60, border: '6px solid #fff', transform: 'skewX(-12deg)'}}><div style={{height: '100%', width: `${lerp(80, 99, easeInOut(local / 50))}%`, background: '#ff2e63'}} /></div>
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 130, color: '#fff', textAlign: 'right', marginTop: 20}}>{Math.floor(lerp(80, 99, easeInOut(local / 50)))}%</div>
					</div>
				)}
				{si === 5 && (
					<AbsoluteFill style={{background: '#fff'}}>
						<div style={{position: 'absolute', top: 640, width: 1080, textAlign: 'center', fontFamily: F2.comic, fontSize: 260, color: '#111', transform: `rotate(-8deg) scale(${1 + 0.4 * Math.exp(-local / 3)})`}}>100%!!</div>
						<SpeedLines f={f} color="#111" />
					</AbsoluteFill>
				)}
				{si === 6 && <AbsoluteFill style={{background: '#111'}} />}
				{si >= 7 && (
					<>
						<Hero f={onThrees} />
						<AbsoluteFill style={{background: 'linear-gradient(transparent 50%, rgba(0,0,0,0.85))'}} />
						<div style={{position: 'absolute', top: 1400, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 110, color: '#fff', letterSpacing: '0.1em', opacity: clamp(local / 8)}}>EM BREVE</div>
					</>
				)}
			</AbsoluteFill>
		</Vertical>
	);
};

// ============ 4 · Toon 3D de game: baú que sobe de nível e abre ============
const TIERS = [
	{name: 'COMUM', c: '#4cc45a', bg: '#173d22'},
	{name: 'RARO', c: '#3a8dff', bg: '#10264d'},
	{name: 'ÉPICO', c: '#b45cff', bg: '#2a1046'},
	{name: 'LENDÁRIO', c: '#ffc23d', bg: '#3d2a08'},
];
const gradMap = (() => {
	const d = new Uint8Array([70, 70, 70, 255, 150, 150, 150, 255, 230, 230, 230, 255, 255, 255, 255, 255]);
	const t = new THREE.DataTexture(d, 4, 1, THREE.RGBAFormat);
	t.minFilter = THREE.NearestFilter; t.magFilter = THREE.NearestFilter; t.needsUpdate = true;
	return t;
})();
const ToonBox: React.FC<{size: [number, number, number]; pos: [number, number, number]; color: string}> = ({size, pos, color}) => {
	const geo = useMemo(() => new THREE.BoxGeometry(...size), [size[0], size[1], size[2]]);
	const edges = useMemo(() => new THREE.EdgesGeometry(geo), [geo]);
	return (
		<group position={pos}>
			<mesh geometry={geo}><meshToonMaterial color={color} gradientMap={gradMap} /></mesh>
			<lineSegments geometry={edges}><lineBasicMaterial color="#1a1033" /></lineSegments>
		</group>
	);
};
const Chest: React.FC<{f: number; tier: number; open: number; hop: number}> = ({f, tier, open, hop}) => {
	const T = TIERS[tier];
	const wood = '#9b5a2a', trim = T.c;
	return (
		<group position={[0, -0.4 + hop, 0]} rotation={[0.25, Math.sin(f / 30) * 0.35 + 0.4, 0]}>
			<ToonBox size={[2.2, 1.2, 1.4]} pos={[0, 0, 0]} color={wood} />
			<ToonBox size={[2.3, 0.18, 1.5]} pos={[0, 0.55, 0]} color={trim} />
			<ToonBox size={[0.3, 1.25, 1.45]} pos={[-0.75, 0, 0]} color={trim} />
			<ToonBox size={[0.3, 1.25, 1.45]} pos={[0.75, 0, 0]} color={trim} />
			{/* tampa articulada na dobradiça de trás */}
			<group position={[0, 0.6, -0.7]} rotation={[-open * 1.9, 0, 0]}>
				<group position={[0, 0.3, 0.7]}>
					<ToonBox size={[2.2, 0.6, 1.4]} pos={[0, 0, 0]} color={wood} />
					<ToonBox size={[2.3, 0.14, 1.5]} pos={[0, 0.28, 0]} color={trim} />
					<ToonBox size={[0.36, 0.42, 0.12]} pos={[0, -0.12, 0.74]} color="#ffd23f" />
				</group>
			</group>
			{open > 0.3 && <mesh position={[0, 0.7, 0]}><sphereGeometry args={[0.55 * open, 24, 24]} /><meshBasicMaterial color="#fff6c9" /></mesh>}
		</group>
	);
};
export const Toon3DV: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const taps = [45, 90, 135];
	const tier = taps.filter((t) => f >= t).length;
	const lastTap = [...taps].reverse().find((t) => f >= t) ?? -999;
	const hopT = (f - lastTap) / 30;
	const hop = hopT >= 0 && hopT < 0.6 ? Math.sin((hopT / 0.6) * Math.PI) * 0.9 : 0;
	const open = easeInOut(seg(f, 185, 215));
	const T = TIERS[tier];
	const burst = f >= 205 ? (f - 205) / 30 : -1;
	return (
		<Vertical label="9:16 · conquista" aside={<Invoke id="toon3d" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 50%, ${T.c}55, ${T.bg} 60%)`}}>
				{/* raios de fundo */}
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.25}}>
					{Array.from({length: 16}, (_, i) => { const a = (i / 16) * Math.PI * 2 + f * 0.01; return <path key={i} d={`M540,980 L${540 + Math.cos(a) * 2000},${980 + Math.sin(a) * 2000} L${540 + Math.cos(a + 0.12) * 2000},${980 + Math.sin(a + 0.12) * 2000} Z`} fill={T.c} />; })}
				</svg>
				<ThreeCanvas width={1080} height={1920} camera={{fov: 30, position: [0, 0.6, 9]}}>
					<ambientLight intensity={0.7} />
					<directionalLight position={[3, 5, 6]} intensity={2.2} />
					<directionalLight position={[-4, 2, -3]} intensity={1.5} color={T.c} />
					<Chest f={f} tier={tier} open={open} hop={hop} />
				</ThreeCanvas>
				{/* partículas da recompensa */}
				{burst >= 0 && (
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						{Array.from({length: 60}, (_, i) => {
							const a = random(`ba${i}`) * Math.PI * 2, v = 600 + random(`bv${i}`) * 900;
							const x = 540 + Math.cos(a) * v * burst, y = 900 + Math.sin(a) * v * burst + 900 * burst * burst;
							return <circle key={i} cx={x} cy={y} r={10 + random(`br${i}`) * 14} fill={i % 3 ? T.c : '#fff6c9'} stroke="#1a1033" strokeWidth={4} />;
						})}
					</svg>
				)}
				<div style={{position: 'absolute', top: 260, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 80, color: '#fff', WebkitTextStroke: '10px #1a1033', paintOrder: 'stroke fill'}}>
					{tier === 0 ? 'TOQUE PARA ABRIR' : T.name}
				</div>
				{f >= 215 && (
					<div style={{position: 'absolute', top: 1380, width: 1080, textAlign: 'center'}}>
						{'CONQUISTA DESBLOQUEADA'.split('').map((ch, i) => {
							const k = spring01((f - 215 - i * 1.2) / 30, 16, 0.5);
							return <span key={i} style={{display: 'inline-block', fontFamily: F.display, fontWeight: 800, fontSize: 64, color: '#ffd23f', transform: `translateY(${(1 - k) * -200}px) scale(${k})`, WebkitTextStroke: '8px #1a1033', paintOrder: 'stroke fill', whiteSpace: 'pre'}}>{ch}</span>;
						})}
						<div style={{fontFamily: F.display, fontWeight: 700, fontSize: 52, color: '#fff', marginTop: 20, opacity: clamp((f - 240) / 10)}}>1º vídeo com 27 estilos</div>
					</div>
				)}
			</AbsoluteFill>
		</Vertical>
	);
};

// ============ 5 · LED (16:9) ============
export const LedS: React.FC<{dur: number}> = ({dur}) => (
	<AbsoluteFill style={{background: '#000'}}>
		<Led
			cards={[
				{f0: 8, f1: 75, lines: [[{t: 'E SE CADA VÍDEO'}], [{t: 'TIVESSE O '}, {t: 'ESTILO CERTO', hi: true}, {t: '?'}]]},
				{f0: 75, f1: 140, lines: [[{t: '27', hi: true}, {t: ' ESTILOS'}], [{t: '1 PEDIDO'}]]},
				{f0: 140, f1: dur, lines: [[{t: '/MOTION-DIRECTOR', hi: true}]]},
			]}
			converge={[dur - 14, dur - 1]}
		/>
		<Invoke id="led" dur={dur} look="led" />
	</AbsoluteFill>
);
