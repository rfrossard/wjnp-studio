import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {clamp, easeInOut, lerp, seg, softIn, spring01} from '../lib';
import {FormatLabel} from '../Label';

// Formato 6: demo de protótipo — UMA forma que muda de estado, guiada por um cursor real
const LIGHT = '#f3f4f7';
const INKL = '#0b0b14';

// valor que muda de alvo várias vezes, com uma mola por mudança (função pura do tempo)
const track = (v0: number, keys: [number, number, number?, number?][]) => (f: number) => {
	let v = v0, p = v0;
	for (const [fk, val, w = 14, z = 0.86] of keys) {
		v += (val - p) * spring01((f - fk) / 30, w, z);
		p = val;
	}
	return v;
};

const W = track(40, [[4, 560], [62, 120], [118, 980], [204, 1920, 10, 1]]);
const H = track(40, [[4, 116], [62, 120], [118, 600], [204, 1080, 10, 1]]);
const RAD = track(20, [[4, 58], [62, 60], [118, 8], [204, 0, 10, 1]]);

export const UiDemo: React.FC = () => {
	const f = useCurrentFrame();
	const w = W(f), h = H(f), r = RAD(f);
	const isBtn = f >= 8 && f < 62;
	const isLoader = f >= 62 && f < 100;
	const isDone = f >= 100 && f < 118;
	const isCard = f >= 124;
	const color = f < 6 ? C.orange : isCard ? (seg(f, 204, 240) > 0.6 ? LIGHT : '#ffffff') : C.navy;
	// cursor
	const cx = lerp(1500, 960 + 140, easeInOut(seg(f, 18, 46)));
	const cy = lerp(980, 560, easeInOut(seg(f, 18, 46)));
	const press = f >= 48 && f < 56 ? 0.94 : 1;
	const cursorOut = easeInOut(seg(f, 60, 80));
	const label = softIn(f, 14, 8);
	const chart = easeInOut(seg(f, 140, 190));
	const pts = [0.2, 0.28, 0.25, 0.42, 0.38, 0.55, 0.62, 0.6, 0.78, 0.86];
	const cw = 760, ch = 300;
	const line = pts.map((v, i) => `${(i / (pts.length - 1)) * cw},${ch - v * ch}`).join(' ');
	const exp = seg(f, 204, 240);
	return (
		<AbsoluteFill style={{background: LIGHT}}>
			<div
				style={{
					position: 'absolute', left: 960 - w / 2, top: 540 - h / 2, width: w, height: h, borderRadius: r,
					background: color, transform: `scale(${isBtn ? press : 1})`,
					boxShadow: isCard && exp < 0.5 ? '0 20px 60px rgba(0,0,40,0.12)' : 'none',
					display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
				}}
			>
				{isBtn && (
					<div style={{fontFamily: F.display, fontWeight: 700, fontSize: 40, color: '#fff', opacity: label.opacity * clamp((56 - f) / 4), filter: `blur(${label.blur}px)`, whiteSpace: 'nowrap'}}>
						Rodar experimento
					</div>
				)}
				{isLoader && (
					<svg width={80} height={80}>
						<circle cx={40} cy={40} r={30} stroke="rgba(255,255,255,0.2)" strokeWidth={7} fill="none" />
						<circle cx={40} cy={40} r={30} stroke={C.orange} strokeWidth={7} fill="none" strokeDasharray="60 200" strokeLinecap="round" transform={`rotate(${f * 14} 40 40)`} />
					</svg>
				)}
				{isDone && (
					<svg width={80} height={80}>
						<path d="M22 42 L35 55 L60 28" stroke="#fff" strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeInOut(seg(f, 100, 110))} />
					</svg>
				)}
				{isCard && exp < 0.35 && (
					<div style={{position: 'absolute', left: (w - 980) / 2 + 60, top: (h - 600) / 2 + 50, opacity: clamp((f - 128) / 8) * (1 - clamp(exp * 4))}}>
						<div style={{display: 'flex', alignItems: 'center', gap: 18}}>
							<div style={{fontFamily: F.display, fontWeight: 700, fontSize: 38, color: C.navy}}>Resultado do piloto</div>
							<div style={{fontFamily: F.mono, fontSize: 18, color: '#4f5566', border: '1.5px solid #d5d8e0', borderRadius: 4, padding: '3px 10px'}}>ilustrativo / illustrative</div>
						</div>
						<svg width={cw + 20} height={ch + 40} style={{marginTop: 40, overflow: 'visible'}}>
							{[0, 1, 2, 3].map((k) => (
								<line key={k} x1={0} x2={cw} y1={(k / 3) * ch} y2={(k / 3) * ch} stroke="#d5d8e0" strokeWidth={1.5} />
							))}
							<polyline points={line} fill="none" stroke={C.orange} strokeWidth={6} strokeLinejoin="round" strokeLinecap="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - chart} />
							{chart > 0.98 && <circle cx={cw} cy={ch - 0.86 * ch} r={11} fill={C.orange} stroke="#fff" strokeWidth={4} />}
						</svg>
					</div>
				)}
			</div>
			{/* cursor */}
			{f >= 18 && cursorOut < 1 && (
				<svg width={40} height={52} style={{position: 'absolute', left: cx, top: cy + cursorOut * 300, transform: `scale(${press})`, opacity: 1 - cursorOut}}>
					<path d="M3 3 L3 40 L13 31 L20 47 L27 44 L20 28 L34 28 Z" fill={INKL} stroke="#fff" strokeWidth={2.5} strokeLinejoin="round" />
				</svg>
			)}
			{f < 200 && <FormatLabel frame={f} f0={10} n={6} name="DEMO DE PROTÓTIPO" traits="uma forma · cursor real · molas" dark={false} />}
		</AbsoluteFill>
	);
};
