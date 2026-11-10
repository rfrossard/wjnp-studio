import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, random, staticFile, useCurrentFrame} from 'remotion';
import {C, F, F2} from '../theme';
import {Invoke, clamp, easeIn, easeInOut, lerp, seg, softIn, spring01} from './core';
import {Flat} from '../scenes/Flat';
import {Journey} from '../scenes/Journey';

// ============ 6 · Flat científico: "como um vídeo vira código" ============
export const FlatS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const head = softIn(f, 12, 14);
	const eq = softIn(f, 200, 12);
	return (
		<AbsoluteFill>
			{/* a cena do kit usa frames absolutos a partir de 300 */}
			<Sequence from={-300} layout="none">
				<Flat hideLabel labels={['tempo t', 'f(t)', 'frame']} />
			</Sequence>
			<div style={{position: 'absolute', top: 150, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 70, color: C.ink, opacity: head.opacity, transform: `translateY(${head.y}px)`, filter: `blur(${head.blur}px)`}}>
				Como um vídeo vira código
			</div>
			<div style={{position: 'absolute', top: 260, width: 1920, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: '#b9c2ff', opacity: eq.opacity}}>
				cada frame = uma função pura do tempo · 30 por segundo
			</div>
			<Invoke id="flat" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};

// ============ 7 · Jornada em take único ============
export const JourneyS: React.FC<{dur: number}> = ({dur}) => (
	<AbsoluteFill>
		<Journey names={['Roteiro', 'Estilos', 'Render', 'Verificação']} ask="27 estilos…" hold={dur - 240} />
		<Invoke id="journey" dur={dur} look="terminal" pos="center" />
	</AbsoluteFill>
);

// ============ 8 · Manim (clipe renderizado pelo Manim de verdade) ============
export const ManimS: React.FC<{dur: number}> = ({dur}) => (
	<AbsoluteFill style={{background: '#0b0d12'}}>
		<OffthreadVideo src={staticFile('clips/manim.mp4')} muted />
		<Invoke id="manim" dur={dur} look="manim" />
	</AbsoluteFill>
);

// ============ 9 · Quadro branco com mão desenhando ============
type Pt = [number, number];
const wob = (pts: Pt[], seed: string, amp = 1.8): Pt[] => pts.map(([x, y], i) => [x + (random(`${seed}x${i}`) - 0.5) * amp, y + (random(`${seed}y${i}`) - 0.5) * amp]);
const circ = (cx: number, cy: number, r: number, n = 48): Pt[] => Array.from({length: n + 3}, (_, i) => { const a = -Math.PI / 2 + (i / n) * Math.PI * 2 * 1.04; return [cx + Math.cos(a) * r * (1 + 0.02 * Math.sin(i)), cy + Math.sin(a) * r]; });
const line = (a: Pt, b: Pt, n = 20): Pt[] => Array.from({length: n + 1}, (_, i) => [lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]);
const lenOf = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);
const atFrac = (p: Pt[], k: number): Pt => {
	const L = lenOf(p) * k; let acc = 0;
	for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + d >= L) { const u = (L - acc) / d; return [lerp(p[i - 1][0], p[i][0], u), lerp(p[i - 1][1], p[i][1], u)]; } acc += d; }
	return p[p.length - 1];
};
const partial = (p: Pt[], k: number): Pt[] => {
	if (k <= 0) return []; if (k >= 1) return p;
	const L = lenOf(p) * k; const out: Pt[] = [p[0]]; let acc = 0;
	for (let i = 1; i < p.length; i++) { const d = Math.hypot(p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]); if (acc + d >= L) { out.push(atFrac(p, k)); break; } out.push(p[i]); acc += d; }
	return out;
};
const toD = (p: Pt[]) => p.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join('');

type Stroke = {pts: Pt[]; a: number; b: number; color?: string; w?: number};
type Word = {text: string; x: number; y: number; size: number; a: number; b: number; color?: string};

const Hand: React.FC<{x: number; y: number}> = ({x, y}) => (
	<svg width={420} height={420} style={{position: 'absolute', left: x - 18, top: y - 380, overflow: 'visible'}}>
		{/* marcador */}
		<g transform="rotate(28 18 380)">
			<rect x={4} y={250} width={30} height={140} rx={6} fill="#1f4fbf" />
			<rect x={4} y={240} width={30} height={20} fill="#111" />
			<path d="M8,390 L19,410 L30,390 Z" fill="#111" />
		</g>
		{/* mão (silhueta simples) */}
		<path d="M40,250 C90,200 190,190 250,230 C300,262 330,330 300,380 C270,430 170,430 120,400 C80,375 60,330 40,300 Z" fill="#f1c7a5" stroke="#c99a76" strokeWidth={3} />
		<path d="M60,262 C40,240 30,215 55,205 C80,196 100,225 112,245" fill="#f1c7a5" stroke="#c99a76" strokeWidth={3} />
	</svg>
);

export const SketchS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const words: Word[] = [
		{text: 'Quantos estilos num vídeo?', x: 300, y: 190, size: 84, a: 10, b: 70},
		{text: '1 base', x: 520, y: 640, size: 64, a: 150, b: 168},
		{text: '+ até 3 acentos', x: 1090, y: 640, size: 60, a: 230, b: 260, color: '#d62828'},
		{text: 'mais que isso = catálogo', x: 760, y: 830, size: 56, a: 330, b: 370, color: '#1f4fbf'},
	];
	const strokes: Stroke[] = [
		{pts: wob(circ(600, 470, 120), 'c1', 3), a: 85, b: 140, w: 7},
		{pts: wob(line([760, 470], [930, 470]), 'ar', 2.5).concat(wob([[905, 448], [932, 470], [905, 492]], 'ah', 2)), a: 172, b: 192, w: 6},
		...[0, 1, 2].map((k) => ({pts: wob(circ(1030 + k * 130, 470, 48, 30), `s${k}`, 2.5), a: 195 + k * 10, b: 215 + k * 10, w: 6, color: '#d62828'})),
		{pts: wob(line([740, 780], [1560, 780]), 'ul', 2), a: 372, b: 392, w: 5, color: '#1f4fbf'},
	];
	// ponta do marcador: segue o traço ou a escrita ativos
	let tip: Pt | null = null;
	for (const s of strokes) if (f >= s.a && f < s.b) tip = atFrac(s.pts, (f - s.a) / (s.b - s.a));
	for (const w of words) if (f >= w.a && f < w.b) tip = [w.x + (w.text.length * w.size * 0.42) * ((f - w.a) / (w.b - w.a)), w.y + w.size * 0.25];
	// apagador na saída
	const er = easeInOut(seg(f, dur - 40, dur - 16));
	return (
		<AbsoluteFill style={{background: '#f7f7f4'}}>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 40% 30%, rgba(255,255,255,0.9), rgba(220,222,218,0.6))'}} />
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{strokes.map((s, i) => <path key={i} d={toD(partial(s.pts, clamp((f - s.a) / (s.b - s.a))))} stroke={s.color ?? '#1a1a1a'} strokeWidth={s.w ?? 6} fill="none" strokeLinecap="round" strokeLinejoin="round" />)}
			</svg>
			{words.map((w, i) => {
				const k = clamp((f - w.a) / (w.b - w.a));
				return (
					<div key={i} style={{position: 'absolute', left: w.x, top: w.y - w.size, fontFamily: F2.hand, fontSize: w.size, color: w.color ?? '#1a1a1a', whiteSpace: 'nowrap', clipPath: `inset(0 ${100 - k * 100}% 0 0)`}}>{w.text}</div>
				);
			})}
			{tip && <Hand x={tip[0]} y={tip[1]} />}
			{/* apagador */}
			{er > 0 && <div style={{position: 'absolute', left: lerp(-500, 1900, er), top: 0, width: 520, height: 1080, background: 'linear-gradient(90deg, rgba(247,247,244,0), #f7f7f4 30%, #f7f7f4)'}} />}
			{er > 0 && <AbsoluteFill style={{background: '#f7f7f4', clipPath: `inset(0 ${100 - er * 100}% 0 0)`}} />}
			<Invoke id="sketch" dur={dur} look="hand" />
		</AbsoluteFill>
	);
};

// ============ 10 · Quadrinhos (HQ) ============
const halftone = (id: string, color: string, r: number) => (
	<pattern id={id} width={12} height={12} patternUnits="userSpaceOnUse"><circle cx={6} cy={6} r={r} fill={color} /></pattern>
);
const Kid: React.FC<{x: number; y: number; s?: number; mood: 'meh' | 'focus' | 'happy'}> = ({x, y, s = 1, mood}) => (
	<g transform={`translate(${x} ${y}) scale(${s})`}>
		<path d="M-90,200 C-90,80 90,80 90,200 Z" fill="#3a6ea5" stroke="#111" strokeWidth={6} />
		<circle r={86} fill="#ffd9b8" stroke="#111" strokeWidth={6} />
		<path d="M-86,-10 C-90,-90 90,-100 86,-10 C60,-60 -40,-70 -86,-10 Z" fill="#2b1b12" stroke="#111" strokeWidth={6} />
		<circle cx={-30} cy={5} r={mood === 'focus' ? 6 : 9} fill="#111" />
		<circle cx={30} cy={5} r={mood === 'focus' ? 6 : 9} fill="#111" />
		{mood === 'meh' && <path d="M-26,48 L26,44" stroke="#111" strokeWidth={6} strokeLinecap="round" />}
		{mood === 'focus' && <path d="M-20,46 Q0,40 20,46" stroke="#111" strokeWidth={6} fill="none" strokeLinecap="round" />}
		{mood === 'happy' && <path d="M-34,36 Q0,78 34,36 Z" fill="#7a1f1f" stroke="#111" strokeWidth={5} />}
	</g>
);
const Balloon: React.FC<{x: number; y: number; w: number; h: number; tail: [number, number]; text: string; size?: number; k: number; think?: boolean}> = ({x, y, w, h, tail, text, size = 34, k, think}) => (
	<g opacity={k > 0 ? 1 : 0} transform={`translate(${x + w / 2} ${y + h / 2}) scale(${0.85 + 0.15 * spring01(k * 0.6, 18, 0.5)}) translate(${-x - w / 2} ${-y - h / 2})`}>
		{think ? (
			<>
				<ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="#fff" stroke="#111" strokeWidth={5} />
				<circle cx={tail[0] + 14} cy={tail[1] - 22} r={12} fill="#fff" stroke="#111" strokeWidth={4} />
				<circle cx={tail[0]} cy={tail[1]} r={7} fill="#fff" stroke="#111" strokeWidth={4} />
			</>
		) : (
			<>
				<path d={`M${x + w * 0.35},${y + h - 4} L${tail[0]},${tail[1]} L${x + w * 0.55},${y + h - 4} Z`} fill="#fff" stroke="#111" strokeWidth={5} strokeLinejoin="round" />
				<rect x={x} y={y} width={w} height={h} rx={h / 2.4} fill="#fff" stroke="#111" strokeWidth={5} />
				<rect x={x + w * 0.33} y={y + h - 10} width={w * 0.25} height={12} fill="#fff" />
			</>
		)}
		<text x={x + w / 2} y={y + h / 2 + size * 0.35} textAnchor="middle" fontFamily="Comic Neue" fontWeight={700} fontSize={size} fill="#111">{text}</text>
	</g>
);
const R = (p: {x: number; y: number; w: number; h: number}) => ({x: p.x, y: p.y, width: p.w, height: p.h});
export const ComicS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const P = [
		{x: 60, y: 60, w: 1060, h: 470},
		{x: 1150, y: 60, w: 710, h: 470},
		{x: 60, y: 560, w: 700, h: 460},
		{x: 790, y: 560, w: 1070, h: 460},
	];
	// câmera lê os quadros em ordem e depois mostra a página inteira
	const cams = [
		{t: 0, i: 0}, {t: 90, i: 1}, {t: 180, i: 2}, {t: 260, i: 3}, {t: 360, i: -1},
	];
	let ci = 0;
	cams.forEach((c, i) => { if (f >= c.t) ci = i; });
	const cur = cams[ci], nxt = cams[ci + 1];
	const tgt = (i: number) => (i < 0 ? {cx: 960, cy: 540, s: 1} : {cx: P[i].x + P[i].w / 2, cy: P[i].y + P[i].h / 2, s: Math.min(1.75, 1920 / P[i].w * 0.92, 1080 / P[i].h * 0.92)});
	const a = tgt(cur.i), b = nxt ? tgt(nxt.i) : a;
	const k = nxt ? easeInOut(seg(f, nxt.t - 16, nxt.t)) : 0;
	const cx = lerp(a.cx, b.cx, k), cy = lerp(a.cy, b.cy, k), s = lerp(a.s, b.s, k);
	const boil = (id: string) => (random(`${id}${Math.floor(f / 3)}`) - 0.5) * 2.4; // stop-motion
	return (
		<AbsoluteFill style={{background: '#f4ecd8', overflow: 'hidden'}}>
			<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})`}}>
				<svg width={1920} height={1080}>
					<defs>
						{halftone('ht-red', '#e63946', 3.2)}{halftone('ht-blue', '#2a6fdb', 3.4)}{halftone('ht-yel', '#f4a261', 3.6)}{halftone('ht-dark', '#111', 2.2)}
					</defs>
					{/* quadro 1: o primeiro render com cara de template */}
					<g>
						<rect {...R(P[0])} fill="url(#ht-blue)" stroke="#111" strokeWidth={8} />
						<rect x={P[0].x + 470} y={P[0].y + 90} width={520} height={300} fill="#ddd" stroke="#111" strokeWidth={6} />
						<rect x={P[0].x + 490} y={P[0].y + 110} width={480} height={240} fill="url(#ht-dark)" opacity={0.25} />
						<text x={P[0].x + 730} y={P[0].y + 250} textAnchor="middle" fontFamily="Archivo" fontWeight={800} fontSize={44} fill="#666">TÍTULO</text>
						<Kid x={P[0].x + 230 + boil('k1')} y={P[0].y + 290} mood="meh" />
						<Balloon x={P[0].x + 40} y={P[0].y + 30} w={380} h={110} tail={[P[0].x + 200, P[0].y + 190]} text="cara de template…" k={clamp((f - 20) / 10)} think />
						<text x={P[0].x + 30} y={P[0].y + 455} fontFamily="Comic Neue" fontWeight={700} fontSize={28} fill="#111">O PRIMEIRO RENDER</text>
					</g>
					{/* quadro 2: checklist anti-slop */}
					<g>
						<rect {...R(P[1])} fill="url(#ht-yel)" stroke="#111" strokeWidth={8} />
						<rect x={P[1].x + 120} y={P[1].y + 60} width={470} height={370} rx={10} fill="#fff" stroke="#111" strokeWidth={6} transform={`rotate(-3 ${P[1].x + 355} ${P[1].y + 245})`} />
						{['ritmo 0,7×', 'um foco por cena', 'molas, sem bounce', 'tudo no beat'].map((t, i) => {
							const on = f >= 110 + i * 12;
							return (
								<g key={t} transform={`rotate(-3 ${P[1].x + 355} ${P[1].y + 245})`}>
									<rect x={P[1].x + 160} y={P[1].y + 110 + i * 78} width={40} height={40} fill="#fff" stroke="#111" strokeWidth={4} />
									{on && <path d={`M${P[1].x + 165},${P[1].y + 130 + i * 78} L${P[1].x + 180},${P[1].y + 148 + i * 78} L${P[1].x + 210},${P[1].y + 100 + i * 78}`} stroke="#e63946" strokeWidth={8} fill="none" strokeLinecap="round" />}
									<text x={P[1].x + 222} y={P[1].y + 142 + i * 78} fontFamily="Comic Neue" fontWeight={700} fontSize={34} fill="#111">{t}</text>
								</g>
							);
						})}
					</g>
					{/* quadro 3: ação */}
					<g>
						<rect {...R(P[2])} fill="url(#ht-red)" stroke="#111" strokeWidth={8} />
						{Array.from({length: 24}, (_, i) => { const an = (i / 24) * Math.PI * 2; const cx3 = P[2].x + 350, cy3 = P[2].y + 250; return <line key={i} x1={cx3 + Math.cos(an) * 160} y1={cy3 + Math.sin(an) * 160} x2={cx3 + Math.cos(an) * 520} y2={cy3 + Math.sin(an) * 520} stroke="#111" strokeWidth={3} />; })}
						<Kid x={P[2].x + 350 + boil('k3')} y={P[2].y + 250} s={0.95} mood="focus" />
						<text x={P[2].x + 60} y={P[2].y + 120} fontFamily="Bangers" fontSize={110} fill="#ffd23f" stroke="#111" strokeWidth={5} transform={`rotate(-10 ${P[2].x + 160} ${P[2].y + 100})`} opacity={f >= 190 ? 1 : 0}>ZOOM!</text>
						<text x={P[2].x + 430} y={P[2].y + 420} fontFamily="Bangers" fontSize={90} fill="#fff" stroke="#111" strokeWidth={5} transform={`rotate(8 ${P[2].x + 500} ${P[2].y + 400})`} opacity={f >= 205 ? 1 : 0}>TCHAC!</text>
					</g>
					{/* quadro 4: agora sim */}
					<g>
						<rect {...R(P[3])} fill="#fff" stroke="#111" strokeWidth={8} />
						<rect {...R(P[3])} fill="url(#ht-blue)" opacity={0.35} />
						<rect x={P[3].x + 480} y={P[3].y + 70} width={520} height={300} fill="#111" stroke="#111" strokeWidth={6} />
						{[0, 1, 2].map((i) => <circle key={i} cx={P[3].x + 600 + i * 140 + boil(`c${i}`) * 4} cy={P[3].y + 220 + Math.sin(f / 8 + i) * 30} r={36} fill={['#ff6200', '#ffd23f', '#2a9d8f'][i]} />)}
						<Kid x={P[3].x + 250 + boil('k4')} y={P[3].y + 260} mood="happy" />
						<Balloon x={P[3].x + 60} y={P[3].y + 30} w={330} h={110} tail={[P[3].x + 220, P[3].y + 170]} text="AGORA SIM!" size={42} k={clamp((f - 290) / 10)} />
					</g>
				</svg>
			</div>
			<Invoke id="comic" dur={dur} look="comic" />
		</AbsoluteFill>
	);
};
