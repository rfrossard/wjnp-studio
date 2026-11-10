import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {clamp, easeIn, easeInOut, lerp, seg, softIn, spring01} from '../lib';
import {FormatLabel} from '../Label';

// Formato 5: um "herói" (a bola laranja) percorre as estações do experimento num take único
const SW = 340, SH = 180;
const ST = [
	{x: 0, y: 0, name: 'Pergunta', land: 24},
	{x: 620, y: 260, name: 'Dados', land: 72},
	{x: 1240, y: 0, name: 'Modelo', land: 120},
	{x: 1860, y: 260, name: 'Piloto', land: 168},
];
const R = 22;
const top = (i: number) => ({x: ST[i].x + SW / 2, y: ST[i].y - R});

// posição da bola no mundo: arcos parabólicos entre os topos das estações
function ball(f: number) {
	if (f <= ST[0].land) {
		const k = seg(f, 0, ST[0].land);
		const p = top(0);
		return {x: p.x, y: lerp(p.y - 320, p.y, k * k), squash: 0};
	}
	for (let i = 0; i < ST.length - 1; i++) {
		const a = ST[i].land, b = ST[i + 1].land;
		if (f <= b) {
			const k = seg(f, a, b);
			const p0 = top(i), p1 = top(i + 1);
			const h = 240;
			const squash = Math.max(Math.exp(-(f - a) * 0.5), Math.exp(-(b - f) * 0.9) * 0.4);
			return {x: lerp(p0.x, p1.x, k), y: lerp(p0.y, p1.y, k) - h * 4 * k * (1 - k), squash};
		}
	}
	const p = top(3);
	return {x: p.x, y: p.y, squash: Math.exp(-(f - ST[3].land) * 0.5)};
}

const Station: React.FC<{i: number; f: number; names?: string[]; ask?: string}> = ({i, f, names, ask}) => {
	const s = ST[i];
	const hit = f - s.land;
	const on = hit >= 0;
	const bump = on ? 1 + 0.06 * Math.exp(-hit * 0.35) * Math.cos(hit * 0.9) : 1;
	const p = clamp(hit / 30);
	let inner: React.ReactNode = null;
	if (i === 0) {
		const txt = ask ?? 'E se…?';
		const n = on ? Math.floor(clamp(hit / 18) * txt.length) : 0;
		inner = <div style={{fontFamily: F.itau, fontWeight: 300, fontSize: 44, color: C.ink}}>{txt.slice(0, n)}<span style={{opacity: on && hit % 16 < 8 ? 1 : 0}}>|</span></div>;
	} else if (i === 1) {
		inner = (
			<svg width={240} height={70}>
				{[0.5, 0.8, 0.35, 0.95, 0.6].map((v, k) => {
					const g = spring01((hit - k * 3) / 30, 14, 0.7);
					return <rect key={k} x={k * 48} y={70 - 70 * v * g} width={30} height={70 * v * g} rx={3} fill={k === 3 ? C.orange : C.muted} />;
				})}
			</svg>
		);
	} else if (i === 2) {
		const rot = on ? hit * 4 : 0;
		inner = (
			<svg width={160} height={80}>
				<g transform={`translate(80 40) rotate(${rot})`} opacity={on ? 1 : 0.3}>
					{[0, 1, 2, 3, 4].map((k) => {
						const a = (k / 5) * Math.PI * 2;
						return <g key={k}><line x1={0} y1={0} x2={Math.cos(a) * 32} y2={Math.sin(a) * 32} stroke={C.muted} strokeWidth={2} /><circle cx={Math.cos(a) * 32} cy={Math.sin(a) * 32} r={7} fill={k === 0 ? C.orange : C.ink} /></g>;
					})}
					<circle r={9} fill={C.ink} />
				</g>
			</svg>
		);
	} else {
		inner = (
			<div style={{width: 240}}>
				<div style={{height: 12, borderRadius: 6, background: C.hairline, overflow: 'hidden'}}>
					<div style={{height: 12, width: `${easeInOut(p) * 100}%`, background: C.orange}} />
				</div>
				<div style={{fontFamily: F.mono, fontSize: 22, color: C.muted, marginTop: 10}}>{p >= 1 ? 'concluído ✓' : `${Math.round(easeInOut(p) * 100)}%`}</div>
			</div>
		);
	}
	return (
		<div style={{position: 'absolute', left: s.x, top: s.y, width: SW, height: SH, transform: `scale(${bump})`, background: C.surface, border: `2px solid ${on ? '#3a4452' : C.hairline}`, borderRadius: 6, padding: '22px 26px', boxSizing: 'border-box'}}>
			<div style={{fontFamily: F.display, fontWeight: 700, fontSize: 26, letterSpacing: '0.06em', color: on ? C.orange : C.muted, marginBottom: 14}}>
				{String(i + 1).padStart(2, '0')} · {(names?.[i] ?? s.name).toUpperCase()}
			</div>
			{inner}
		</div>
	);
};

export const Journey: React.FC<{names?: string[]; ask?: string; hold?: number}> = ({names, ask, hold = 0}) => {
	const f0 = useCurrentFrame();
	const f = f0 < 200 ? f0 : f0 < 200 + hold ? 200 : f0 - hold;
	const b = ball(f);
	// câmera: segue a bola de perto; 180–205 recua para mostrar o percurso todo
	const out = easeInOut(seg(f, 172, 194));
	const camX = lerp(b.x, 1100, out);
	const camY = lerp(b.y + 60, 230, out);
	const sc = lerp(1.25, 0.62, out);
	// entrada: o selo laranja (tela cheia) contrai até virar a bola
	const inK = easeInOut(seg(f, 0, 14));
	const floodR = lerp(1300, R * 1.25, inK);
	// saída: a bola vai ao centro e o mundo se afasta
	const ex = easeIn(seg(f, 212, 240));
	const bx = 960 + (b.x - camX) * sc, by = 540 + (b.y - camY) * sc;
	const ballX = lerp(bx, 960, ex), ballY = lerp(by, 540, ex);
	const sq = b.squash * 0.35;
	const trail = ST.map((s, i) => top(i));
	return (
		<AbsoluteFill style={{background: C.stage, overflow: 'hidden'}}>
			<AbsoluteFill style={{opacity: 1 - ex}}>
				<div style={{position: 'absolute', left: 0, top: 0, transformOrigin: '0 0', transform: `translate(${960 - camX * sc}px, ${540 - camY * sc}px) scale(${sc * (1 - ex * 0.4)})`}}>
					<svg width={2400} height={700} style={{position: 'absolute', left: -100, top: -300, overflow: 'visible'}}>
						<polyline points={trail.map((p) => `${p.x + 100},${p.y + 300}`).join(' ')} fill="none" stroke={C.hairline} strokeWidth={3} strokeDasharray="4 14" strokeLinecap="round" opacity={out} />
					</svg>
					{ST.map((_, i) => <Station key={i} i={i} f={f0 < 200 + hold ? f0 : f} names={names} ask={ask} />)}
				</div>
			</AbsoluteFill>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{f < 14 ? (
					<circle cx={lerp(960, bx, inK)} cy={lerp(540, by, inK)} r={floodR} fill={C.orange} />
				) : (
					<ellipse cx={ballX} cy={ballY + R * sc * sq} rx={R * sc * (1 + sq) * lerp(1, 1.4, ex)} ry={R * sc * (1 - sq) * lerp(1, 1.4, ex)} fill={C.orange} />
				)}
			</svg>
			{f >= 10 && f < 212 && <FormatLabel frame={f} f0={14} n={5} name="JORNADA DO EXPERIMENTO" traits="take único · um herói · câmera que segue" />}
		</AbsoluteFill>
	);
};
