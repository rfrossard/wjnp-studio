// v2 das cenas fracas (09/11/2026), refeitas contra referências: jornada, demo, HQ e anime.
import React from 'react';
import {AbsoluteFill, OffthreadVideo, Sequence, random, staticFile, useCurrentFrame} from 'remotion';
import Peep from 'react-peeps';
import {C, F, F2} from '../theme';
import {Invoke, Vertical, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from './core';

const ORG = '#ff6a1f';

// ======================= JORNADA v2 =======================
// referência: explainer-engaging — fundo grafite pontilhado, bola com halo e rastro, cartões de UI realistas, câmera perto
const SW = 460, SH = 270;
const ST = [
	{x: 0, y: 0, land: 26, name: 'Roteiro'},
	{x: 720, y: 300, land: 82, name: 'Estilos'},
	{x: 1440, y: 0, land: 138, name: 'Render'},
	{x: 2160, y: 300, land: 194, name: 'Verificação'},
];
const R = 26;
const top = (i: number) => ({x: ST[i].x + SW / 2, y: ST[i].y - R});
const ballAt = (f: number) => {
	if (f <= ST[0].land) { const k = seg(f, 0, ST[0].land); const p = top(0); return {x: p.x, y: lerp(p.y - 380, p.y, k * k)}; }
	for (let i = 0; i < ST.length - 1; i++) {
		const a = ST[i].land, b = ST[i + 1].land;
		if (f <= b) { const k = seg(f, a, b), p0 = top(i), p1 = top(i + 1); return {x: lerp(p0.x, p1.x, k), y: lerp(p0.y, p1.y, k) - 280 * 4 * k * (1 - k)}; }
	}
	return top(3);
};
const Card: React.FC<{i: number; f: number}> = ({i, f}) => {
	const s = ST[i], hit = f - s.land, on = hit >= 0;
	const bump = on ? 1 + 0.05 * Math.exp(-hit * 0.3) * Math.cos(hit * 0.9) : 1;
	const p = clamp(hit / 36);
	const row = (t: string, k: number, done: boolean) => (
		<div key={t} style={{display: 'flex', alignItems: 'center', gap: 14, padding: '9px 0', borderBottom: '1px solid #2a2d33', opacity: on ? clamp((hit - k * 5) / 6) : 0.25}}>
			<div style={{width: 24, height: 24, borderRadius: 12, background: done ? ORG : 'transparent', border: `2px solid ${done ? ORG : '#4a4f58'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 15, fontWeight: 800}}>{done ? '✓' : ''}</div>
			<div style={{fontFamily: F.display, fontWeight: 600, fontSize: 21, color: '#e9ebef'}}>{t}</div>
		</div>
	);
	let body: React.ReactNode = null;
	if (i === 0) body = <>{['Gancho de 3 s', 'Uma ideia por cena', 'Texto curto na tela'].map((t, k) => row(t, k, on && hit > 8 + k * 6))}</>;
	if (i === 1) body = (
		<div style={{display: 'flex', flexWrap: 'wrap', gap: 10, paddingTop: 6}}>
			{['flat', 'manim', 'sketch', 'news', 'pixel', 'geomap', 'creator', 'mosaic'].map((t, k) => {
				const sel = [0, 2, 5].includes(k) && on && hit > 6 + k * 3;
				return <div key={t} style={{fontFamily: F.mono, fontSize: 19, padding: '6px 12px', borderRadius: 16, border: `1.5px solid ${sel ? ORG : '#3b3f47'}`, background: sel ? 'rgba(255,106,31,0.16)' : 'transparent', color: sel ? '#ffd2bd' : '#aeb3bc', opacity: on ? clamp((hit - k * 2) / 5) : 0.3}}>{t}</div>;
			})}
		</div>
	);
	if (i === 2) body = (
		<div style={{paddingTop: 8}}>
			<div style={{display: 'flex', gap: 6}}>{Array.from({length: 8}, (_, k) => <div key={k} style={{flex: 1, height: 52, borderRadius: 4, background: ['#3a7bd5', ORG, '#2fa36b', '#ffc93c', '#8e5cff', '#d62828', '#5ad1e6', '#ff9ad5'][k], opacity: easeInOut(p) * 8 > k ? 1 : 0.12}} />)}</div>
			<div style={{height: 10, borderRadius: 5, background: '#2a2d33', marginTop: 18, overflow: 'hidden'}}><div style={{height: 10, width: `${easeInOut(p) * 100}%`, background: ORG}} /></div>
			<div style={{fontFamily: F.mono, fontSize: 19, color: '#aeb3bc', marginTop: 10}}>frame {Math.round(easeInOut(p) * 15023)} / 15023</div>
		</div>
	);
	if (i === 3) body = <>{['LUFS −18,6', 'Frames das passagens', 'Sincronia ≤ 1 frame'].map((t, k) => row(t, k, on && hit > 8 + k * 6))}</>;
	return (
		<div style={{position: 'absolute', left: s.x, top: s.y, width: SW, height: SH, transform: `scale(${bump})`, background: '#1c1e22', border: `1.5px solid ${on ? '#3b3f47' : '#26292e'}`, borderRadius: 14, padding: '18px 22px', boxSizing: 'border-box', boxShadow: on ? '0 30px 80px rgba(0,0,0,0.55)' : 'none'}}>
			<div style={{display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10}}>
				<div style={{display: 'flex', gap: 6}}>{['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => <span key={c} style={{width: 10, height: 10, borderRadius: 5, background: c, opacity: 0.8}} />)}</div>
				<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 22, color: on ? '#fff' : '#7d828b', marginLeft: 6}}>{String(i + 1).padStart(2, '0')} · {s.name}</div>
			</div>
			{body}
		</div>
	);
};
export const JourneyV2: React.FC<{dur: number}> = ({dur}) => {
	const f0 = useCurrentFrame();
	const hold = dur - 250;
	const f = f0 < 214 ? f0 : f0 < 214 + hold ? 214 : f0 - hold;
	const b = ballAt(Math.min(f, 210));
	const out = easeInOut(seg(f, 214 - 30 + 30, 214 + 1)) ; // recua quando a última estação conclui
	const pull = easeInOut(seg(f0, 214, 244));
	const sc = lerp(1.45, 0.6, pull);
	const camX = lerp(b.x, 1330, pull), camY = lerp(b.y + R + SH * 0.42, 330, pull);
	const trail = Array.from({length: 10}, (_, k) => ballAt(Math.max(0, Math.min(f, 210) - k * 1.5)));
	const toS = (p: {x: number; y: number}) => [960 + (p.x - camX) * sc, 540 + (p.y - camY) * sc];
	const ex = easeIn(seg(f0, dur - 26, dur - 6));
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 40%, #1d2026, #0d0e11 75%)', overflow: 'hidden'}}>
			<AbsoluteFill style={{backgroundImage: 'radial-gradient(#2c2f36 1.5px, transparent 1.6px)', backgroundSize: '36px 36px', backgroundPosition: `${-camX * sc * 0.3}px ${-camY * sc * 0.3}px`}} />
			<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 - camX * sc}px, ${540 - camY * sc}px) scale(${sc})`, opacity: 1 - ex}}>
				<svg width={2800} height={900} style={{position: 'absolute', left: -100, top: -400, overflow: 'visible'}}>
					<polyline points={ST.map((_, i) => `${top(i).x + 100},${top(i).y + 400}`).join(' ')} fill="none" stroke="#3b3f47" strokeWidth={3} strokeDasharray="2 16" strokeLinecap="round" opacity={pull} />
				</svg>
				{ST.map((_, i) => <Card key={i} i={i} f={f0 < 214 + hold ? f0 : f} />)}
			</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: 1 - ex}}>
				<defs><radialGradient id="halo"><stop offset="0%" stopColor="#fff" stopOpacity={0.55} /><stop offset="100%" stopColor="#fff" stopOpacity={0} /></radialGradient></defs>
				{trail.map((p, k) => { const [x, y] = toS(p); return <circle key={k} cx={x} cy={y} r={R * sc * (1 - k / 12)} fill="#fff" opacity={0.08 * (1 - k / 10)} />; })}
				{(() => { const [x, y] = toS(b); return <><circle cx={x} cy={y} r={R * sc * 3.2} fill="url(#halo)" /><circle cx={x} cy={y} r={R * sc} fill="#fff" /></>; })()}
			</svg>
			<Invoke id="journey" dur={dur} look="terminal" pos="center" />
		</AbsoluteFill>
	);
};

// ======================= DEMO v2 =======================
// referência: explainer-default — canvas claro, app recriado (chat com checklist + prévia), câmera de perto que desliza
export const DemoV2: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const prompt = '/motion-director vídeo pessoal com todos os estilos';
	const typed = prompt.slice(0, Math.floor(clamp((f - 40) / 50) * prompt.length));
	const steps = ['Ler o pedido', 'Planejar estilos por trecho', 'Escrever contratos', 'Renderizar e conferir'];
	const rows = [['00:00', 'Abertura', 'hype', '#ff6a1f'], ['00:22', 'Explicação', 'flat', '#3a5bd9'], ['02:56', 'Dados', 'datastory', '#2fa36b'], ['05:19', 'Entrevista', 'archival', '#6b7280'], ['07:50', 'Fecho', 'mosaic', '#c9a227']];
	// câmera: abre perto do campo de prompt, segue a digitação, desliza até a prévia e recua
	const keys: [number, number, number, number][] = [[0, 420, 905, 2.1], [40, 420, 905, 2.1], [90, 560, 905, 2.1], [110, 520, 420, 1.55], [170, 1240, 470, 1.45], [250, 1240, 520, 1.35], [300, 960, 540, 1.0]];
	let cam = keys[0];
	for (let i = 1; i < keys.length; i++) if (f >= keys[i - 1][0]) { const a = keys[i - 1], b = keys[i]; const u = easeInOut(seg(f, a[0], b[0])); cam = [0, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }
	const speed = Math.abs(keys.reduce((s, k, i) => (i && f > keys[i - 1][0] && f < k[0] ? (k[1] - keys[i - 1][1]) / (k[0] - keys[i - 1][0]) : s), 0));
	const prog = easeInOut(seg(f, 262, 330));
	const btnPress = f >= 255 && f < 262;
	return (
		<AbsoluteFill style={{background: '#eceae5'}}>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cam[1] * cam[3]}px, ${540 - cam[2] * cam[3]}px) scale(${cam[3]})`, filter: speed > 6 ? `blur(${Math.min(3, speed / 8)}px)` : undefined}}>
				<div style={{position: 'absolute', left: 120, top: 110, width: 1680, height: 860, borderRadius: 18, background: '#fbfaf8', boxShadow: '0 40px 120px rgba(40,30,10,0.14)', overflow: 'hidden', border: '1px solid #e2ded6'}}>
					<div style={{height: 46, display: 'flex', alignItems: 'center', gap: 8, padding: '0 18px', borderBottom: '1px solid #ece8e0'}}>
						{['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => <span key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}
						<span style={{marginLeft: 16, fontFamily: F.display, fontWeight: 700, fontSize: 16, color: '#2a2a2a'}}>● Estúdio</span>
						<span style={{marginLeft: 'auto', fontFamily: F.mono, fontSize: 14, color: '#8a8a8a'}}>biblioteca-de-estilos</span>
					</div>
					{/* coluna do chat */}
					<div style={{position: 'absolute', left: 0, top: 46, width: 560, bottom: 0, borderRight: '1px solid #ece8e0', padding: '28px 30px', boxSizing: 'border-box'}}>
						<div style={{background: '#f1eee8', borderRadius: 14, padding: '16px 18px', fontFamily: F.display, fontSize: 19, color: '#2a2a2a', opacity: f > 94 ? 1 : 0}}>{prompt}</div>
						<div style={{fontFamily: F.display, fontSize: 18, color: '#555', marginTop: 22, opacity: softIn(f, 110).opacity}}>Vou planejar o vídeo, montar e conferir.</div>
						{steps.map((t, k) => {
							const done = f > 130 + k * 28;
							return (
								<div key={t} style={{display: 'flex', alignItems: 'center', gap: 12, marginTop: 16, opacity: softIn(f, 118 + k * 28).opacity}}>
									<div style={{width: 22, height: 22, borderRadius: 11, background: done ? ORG : 'transparent', border: `2px solid ${done ? ORG : '#cfcac0'}`, color: '#fff', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800}}>{done ? '✓' : ''}</div>
									<span style={{fontFamily: F.display, fontSize: 19, color: '#2a2a2a'}}>{t}</span>
								</div>
							);
						})}
						<div style={{position: 'absolute', left: 30, right: 30, bottom: 30, height: 64, borderRadius: 16, background: '#fff', border: `1.5px solid ${f < 100 ? ORG : '#e2ded6'}`, display: 'flex', alignItems: 'center', padding: '0 18px', fontFamily: F.mono, fontSize: 18, color: '#2a2a2a', whiteSpace: 'pre'}}>
							{f < 100 ? <><span style={{color: ORG}}>{typed.slice(0, 16)}</span>{typed.slice(16)}<span style={{opacity: f % 20 < 10 ? 1 : 0}}>|</span></> : <span style={{color: '#aaa'}}>Escreva um pedido…</span>}
						</div>
					</div>
					{/* prévia: plano de estilos */}
					<div style={{position: 'absolute', left: 600, top: 90, right: 50}}>
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 46, color: '#1d1d1d', opacity: softIn(f, 150).opacity}}>Plano de estilos</div>
						<div style={{fontFamily: F.display, fontSize: 20, color: '#8a8a8a', marginTop: 4, opacity: softIn(f, 160).opacity}}>27 estilos · 6 capítulos · 8 min 21 s</div>
						<div style={{marginTop: 26, border: '1px solid #ece8e0', borderRadius: 12, overflow: 'hidden'}}>
							{rows.map(([t, n, s, c], k) => {
								const a = softIn(f, 175 + k * 10);
								return (
									<div key={n} style={{display: 'flex', alignItems: 'center', gap: 22, padding: '14px 20px', borderBottom: k < rows.length - 1 ? '1px solid #f0ece5' : 'none', opacity: a.opacity, transform: `translateY(${a.y}px)`}}>
										<span style={{fontFamily: F.mono, fontSize: 18, color: '#9a9a9a', width: 64}}>{t}</span>
										<div style={{width: 96, height: 54, borderRadius: 8, background: `linear-gradient(135deg, ${c}, ${c}88)`}} />
										<span style={{fontFamily: F.display, fontWeight: 700, fontSize: 22, color: '#222', width: 220}}>{n}</span>
										<span style={{fontFamily: F.mono, fontSize: 17, padding: '5px 12px', borderRadius: 14, background: `${c}22`, color: c}}>{s}</span>
									</div>
								);
							})}
						</div>
						<div style={{display: 'flex', alignItems: 'center', gap: 20, marginTop: 26, opacity: softIn(f, 230).opacity}}>
							<div style={{background: ORG, color: '#fff', fontFamily: F.display, fontWeight: 700, fontSize: 22, padding: '14px 28px', borderRadius: 12, transform: `scale(${btnPress ? 0.95 : 1})`}}>Renderizar</div>
							<div style={{flex: 1, height: 10, borderRadius: 5, background: '#ece8e0', overflow: 'hidden', opacity: prog > 0 ? 1 : 0}}><div style={{width: `${prog * 100}%`, height: 10, background: ORG}} /></div>
							<span style={{fontFamily: F.mono, fontSize: 18, color: '#777', opacity: prog > 0 ? 1 : 0}}>{prog >= 1 ? 'pronto ✓' : `${Math.round(prog * 100)}%`}</span>
						</div>
					</div>
				</div>
			</div>
			<Invoke id="demo" dur={dur} look="light" pos="top" />
		</AbsoluteFill>
	);
};

// ======================= HQ v2 =======================
// referência: HQ com moldura em retícula, faixa de título, personagem "de verdade" (Open Peeps em vez de boneco feito à mão)
const ht = (id: string, c: string, r: number, s = 12) => <pattern id={id} width={s} height={s} patternUnits="userSpaceOnUse"><circle cx={s / 2} cy={s / 2} r={r} fill={c} /></pattern>;
const Bust: React.FC<{x: number; y: number; w: number; body: string; face: string; flip?: boolean; bob?: number}> = ({x, y, w, body, face, flip, bob = 0}) => (
	<div style={{position: 'absolute', left: x, top: y + bob, width: w, height: w * 1.1, transform: flip ? 'scaleX(-1)' : undefined}}>
		<Peep style={{width: w, height: w * 1.1}} body={body as any} face={face as any} hair="ShortCurly" facialHair="None" accessory="GlassRoundThick" strokeColor="#111" backgroundColor="#fff" viewBox={{x: '0', y: '0', width: '850', height: '935'}} />
	</div>
);
export const ComicV2: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const PG = {x: 300, y: 40, w: 1320, h: 1000};
	const P = [
		{x: PG.x + 40, y: PG.y + 140, w: 740, h: 400, bg: 'url(#hb)'},
		{x: PG.x + 800, y: PG.y + 140, w: 480, h: 400, bg: 'url(#hy)'},
		{x: PG.x + 40, y: PG.y + 560, w: 480, h: 400, bg: 'url(#hr)'},
		{x: PG.x + 540, y: PG.y + 560, w: 740, h: 400, bg: 'url(#hg)'},
	];
	const cams = [{t: 0, i: -1}, {t: 30, i: 0}, {t: 120, i: 1}, {t: 205, i: 2}, {t: 285, i: 3}, {t: 380, i: -1}];
	let ci = 0; cams.forEach((c, i) => { if (f >= c.t) ci = i; });
	const tg = (i: number) => (i < 0 ? {cx: 960, cy: 540, s: 1} : {cx: P[i].x + P[i].w / 2, cy: P[i].y + P[i].h / 2, s: Math.min(1920 / P[i].w, 1080 / P[i].h) * 0.9});
	const a = tg(cams[ci].i), b = cams[ci + 1] ? tg(cams[ci + 1].i) : a;
	const k = cams[ci + 1] ? easeInOut(seg(f, cams[ci + 1].t - 14, cams[ci + 1].t)) : 0;
	const cx = lerp(a.cx, b.cx, k), cy = lerp(a.cy, b.cy, k), s = lerp(a.s, b.s, k);
	const boil = (id: string) => (random(`${id}${Math.floor(f / 3)}`) - 0.5) * 3;
	const pop = (t0: number) => (f < t0 ? 0 : 0.85 + 0.15 * spring01((f - t0) / 30, 18, 0.5));
	const Bal: React.FC<{x: number; y: number; w: number; h: number; tx: number; ty: number; t0: number; children: React.ReactNode; size?: number}> = ({x, y, w, h, tx, ty, t0, children, size = 30}) => (
		<div style={{position: 'absolute', left: x, top: y, width: w, height: h, transform: `scale(${pop(t0)})`, transformOrigin: `${tx - x}px ${ty - y}px`, opacity: f < t0 ? 0 : 1}}>
			<svg width={w} height={h + 80} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
				<path d={`M${w * 0.3},${h - 10} L${tx - x},${ty - y} L${w * 0.48},${h - 8}`} fill="#fff" stroke="#111" strokeWidth={5} strokeLinejoin="round" />
				<ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} fill="#fff" stroke="#111" strokeWidth={5} />
			</svg>
			<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontFamily: F2.comicText, fontWeight: 700, fontSize: size, color: '#111', lineHeight: 1.05, padding: '0 22px', textTransform: 'uppercase'}}>{children}</div>
		</div>
	);
	return (
		<AbsoluteFill style={{background: '#ffe14d', overflow: 'hidden'}}>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cx * s}px, ${540 - cy * s}px) scale(${s})`}}>
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
					<defs>{ht('hb', '#7cc6ff', 4.2)}{ht('hy', '#ffb347', 4.4)}{ht('hr', '#ff7a7a', 4.4)}{ht('hg', '#8de0a6', 4.2)}{ht('frame', '#ff8a1f', 5, 14)}</defs>
					<rect x={PG.x - 20} y={PG.y - 20} width={PG.w + 40} height={PG.h + 40} fill="#fff4dc" stroke="#111" strokeWidth={8} />
					<rect x={PG.x - 20} y={PG.y - 20} width={PG.w + 40} height={PG.h + 40} fill="url(#frame)" opacity={0.6} />
					{P.map((p, i) => <g key={i}><rect x={p.x} y={p.y} width={p.w} height={p.h} fill="#fffaf0" stroke="#111" strokeWidth={7} /><rect x={p.x + 4} y={p.y + 4} width={p.w - 8} height={p.h - 8} fill={p.bg} opacity={0.75} /></g>)}
					{/* quadro 1: tela com "template" */}
					<rect x={P[0].x + 380} y={P[0].y + 60} width={320} height={210} rx={10} fill="#e9e9e9" stroke="#111" strokeWidth={6} />
					<text x={P[0].x + 540} y={P[0].y + 180} textAnchor="middle" fontFamily="Archivo" fontWeight={800} fontSize={40} fill="#9a9a9a">TÍTULO</text>
					{/* quadro 3: linhas de ação */}
					{Array.from({length: 28}, (_, i) => { const an = (i / 28) * Math.PI * 2; const c3 = {x: P[2].x + 240, y: P[2].y + 210}; return <line key={i} x1={c3.x + Math.cos(an) * 150} y1={c3.y + Math.sin(an) * 150} x2={c3.x + Math.cos(an) * 520} y2={c3.y + Math.sin(an) * 520} stroke="#111" strokeWidth={4} opacity={0.55} />; })}
					{/* quadro 4: tela com o vídeo "vivo" */}
					<rect x={P[3].x + 330} y={P[3].y + 60} width={370} height={230} rx={10} fill="#111" stroke="#111" strokeWidth={6} />
					{[0, 1, 2].map((i) => <circle key={i} cx={P[3].x + 420 + i * 95 + boil(`c${i}`)} cy={P[3].y + 175 + Math.sin(f / 7 + i) * 34} r={30} fill={['#ff6a1f', '#ffd23f', '#2fa36b'][i]} stroke="#fff" strokeWidth={3} />)}
				</svg>
				{/* personagem: Open Peeps (mesma pessoa em todos os quadros, expressões diferentes) */}
				<div style={{position: 'absolute', left: P[0].x, top: P[0].y, width: P[0].w, height: P[0].h, overflow: 'hidden'}}><Bust x={-20 + boil('a')} y={70} w={400} body="Device" face="Concerned" /></div>
				<div style={{position: 'absolute', left: P[1].x, top: P[1].y, width: P[1].w, height: P[1].h, overflow: 'hidden'}}><Bust x={190} y={110} w={320} body="Explaining" face="Explaining" flip /></div>
				<div style={{position: 'absolute', left: P[2].x, top: P[2].y, width: P[2].w, height: P[2].h, overflow: 'hidden'}}><Bust x={60 + boil('c')} y={70} w={360} body="Geek" face="Driven" /></div>
				<div style={{position: 'absolute', left: P[3].x, top: P[3].y, width: P[3].w, height: P[3].h, overflow: 'hidden'}}><Bust x={-10 + boil('d')} y={60} w={380} body="PointingUp" face="SmileBig" /></div>
				{/* faixa de título e numeração */}
				<div style={{position: 'absolute', left: PG.x + 30, top: PG.y + 10, transform: 'rotate(-2deg)', background: '#ffd23f', border: '6px solid #111', boxShadow: '8px 8px 0 #111', padding: '6px 26px', fontFamily: F2.comic, fontSize: 76, color: '#e63946', letterSpacing: 2, WebkitTextStroke: '3px #111', paintOrder: 'stroke fill'}}>O PRIMEIRO RENDER!</div>
				<div style={{position: 'absolute', left: PG.x + PG.w - 230, top: PG.y + 30, background: '#fff', border: '4px solid #111', padding: '4px 14px', fontFamily: F2.comic, fontSize: 30, color: '#111', transform: 'rotate(3deg)'}}>BIBLIOTECA #1</div>
				<div style={{position: 'absolute', left: P[0].x + 12, top: P[0].y + 12, background: '#fff8c4', border: '4px solid #111', padding: '4px 12px', fontFamily: F2.comicText, fontWeight: 700, fontSize: 22}}>NOITE DE ESTREIA…</div>
				<Bal x={P[0].x + 330} y={P[0].y + 280} w={360} h={100} tx={P[0].x + 300} ty={P[0].y + 250} t0={50}>parece template…</Bal>
				{/* checklist */}
				<div style={{position: 'absolute', left: P[1].x + 26, top: P[1].y + 40, width: 260, background: '#fff', border: '5px solid #111', padding: '12px 14px', transform: 'rotate(-3deg)', boxShadow: '6px 6px 0 #111'}}>
					{['ritmo 0,7×', 'um foco', 'molas', 'no beat'].map((t, i) => <div key={t} style={{display: 'flex', alignItems: 'center', gap: 10, fontFamily: F2.comicText, fontWeight: 700, fontSize: 26, marginBottom: 6}}><span style={{width: 26, height: 26, border: '4px solid #111', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: '#e63946', fontSize: 24}}>{f >= 135 + i * 12 ? '✔' : ''}</span>{t}</div>)}
				</div>
				<div style={{position: 'absolute', left: P[2].x + 260, top: P[2].y + 40, fontFamily: F2.comic, fontSize: 120, color: '#ffd23f', WebkitTextStroke: '6px #111', paintOrder: 'stroke fill', transform: `rotate(-10deg) scale(${pop(215)})`, opacity: f < 215 ? 0 : 1}}>ZOOM!</div>
				<div style={{position: 'absolute', left: P[2].x + 230, top: P[2].y + 270, fontFamily: F2.comic, fontSize: 92, color: '#fff', WebkitTextStroke: '5px #111', paintOrder: 'stroke fill', transform: `rotate(8deg) scale(${pop(240)})`, opacity: f < 240 ? 0 : 1}}>TCHAC!</div>
				<Bal x={P[3].x + 300} y={P[3].y + 300} w={300} h={90} tx={P[3].x + 280} ty={P[3].y + 230} t0={305} size={38}>agora sim!</Bal>
			</div>
			<Invoke id="comic" dur={dur} look="comic" />
		</AbsoluteFill>
	);
};

// ======================= ANIME v2 (vertical) =======================
// referência: trailer em anime da coleção — cidade à noite com lua, títulos com brilho, painéis diagonais com aura, impact frame.
// Personagem: você (footage real) com tratamento duotone + contorno luminoso, em vez de boneco desenhado.
const City: React.FC<{f: number}> = ({f}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		<defs>
			<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#0b0f2e" /><stop offset="70%" stopColor="#1d2a5a" /><stop offset="100%" stopColor="#3a2a6a" /></linearGradient>
			<radialGradient id="moon"><stop offset="0%" stopColor="#fffbe8" /><stop offset="70%" stopColor="#fff2c8" /><stop offset="100%" stopColor="#fff2c8" stopOpacity={0} /></radialGradient>
		</defs>
		<rect width={1080} height={1920} fill="url(#sky)" />
		<circle cx={720} cy={520} r={330} fill="url(#moon)" />
		{Array.from({length: 26}, (_, i) => { const w = 60 + random(`bw${i}`) * 90, h = 260 + random(`bh${i}`) * 620, x = i * 44 - 40; return <g key={i}><rect x={x} y={1920 - h} width={w} height={h} fill={i % 2 ? '#0d1230' : '#121a3e'} />{Array.from({length: 12}, (_, j) => random(`wn${i}${j}`) > 0.6 ? <rect key={j} x={x + 10 + (j % 3) * 18} y={1920 - h + 30 + Math.floor(j / 3) * 46} width={8} height={14} fill="#ffcf7a" opacity={0.8} /> : null)}</g>; })}
		{Array.from({length: 90}, (_, i) => { const x = (random(`rx${i}`) * 1200 + f * 6) % 1200 - 60, y = (random(`ry${i}`) * 2000 + f * 48) % 2000 - 40; return <line key={i} x1={x} y1={y} x2={x - 6} y2={y + 38} stroke="#9fb4ff" strokeWidth={2} opacity={0.35} />; })}
	</svg>
);
const Glow: React.FC<{t: string; top: number; size: number; color: string; sub?: string; f: number; t0: number}> = ({t, top, size, color, sub, f, t0}) => {
	const e = expo((f - t0) / 8);
	return (
		<div style={{position: 'absolute', top, width: 1080, textAlign: 'center', opacity: clamp((f - t0) / 3), transform: `scale(${1.25 - 0.25 * e})`}}>
			<div style={{fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1, color: '#fff', textShadow: `0 0 18px ${color}, 0 0 46px ${color}, 0 6px 0 rgba(0,0,0,0.4)`, letterSpacing: '0.02em', transform: 'skewX(-8deg)'}}>{t}</div>
			{sub && <div style={{display: 'inline-block', marginTop: 18, background: '#111', color: '#fff', fontFamily: F.display, fontWeight: 800, fontSize: 40, padding: '6px 22px', borderLeft: `8px solid ${color}`, letterSpacing: '0.18em'}}>{sub}</div>}
		</div>
	);
};
const Hero: React.FC<{trim: number; tint: string; scale?: number; ox?: string}> = ({trim, tint, scale = 1, ox = '64% 35%'}) => (
	<AbsoluteFill>
		<OffthreadVideo src={staticFile('source/clipe.mp4')} trimBefore={trim} muted style={{width: '100%', height: '100%', objectFit: 'cover', objectPosition: ox, transform: `scale(${scale})`, filter: 'grayscale(1) contrast(1.6) brightness(1.05)'}} />
		<AbsoluteFill style={{background: tint, mixBlendMode: 'multiply'}} />
		<AbsoluteFill style={{background: 'linear-gradient(180deg, transparent 40%, rgba(10,12,40,0.85))'}} />
	</AbsoluteFill>
);
const Lines: React.FC<{f: number; color: string}> = ({f, color}) => (
	<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
		{Array.from({length: 70}, (_, i) => { const a = random(`l${i}`) * Math.PI * 2; const r0 = 420 + random(`lr${i}-${Math.floor(f / 2)}`) * 300; return <line key={i} x1={540 + Math.cos(a) * r0} y1={900 + Math.sin(a) * r0} x2={540 + Math.cos(a) * 2400} y2={900 + Math.sin(a) * 2400} stroke={color} strokeWidth={2 + random(`lw${i}`) * 7} opacity={0.6} />; })}
	</svg>
);
export const AnimeV2: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const shots = [0, 60, 120, 195, 225, 250, 300];
	const si = shots.reduce((acc, s, i) => (f >= s ? i : acc), 0);
	const l = f - shots[si];
	const shake = si === 4 ? (random(`sh${f}`) - 0.5) * 34 : 0;
	return (
		<Vertical label="9:16 · trailer" aside={<Invoke id="anime" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: '#0b0f2e', transform: `translate(${shake}px, ${shake * 0.6}px)`}}>
				{si === 0 && (<><City f={f} /><Glow t="EPISÓDIO 1" top={300} size={150} color="#5ad1ff" sub="A BIBLIOTECA" f={f} t0={10} /></>)}
				{si === 1 && (<><Sequence from={shots[1]} layout="none"><Hero trim={Math.round(40.3 * 30)} tint="#5a6bff" scale={1.1} /></Sequence><Lines f={f} color="#9fb4ff" /><Glow t="O ENGENHEIRO" top={1380} size={120} color="#5ad1ff" f={f} t0={shots[1] + 6} /></>)}
				{si === 2 && (
					<>
						{/* painéis diagonais com aura: você × o render */}
						<div style={{position: 'absolute', inset: 0, clipPath: 'polygon(0 0, 68% 0, 32% 100%, 0 100%)', background: 'linear-gradient(160deg, #ff3d00, #ff9e00)'}}>
							<Sequence from={shots[2]} layout="none"><div style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply'}}><Hero trim={Math.round(45.5 * 30)} tint="#ff6a1f" ox="62% 30%" /></div></Sequence>
						</div>
						<div style={{position: 'absolute', inset: 0, clipPath: 'polygon(68% 0, 100% 0, 100% 100%, 32% 100%)', background: 'linear-gradient(200deg, #00e5a8, #00a3ff)'}}>
							<div style={{position: 'absolute', left: 520, top: 1180, width: 460}}>
								<div style={{height: 46, border: '6px solid #fff', transform: 'skewX(-12deg)', boxShadow: '0 0 30px #9ffff0'}}><div style={{height: '100%', width: `${lerp(70, 99, easeInOut(l / 60))}%`, background: '#fff'}} /></div>
								<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 110, color: '#fff', textAlign: 'right', textShadow: '0 0 24px #9ffff0'}}>{Math.floor(lerp(70, 99, easeInOut(l / 60)))}%</div>
							</div>
						</div>
						<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}><line x1={734} y1={0} x2={346} y2={1920} stroke="#fff" strokeWidth={14} /></svg>
						<Glow t="VS" top={820} size={200} color="#fff" f={f} t0={shots[2] + 4} />
						<div style={{position: 'absolute', left: 60, top: 200, fontFamily: F.display, fontWeight: 800, fontSize: 64, color: '#fff', textShadow: '0 0 20px #ff6a1f', transform: 'skewX(-10deg)'}}>O CRIADOR</div>
						<div style={{position: 'absolute', right: 60, top: 1700, fontFamily: F.display, fontWeight: 800, fontSize: 64, color: '#fff', textShadow: '0 0 20px #00e5a8', transform: 'skewX(-10deg)'}}>O RENDER</div>
					</>
				)}
				{si === 3 && (<><AbsoluteFill style={{background: '#111'}} /><Lines f={f} color="#ff2e63" /><Glow t="99%…" top={760} size={220} color="#ff2e63" f={f} t0={shots[3] + 2} /></>)}
				{si === 4 && (<><AbsoluteFill style={{background: '#fff'}} /><Lines f={f} color="#111" /><div style={{position: 'absolute', top: 700, width: 1080, textAlign: 'center', fontFamily: F2.comic, fontSize: 280, color: '#111', transform: `rotate(-8deg) scale(${1 + 0.4 * Math.exp(-l / 3)})`}}>100%!!</div></>)}
				{si === 5 && <AbsoluteFill style={{background: '#000'}} />}
				{si >= 6 && (<><City f={f} /><Glow t="EM BREVE" top={760} size={130} color="#ff6a1f" sub="TODA SEMANA" f={f} t0={shots[6] + 4} /></>)}
				<div style={{position: 'absolute', bottom: 60, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: 'rgba(255,255,255,0.55)'}}>Imagens: TV Globo / Jornal Nacional</div>
			</AbsoluteFill>
		</Vertical>
	);
};
