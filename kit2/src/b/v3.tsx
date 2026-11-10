// v3 (09/11/2026): as sete cenas que ficaram abaixo da barra na auditoria — hype, toon3d, flat, datastory, stroke, ink, shadow.
// Cada uma refeita contra a referência do próprio estilo (ver references/quality.md).
import React, {useMemo} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import Peep from 'react-peeps';
import {getStroke} from 'perfect-freehand';
import {C, F, F2} from '../theme';
import {Invoke, Vertical, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from './core';
import {Rough, Written, rCircle, rLine, rPath, rRect, textWidth} from './hand';

const toPath = (o: number[][]) => {
	if (!o.length) return '';
	const d = o.reduce((acc: (string | number)[], [x0, y0], i, arr) => { const [x1, y1] = arr[(i + 1) % arr.length]; acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); return acc; }, ['M', ...o[0], 'Q']);
	d.push('Z');
	return d.join(' ');
};

// =====================================================================================
// HYPE v3 — receita do explainer-high-energy: forma que atravessa todos os cortes, slam, trio cinético,
// visual-assinatura (partículas → anel → explosão), HUD de visor. 120 BPM = 15 frames por batida.
// =====================================================================================
const INK = '#0B0B10', CREAM = '#EDEBE4', EBLUE = '#2F47FF';
const HUD: React.FC<{f: number; n: number; label: string; dark: boolean}> = ({f, n, label, dark}) => {
	const c = dark ? '#fff' : INK;
	const tc = `00:${String(Math.floor(f / 30)).padStart(2, '0')}:${String(f % 30).padStart(2, '0')}`;
	return (
		<>
			<svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55}}>
				{[[64, 110, 1, 1], [1016, 110, -1, 1], [64, 1810, 1, -1], [1016, 1810, -1, -1]].map(([x, y, sx, sy], i) => <path key={i} d={`M${x},${y + sy * 46} L${x},${y} L${x + sx * 46},${y}`} stroke={c} strokeWidth={3} fill="none" />)}
			</svg>
			<div style={{position: 'absolute', right: 96, top: 140, fontFamily: F.mono, fontSize: 26, color: c, opacity: 0.55}}>CENA {String(n).padStart(2, '0')} / 05</div>
			<div style={{position: 'absolute', left: 96, bottom: 140, fontFamily: F.mono, fontSize: 26, color: c, opacity: 0.55}}>{label}</div>
			<div style={{position: 'absolute', right: 96, bottom: 140, fontFamily: F.mono, fontSize: 26, color: c, opacity: 0.55}}><span style={{color: '#ff2a2a'}}>●</span> {tc}</div>
		</>
	);
};
const Mask: React.FC<{t: string; f: number; f0: number; step: number; style: React.CSSProperties}> = ({t, f, f0, step, style}) => (
	<div style={{display: 'flex', justifyContent: 'center'}}>
		{t.split('').map((ch, i) => {
			const e = expo((f - f0 - i * step) / 6);
			return <span key={i} style={{display: 'inline-block', overflow: 'hidden', lineHeight: 1.0}}><span style={{...style, display: 'inline-block', transform: `translateY(${(1 - e) * 105}%)`, whiteSpace: 'pre'}}>{ch}</span></span>;
		})}
	</div>
);
export const HypeV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const sec = f < 45 ? 0 : f < 105 ? 1 : f < 240 ? 2 : f < 330 ? 3 : 4;
	const LBL = ['INTRO', 'SLAM', 'KINETIC TYPE', 'SIGNATURE', 'FIM'];
	let bg = INK, dark = true;
	const land = (f0: number) => 1 + 0.06 * Math.exp(-Math.max(0, f - f0) / 4);
	let body: React.ReactNode = null;
	if (sec === 0) {
		// faísca → linha (que vira o sublinhado do slam)
		const k = easeInOut(seg(f, 18, 42));
		body = (
			<>
				<div style={{position: 'absolute', top: 780, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: '#9aa3ae', letterSpacing: '0.2em', opacity: clamp((f - 4) / 6)}}>INTRODUZINDO — 2026</div>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<circle cx={540} cy={1180} r={f < 18 ? 14 * spring01(f / 12, 14, 0.5) : 0} fill={C.orange} />
					{f >= 18 && <rect x={540 - 400 * k} y={1174} width={800 * k} height={12} rx={6} fill={C.orange} />}
					{f >= 8 && f < 22 && <circle cx={540} cy={1180} r={20 + (f - 8) * 9} fill="none" stroke={C.orange} strokeWidth={3} opacity={1 - (f - 8) / 14} />}
				</svg>
			</>
		);
	} else if (sec === 1) {
		const dot = easeIn(seg(f, 92, 105));
		body = (
			<>
				<div style={{position: 'absolute', top: 470, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 30, color: '#9aa3ae', letterSpacing: '0.2em'}}>INTRODUZINDO — 2026</div>
				<div style={{position: 'absolute', top: 560, width: 1080, transform: `scale(${land(49)})`}}>
					<Mask t="27" f={f} f0={45} step={4} style={{fontFamily: F.display, fontWeight: 800, fontSize: 560, color: '#fff', letterSpacing: '-0.04em'}} />
				</div>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}><rect x={140} y={1174} width={800} height={12} rx={6} fill={C.orange} /></svg>
				<div style={{position: 'absolute', top: 1210, width: 1080, display: 'flex', justifyContent: 'center', alignItems: 'baseline'}}>
					<Mask t="ESTILOS" f={f} f0={55} step={4} style={{fontFamily: F.display, fontWeight: 800, fontSize: 176, color: '#fff'}} />
					<span style={{display: 'inline-block', width: 50}}>
						{f >= 82 && <svg width={50} height={60} style={{overflow: 'visible'}}><circle cx={22 + (540 - 900) * dot} cy={-14 + (-300) * dot} r={20 + dot * 2300} fill={C.orange} /></svg>}
					</span>
				</div>
				<div style={{position: 'absolute', top: 1430, width: 1080, textAlign: 'center', fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 86, color: '#cfd3da', opacity: clamp((f - 80) / 6) * (1 - dot)}}>num pedido só</div>
			</>
		);
	} else if (sec === 2) {
		const sub = f < 135 ? 0 : f < 165 ? 1 : f < 195 ? 2 : 3;
		if (sub === 0) {
			bg = C.orange; dark = false;
			const e = spring01((f - 105) / 30, 14, 0.55);
			body = <div style={{position: 'absolute', top: 760, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 330, color: INK, transform: `translateX(${(1 - e) * -600}px)`, filter: `blur(${(1 - clamp(e)) * 14}px)`}}>NOVO</div>;
		} else if (sub === 1) {
			bg = '#000';
			body = (
				<>
					{Array.from({length: 15}, (_, r) => (
						<div key={r} style={{position: 'absolute', top: r * 130 - 20, left: ((r % 2 ? -1 : 1) * (f - 135) * 6) - 300, whiteSpace: 'nowrap', fontFamily: F.display, fontWeight: 800, fontSize: 124, color: 'transparent', WebkitTextStroke: `2px ${C.orange}`, opacity: 0.45}}>TODA SEMANA · TODA SEMANA · TODA SEMANA</div>
					))}
					<div style={{position: 'absolute', top: 700, width: 1080, textAlign: 'center', transform: `scale(${land(135)})`}}>
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 250, lineHeight: 1, color: C.orange, background: '#000', display: 'inline-block', padding: '0 20px'}}>TODA</div>
						<br />
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 200, lineHeight: 1.05, color: C.orange, background: '#000', display: 'inline-block', padding: '0 20px'}}>SEMANA</div>
					</div>
				</>
			);
		} else if (sub === 2) {
			bg = EBLUE;
			const e = expo((f - 165) / 7);
			body = (
				<>
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						{[[150, 640, 1, 1], [930, 640, -1, 1], [150, 1200, 1, -1], [930, 1200, -1, -1]].map(([x, y, sx, sy], i) => <path key={i} d={`M${x + sx * (1 - e) * -60},${y + sy * 90} L${x + sx * (1 - e) * -60},${y} L${x + sx * 90 + sx * (1 - e) * -60},${y}`} stroke="#fff" strokeWidth={8} fill="none" />)}
					</svg>
					<div style={{position: 'absolute', left: 170, top: 600, fontFamily: F.mono, fontSize: 26, color: '#fff', opacity: 0.8}}>1080 × 1920</div>
					<div style={{position: 'absolute', top: 700, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, color: '#fff', lineHeight: 1, transform: `scale(${land(165)})`, filter: `blur(${(1 - e) * 10}px)`}}>
						<div style={{fontSize: 210}}>EM</div>
						<div style={{fontSize: 200}}>CÓDIGO</div>
					</div>
				</>
			);
		} else {
			bg = CREAM; dark = false;
			const size = 210, w = textWidth('de verdade', 'felix', size);
			const flood = easeIn(seg(f, 228, 240));
			body = (
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<text x={540} y={760} textAnchor="middle" fontFamily={F.mono} fontSize={30} fill="#6b6b6b" letterSpacing="0.2em">E FEITO À MÃO</text>
					<Written text="de verdade" font="felix" x={540 - w / 2} y={1010} size={size} k={seg(f, 198, 226)} color={INK} />
					{f >= 222 && <circle cx={540 + w / 2 + 30} cy={1000} r={14 * spring01((f - 222) / 20, 16, 0.5) + flood * 2300} fill={INK} />}
				</svg>
			);
		}
	} else if (sec === 3) {
		bg = INK;
		const N = 240;
		const kRing = easeInOut(seg(f, 262, 292)), kBurst = easeInOut(seg(f, 300, 336));
		const rot = (f - 240) * 0.004;
		body = (
			<>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					<g transform={`rotate(${(f - 240) * 0.25} 540 960)`}>
						{Array.from({length: N}, (_, i) => {
							const s1 = random(`hp${i}`), s2 = random(`hq${i}`);
							const lane = Math.floor(s2 * 6);
							const fx = ((s1 * 1400 + (f - 240) * (8 + lane * 2)) % 1400) - 160;
							const fy = 360 + lane * 230 + Math.sin(fx / 140 + lane) * 70;
							const a = (i / N) * Math.PI * 2 + rot;
							const R = 330 + Math.sin(i * 7.1) * 10;
							const rx = 540 + Math.cos(a) * R, ry = 960 + Math.sin(a) * R;
							const bx = 540 + Math.cos(a) * (R + kBurst * (900 + s1 * 900)), by = 960 + Math.sin(a) * (R + kBurst * (900 + s1 * 900));
							const x = f < 300 ? lerp(fx, rx, kRing) : bx, y = f < 300 ? lerp(fy, ry, kRing) : by;
							const col = [C.orange, CREAM, EBLUE, '#ffd23f'][i % 4];
							return <circle key={i} cx={x} cy={y} r={f < 300 ? 7 + s2 * 6 : (7 + s2 * 6) * (1 - kBurst * 0.6)} fill={col} opacity={f < 300 ? 0.95 : 1 - kBurst * kBurst * 0.95} />;
						})}
					</g>
				</svg>
				<div style={{position: 'absolute', top: 880, width: 1080, textAlign: 'center', opacity: clamp((f - 284) / 4) * (1 - clamp((f - 304) / 6))}}>
					<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 130, color: '#fff', lineHeight: 1}}>27</div>
					<div style={{fontFamily: F.mono, fontSize: 30, color: C.orange, letterSpacing: '0.2em'}}>ESTILOS · 1 PEDIDO</div>
				</div>
				{f >= 300 && f < 306 && <AbsoluteFill style={{background: C.orange, opacity: 0.55 * (1 - (f - 300) / 6)}} />}
			</>
		);
	} else {
		bg = INK;
		const d = spring01((f - 332) / 30, 12, 0.6);
		const ring = (f - 340) / 30;
		const txt = expo((f - 352) / 10);
		body = (
			<>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					{ring > 0 && ring < 1 && <circle cx={540} cy={960} r={40 + ring * 600} fill="none" stroke={C.orange} strokeWidth={6 * (1 - ring)} />}
					<circle cx={lerp(540, 870, txt)} cy={lerp(960, 1012, txt)} r={lerp(40 * d, 22, txt)} fill={C.orange} />
				</svg>
				<div style={{position: 'absolute', top: 880, left: lerp(540, 160, txt) - 0, width: 720, fontFamily: F.display, fontWeight: 800, fontSize: 140, color: '#fff', clipPath: `inset(0 ${(1 - txt) * 100}% 0 0)`}}>biblioteca</div>
				<div style={{position: 'absolute', top: 1090, width: 1080, textAlign: 'center', fontFamily: F.mono, fontSize: 32, color: '#9aa3ae', letterSpacing: '0.15em', opacity: clamp((f - 370) / 8)}}>SIGA ↗ NOVO VÍDEO TODA SEMANA</div>
			</>
		);
	}
	return (
		<Vertical label="9:16 · Reels / Shorts" aside={<Invoke id="hype" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: bg, overflow: 'hidden'}}>
				{body}
				<HUD f={f} n={sec + 1} label={LBL[sec]} dark={dark} />
			</AbsoluteFill>
		</Vertical>
	);
};

// =====================================================================================
// TOON3D v3 — referência: game show brilhante (letras gordas com extrusão, roxo estrelado com retícula,
// barras de status). Baú com cantos arredondados, ferragens metálicas e brilho interno.
// =====================================================================================
const TIERS = [
	{name: 'TOQUE PARA ABRIR', c: '#7c5cff', bg: '#170b3d'},
	{name: 'RARO', c: '#3d8bff', bg: '#0b1a4a'},
	{name: 'ÉPICO', c: '#c04dff', bg: '#2a0b4a'},
	{name: 'LENDÁRIO', c: '#ffc23d', bg: '#3a1d0b'},
];
const rbox = (w: number, h: number, d: number, r: number) => {
	const s = new THREE.Shape();
	const W = w - 2 * r, H = h - 2 * r;
	s.moveTo(-W / 2, -H / 2); s.lineTo(W / 2, -H / 2); s.lineTo(W / 2, H / 2); s.lineTo(-W / 2, H / 2); s.lineTo(-W / 2, -H / 2);
	const g = new THREE.ExtrudeGeometry(s, {depth: d - 2 * r, bevelEnabled: true, bevelThickness: r, bevelSize: r, bevelSegments: 4, curveSegments: 4});
	g.center();
	return g;
};
const RB: React.FC<{s: [number, number, number, number]; p: [number, number, number]; children: React.ReactNode}> = ({s, p, children}) => {
	const g = useMemo(() => rbox(...s), [s[0], s[1], s[2], s[3]]);
	return <mesh geometry={g} position={p}>{children}</mesh>;
};
const Chest3: React.FC<{f: number; tier: number; open: number; hop: number; squash: number}> = ({f, tier, open, hop, squash}) => {
	const T = TIERS[tier];
	const wood = <meshStandardMaterial color="#a4572b" roughness={0.55} />;
	const woodDark = <meshStandardMaterial color="#6e3415" roughness={0.6} />;
	const metal = <meshStandardMaterial color={tier === 0 ? '#c9ccd6' : T.c} metalness={0.55} roughness={0.28} emissive={tier === 0 ? '#000' : T.c} emissiveIntensity={0.12} />;
	const gold = <meshStandardMaterial color="#ffcf4a" metalness={0.6} roughness={0.25} emissive="#5a3a00" emissiveIntensity={0.4} />;
	const lidGeo = useMemo(() => new THREE.CylinderGeometry(0.72, 0.72, 2.2, 40, 1, false, 0, Math.PI), []);
	const bandGeo = useMemo(() => new THREE.CylinderGeometry(0.76, 0.76, 0.26, 40, 1, false, 0, Math.PI), []);
	return (
		<group position={[0, -0.55 + hop, 0]} rotation={[0.28, Math.sin(f / 34) * 0.3 + 0.45, 0]} scale={[1 + squash * 0.12, 1 - squash * 0.14, 1 + squash * 0.12]}>
			<RB s={[2.2, 1.25, 1.45, 0.08]} p={[0, 0, 0]}>{wood}</RB>
			{[-0.36, 0, 0.36].map((y) => <RB key={y} s={[2.21, 0.035, 1.46, 0.012]} p={[0, y, 0]}>{woodDark}</RB>)}
			<RB s={[2.32, 0.16, 1.56, 0.05]} p={[0, -0.58, 0]}>{metal}</RB>
			<RB s={[2.32, 0.14, 1.56, 0.05]} p={[0, 0.58, 0]}>{metal}</RB>
			{[-0.78, 0.78].map((x) => <RB key={x} s={[0.26, 1.3, 1.56, 0.05]} p={[x, 0, 0]}>{metal}</RB>)}
			{[-1.1, 1.1].flatMap((x) => [-0.7, 0.7].map((z) => <mesh key={`${x}${z}`} position={[x * 0.98, 0.45, z * 1.07]}><sphereGeometry args={[0.06, 16, 16]} />{gold}</mesh>))}
			<RB s={[0.42, 0.5, 0.14, 0.05]} p={[0, 0.3, 0.78]}>{gold}</RB>
			<mesh position={[0, 0.27, 0.86]}><cylinderGeometry args={[0.06, 0.06, 0.04, 20]} /><meshStandardMaterial color="#2a1505" /></mesh>
			{/* brilho de dentro */}
			{open > 0.05 && <mesh position={[0, 0.6, 0]} rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[2.0, 1.3]} /><meshBasicMaterial color="#fff3b0" /></mesh>}
			<pointLight position={[0, 1.4, 0.3]} intensity={open * 40} color="#ffe08a" distance={8} />
			{/* tampa abaulada articulada atrás */}
			<group position={[0, 0.62, -0.72]} rotation={[-open * 1.85, 0, 0]}>
				<group position={[0, 0, 0.72]}>
					<mesh geometry={lidGeo} rotation={[0, 0, Math.PI / 2]}>{wood}</mesh>
					{[-0.78, 0.78].map((x) => <mesh key={x} geometry={bandGeo} position={[x, 0, 0]} rotation={[0, 0, Math.PI / 2]}>{metal}</mesh>)}
					<mesh geometry={bandGeo} rotation={[0, 0, Math.PI / 2]} scale={[1, 1, 1]}>{metal}</mesh>
					<mesh position={[0, 0.78, 0]}><sphereGeometry args={[0.1, 20, 20]} />{gold}</mesh>
				</group>
			</group>
		</group>
	);
};
const Fat: React.FC<{t: string; size: number; top: string; bot: string; edge?: string; f: number; f0: number}> = ({t, size, top, bot, edge = '#1f0a4a', f, f0}) => {
	const k = spring01((f - f0) / 30, 14, 0.45);
	const L = (st: React.CSSProperties) => <div style={{position: 'absolute', inset: 0, whiteSpace: 'nowrap', textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: size, lineHeight: 1, letterSpacing: '0.01em', ...st}}>{t}</div>;
	return (
		<div style={{position: 'relative', width: 1080, height: size * 1.15, transform: `rotate(-4deg) skewX(-6deg) scale(${k})`}}>
			{L({color: edge, WebkitTextStroke: `${size * 0.16}px ${edge}`, transform: `translateY(${size * 0.09}px)`})}
			{L({color: edge, WebkitTextStroke: `${size * 0.14}px ${edge}`})}
			{L({color: '#fff', WebkitTextStroke: `${size * 0.07}px #fff`})}
			{L({backgroundImage: `linear-gradient(180deg, ${top} 0%, ${top} 48%, ${bot} 52%, ${bot} 100%)`, WebkitBackgroundClip: 'text', color: 'transparent'})}
		</div>
	);
};
export const Toon3DV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const taps = [45, 90, 135];
	const tier = taps.filter((t) => f >= t).length;
	const lastTap = [...taps].reverse().find((t) => f >= t) ?? -999;
	const ht = (f - lastTap) / 30;
	const hop = ht >= 0 && ht < 0.5 ? Math.sin((ht / 0.5) * Math.PI) * 0.8 : 0;
	const squash = ht >= 0 && ht < 0.12 ? Math.sin((ht / 0.12) * Math.PI) : ht >= 0.5 && ht < 0.65 ? 0.7 * Math.sin(((ht - 0.5) / 0.15) * Math.PI) : 0;
	const open = easeInOut(seg(f, 185, 212));
	const T = TIERS[tier];
	const burst = f >= 205 ? (f - 205) / 30 : -1;
	const xp = easeInOut(seg(f, 250, 310));
	const titles: [string, string, string][] = [['TOQUE!', '#ffffff', '#c9c2ff'], ['RARO', '#bfe0ff', '#3d8bff'], ['ÉPICO', '#f3c8ff', '#b23dff'], ['LENDÁRIO', '#fff27a', '#ff9a1f']];
	const [tt, t1, t2] = titles[tier];
	return (
		<Vertical label="9:16 · conquista" aside={<Invoke id="toon3d" dur={dur} look="phone" />}>
			<AbsoluteFill style={{background: `radial-gradient(circle at 50% 46%, ${T.c}aa 0%, ${T.bg} 55%, #07031a 100%)`, overflow: 'hidden'}}>
				<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
					{Array.from({length: 22}, (_, i) => { const a = (i / 22) * Math.PI * 2 + f * 0.006; return <path key={i} d={`M540,940 L${540 + Math.cos(a) * 2200},${940 + Math.sin(a) * 2200} L${540 + Math.cos(a + 0.07) * 2200},${940 + Math.sin(a + 0.07) * 2200} Z`} fill="#fff" opacity={0.06} />; })}
					{Array.from({length: 60}, (_, i) => { const x = random(`sx${i}`) * 1080, y = random(`sy${i}`) * 1920, tw = 0.4 + 0.6 * Math.abs(Math.sin(f / 9 + i)); return <path key={i} d={`M${x},${y - 9} L${x + 2.5},${y - 2.5} L${x + 9},${y} L${x + 2.5},${y + 2.5} L${x},${y + 9} L${x - 2.5},${y + 2.5} L${x - 9},${y} L${x - 2.5},${y - 2.5} Z`} fill="#fff" opacity={tw * 0.8} />; })}
				</svg>
				<AbsoluteFill style={{backgroundImage: 'radial-gradient(rgba(255,255,255,0.18) 2px, transparent 2.4px)', backgroundSize: '18px 18px', WebkitMaskImage: 'linear-gradient(180deg, transparent 55%, #000 100%)'}} />
				{/* feixe de luz quando abre */}
				{open > 0 && <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, mixBlendMode: 'screen'}}><defs><linearGradient id="beam" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stopColor="#fff2a8" stopOpacity={0.9 * open} /><stop offset="1" stopColor="#fff2a8" stopOpacity={0} /></linearGradient></defs><path d={`M380,940 L700,940 L${900 + Math.sin(f / 10) * 20},0 L${180 + Math.sin(f / 10) * 20},0 Z`} fill="url(#beam)" /></svg>}
				<ThreeCanvas width={1080} height={1920} camera={{fov: 28, position: [0, 0.7, 9.5]}}>
					<ambientLight intensity={0.55} />
					<hemisphereLight args={['#ffffff', T.c, 0.9]} />
					<directionalLight position={[3, 6, 6]} intensity={2.6} />
					<directionalLight position={[-5, 2, -2]} intensity={2.2} color={T.c} />
					<Chest3 f={f} tier={tier} open={open} hop={hop} squash={squash} />
				</ThreeCanvas>
				{/* toque */}
				{taps.map((t) => f >= t && f < t + 16 ? <svg key={t} width={1080} height={1920} style={{position: 'absolute', inset: 0}}><circle cx={540} cy={1000} r={60 + (f - t) * 22} fill="none" stroke="#fff" strokeWidth={10 * (1 - (f - t) / 16)} /></svg> : null)}
				{burst >= 0 && burst < 1.6 && (
					<svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
						{Array.from({length: 46}, (_, i) => {
							const a = -Math.PI / 2 + (random(`ba${i}`) - 0.5) * 2.6, v = 700 + random(`bv${i}`) * 900;
							const x = 540 + Math.cos(a) * v * burst, y = 880 + Math.sin(a) * v * burst + 1100 * burst * burst;
							const s = 22 + random(`br${i}`) * 18, sp = Math.abs(Math.cos(f / 3 + i));
							return i % 2 ? <ellipse key={i} cx={x} cy={y} rx={s * sp} ry={s} fill="#ffcf3a" stroke="#7a4a00" strokeWidth={4} /> : <path key={i} d={`M${x},${y - s} L${x + s * 0.3},${y - s * 0.3} L${x + s},${y} L${x + s * 0.3},${y + s * 0.3} L${x},${y + s} L${x - s * 0.3},${y + s * 0.3} L${x - s},${y} L${x - s * 0.3},${y - s * 0.3} Z`} fill="#fff" />;
						})}
					</svg>
				)}
				<div style={{position: 'absolute', top: 250}}><Fat key={tier} t={tt} size={tier === 3 ? 170 : 200} top={t1} bot={t2} f={f} f0={tier === 0 ? 4 : taps[tier - 1]} /></div>
				{tier === 0 && <div style={{position: 'absolute', top: 500, width: 1080, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 44, color: '#fff', opacity: 0.85, letterSpacing: '0.1em'}}>3 TOQUES PARA ABRIR</div>}
				{f >= 214 && (
					<div style={{position: 'absolute', top: 1430, width: 1080, display: 'flex', flexDirection: 'column', alignItems: 'center'}}>
						<div style={{transform: `scale(${spring01((f - 214) / 30, 14, 0.5)}) rotate(-3deg)`, background: 'linear-gradient(180deg, #ff6aa0, #c2185b)', border: '8px solid #2a0b3a', borderRadius: 22, padding: '14px 40px', boxShadow: '0 10px 0 #2a0b3a', fontFamily: F.display, fontWeight: 800, fontSize: 62, color: '#fff', whiteSpace: 'nowrap', WebkitTextStroke: '3px #2a0b3a', paintOrder: 'stroke fill'}}>CONQUISTA DESBLOQUEADA</div>
						<div style={{marginTop: 34, width: 820, opacity: clamp((f - 240) / 8)}}>
							<div style={{display: 'flex', justifyContent: 'space-between', fontFamily: F.display, fontWeight: 800, fontSize: 40, color: '#fff', marginBottom: 12, WebkitTextStroke: '2px #1f0a4a', paintOrder: 'stroke fill'}}><span>ESTILOS</span><span style={{color: '#ffd23f'}}>{Math.round(xp * 27)} / 27</span></div>
							<div style={{display: 'flex', gap: 5, padding: 8, background: '#1f0a4a', borderRadius: 16}}>{Array.from({length: 27}, (_, i) => <div key={i} style={{flex: 1, height: 36, borderRadius: 6, background: xp * 27 > i + 0.5 ? 'linear-gradient(180deg, #fff27a, #ff9a1f)' : '#3b2a6e'}} />)}</div>
							<div style={{textAlign: 'center', fontFamily: F.display, fontWeight: 700, fontSize: 42, color: '#fff', marginTop: 26, opacity: clamp((f - 300) / 8)}}>1º vídeo com todos os estilos</div>
						</div>
					</div>
				)}
			</AbsoluteFill>
		</Vertical>
	);
};

// =====================================================================================
// FLAT v3 — guia do flat-science-explainer (paleta Ártico): zoom de escala contínuo de um pixel até a "fábrica":
// relógio-planeta (t) → máquina f(t) → esteira de frames. Cel shading, brilho, 3 camadas de partículas, granulação.
// =====================================================================================
const AR = {bg1: '#0E2A3A', bg2: '#071722', mid: '#1F6F8B', midS: '#14506a', midL: '#3a9cc0', acc: '#FF6B3D', accS: '#c9472a', acc2: '#9BF0FF', light: '#F0FBFF', ch: '#FFD86B', chS: '#d9a93a'};
const gearPath = (r: number, n: number) => {
	const pts: string[] = [];
	for (let i = 0; i < n * 2; i++) {
		const a0 = (i / (n * 2)) * Math.PI * 2, a1 = ((i + 1) / (n * 2)) * Math.PI * 2, R = i % 2 ? r * 0.8 : r;
		pts.push(`${i ? 'L' : 'M'}${Math.cos(a0) * R},${Math.sin(a0) * R} L${Math.cos(a1) * R},${Math.sin(a1) * R}`);
	}
	return pts.join(' ') + ' Z';
};
const Mini: React.FC<{n: number; w: number; h: number; pix: number}> = ({n, w, h, pix}) => {
	const bx = 20 + ((n * 17) % (w - 40)), by = h * 0.62 - Math.abs(Math.sin(n * 0.5)) * h * 0.35;
	return (
		<g>
			<rect width={w} height={h} rx={10} fill="#123d52" />
			<path d={`M0,${h * 0.72} C${w * 0.3},${h * 0.6} ${w * 0.6},${h * 0.82} ${w},${h * 0.68} L${w},${h} L0,${h} Z`} fill={AR.mid} />
			<circle cx={w * 0.8} cy={h * 0.25} r={h * 0.12} fill={AR.ch} />
			<circle cx={bx} cy={by} r={h * 0.1} fill={AR.acc} />
			{pix > 0 && Array.from({length: 16 * 11}, (_, i) => { const x = (i % 16) * (w / 16), y = Math.floor(i / 16) * (h / 11); return <rect key={i} x={x} y={y} width={w / 16} height={h / 11} fill="none" stroke="#071722" strokeWidth={0.12} opacity={pix} />; })}
			<rect width={w} height={h} rx={10} fill="none" stroke={AR.light} strokeWidth={3} />
		</g>
	);
};
const Pill: React.FC<{x: number; y: number; f: number; look: number; s?: number; flip?: boolean}> = ({x, y, f, look, s = 1, flip}) => {
	const br = 1 + 0.03 * Math.sin(f / 14 + x);
	const blink = (f + Math.floor(x)) % 110 < 4 ? 0.15 : 1;
	return (
		<g transform={`translate(${x} ${y}) scale(${s * (flip ? -1 : 1)} ${s * br})`}>
			<ellipse cx={0} cy={4} rx={40} ry={8} fill="#000" opacity={0.25} />
			<rect x={-34} y={-110} width={68} height={112} rx={34} fill={AR.ch} />
			<clipPath id={`pc${x}`}><rect x={-34} y={-110} width={68} height={112} rx={34} /></clipPath>
			<rect x={4} y={-104} width={68} height={112} rx={34} fill={AR.chS} clipPath={`url(#pc${x})`} />
			<rect x={-26} y={-98} width={8} height={30} rx={4} fill="#fff7d6" opacity={0.7} />
			{[-11, 11].map((ex) => <g key={ex}><ellipse cx={ex + look * 3} cy={-72} rx={10} ry={12 * blink} fill="#fff" /><circle cx={ex + look * 6} cy={-71} r={5 * blink} fill="#0b1b2a" /></g>)}
		</g>
	);
};
export const FlatV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const k = easeInOut(seg(f, 18, 150));
	const z = Math.pow(16, 1 - k);
	const SPEED = 2.4, CW = 160, CH = 110, GAP = 210;
	const cardX = (n: number) => 1110 + ((f * SPEED + n * GAP) % (GAP * 5)) - 20;
	const hero = 2, hx = cardX(hero) + CW / 2, hy = 640 + CH / 2;
	const kc = (16 / z - 1) / 15;
	const cx = lerp(hx, 960, kc), cy = lerp(hy, 500, kc);
	const t = f / 30;
	const lab = (x: number, y: number, ty: number, txt: string, f0: number, anchor: 'start' | 'middle' = 'middle') => {
		const tx = anchor === 'start' ? x - 8 : x;
		const a = clamp((f - f0) / 10);
		return a <= 0 ? null : (
			<g opacity={a}>
				<line x1={x} y1={y} x2={x} y2={lerp(y, ty, a)} stroke={AR.light} strokeWidth={2} />
				<circle cx={x} cy={y} r={5} fill={AR.light} />
				<text x={tx} y={ty - 14} textAnchor={anchor} fontFamily={F.display} fontWeight={800} fontSize={30} letterSpacing="0.08em" fill={AR.light}>{txt}</text>
			</g>
		);
	};
	return (
		<AbsoluteFill style={{background: `linear-gradient(180deg, ${AR.bg1}, ${AR.bg2})`, overflow: 'hidden'}}>
			{/* partículas em 3 camadas (parallax com o zoom) */}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				{[0.15, 0.5, 1].map((L, li) => Array.from({length: 40}, (_, i) => {
					const x0 = random(`fx${li}${i}`) * 1920, y0 = random(`fy${li}${i}`) * 1080;
					const zz = Math.pow(z, L * 0.35);
					const x = 960 + (x0 - 960) * zz + Math.sin(f / 50 + i) * 6 * L, y = 540 + (y0 - 540) * zz - f * 0.2 * L;
					return <circle key={`${li}-${i}`} cx={x} cy={((y % 1080) + 1080) % 1080} r={(1 + li) * 1.3} fill={AR.acc2} opacity={(0.25 + 0.3 * li) * (0.6 + 0.4 * Math.sin(f / 8 + i))} />;
				}))}
			</svg>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cx * z}px, ${540 - cy * z}px) scale(${z})`}}>
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<defs>
						<radialGradient id="glw"><stop offset="0" stopColor={AR.acc} stopOpacity={0.55} /><stop offset="1" stopColor={AR.acc} stopOpacity={0} /></radialGradient>
						<radialGradient id="glw2"><stop offset="0" stopColor={AR.acc2} stopOpacity={0.5} /><stop offset="1" stopColor={AR.acc2} stopOpacity={0} /></radialGradient>
						<clipPath id="planet"><circle cx={330} cy={560} r={160} /></clipPath>
						<clipPath id="mach"><rect x={680} y={360} width={400} height={400} rx={60} /></clipPath>
					</defs>
					{/* chão */}
					<ellipse cx={1000} cy={860} rx={1100} ry={70} fill="#0a2230" />
					<ellipse cx={1000} cy={846} rx={1080} ry={56} fill="#113246" />
					{/* relógio-planeta: o tempo t */}
					<circle cx={330} cy={560} r={380} fill="url(#glw)" />
					<circle cx={330} cy={560} r={160} fill={AR.acc} />
					<circle cx={380} cy={610} r={160} fill={AR.accS} clipPath="url(#planet)" />
					<path d="M215,470 A150,150 0 0 1 300,410" stroke="#ffb59a" strokeWidth={10} fill="none" strokeLinecap="round" />
					{Array.from({length: 12}, (_, i) => { const a = (i / 12) * Math.PI * 2; return <circle key={i} cx={330 + Math.cos(a) * 125} cy={560 + Math.sin(a) * 125} r={i % 3 ? 5 : 9} fill="#ffe4d6" />; })}
					<line x1={330} y1={560} x2={330 + Math.cos(t * 1.4 - Math.PI / 2) * 100} y2={560 + Math.sin(t * 1.4 - Math.PI / 2) * 100} stroke="#fff" strokeWidth={10} strokeLinecap="round" />
					<circle cx={330} cy={560} r={14} fill="#fff" />
					<ellipse cx={330} cy={560} rx={240} ry={44} fill="none" stroke={AR.acc2} strokeWidth={6} opacity={0.7} transform="rotate(-14 330 560)" />
					{/* cano com pulsos de t */}
					<rect x={480} y={538} width={210} height={44} rx={22} fill={AR.midS} />
					<rect x={480} y={538} width={210} height={14} rx={7} fill={AR.midL} opacity={0.6} />
					{[0, 1, 2].map((i) => <circle key={i} cx={490 + ((f * 4 + i * 70) % 200)} cy={560} r={10} fill={AR.acc2} />)}
					{/* máquina f(t) */}
					<circle cx={880} cy={560} r={330} fill="url(#glw2)" opacity={0.5} />
					<rect x={680} y={360} width={400} height={400} rx={60} fill={AR.mid} />
					<rect x={740} y={420} width={400} height={400} rx={60} fill={AR.midS} clipPath="url(#mach)" />
					<rect x={700} y={376} width={18} height={150} rx={9} fill={AR.midL} opacity={0.7} />
					<rect x={960} y={290} width={60} height={80} rx={10} fill={AR.midS} />
					{[0, 1, 2, 3].map((i) => { const p = ((f + i * 22) % 88) / 88; return <circle key={i} cx={990 + Math.sin(p * 6 + i) * 14} cy={280 - p * 200} r={16 + p * 30} fill={AR.light} opacity={0.35 * (1 - p)} />; })}
					<circle cx={860} cy={520} r={92} fill="#0b2a3a" stroke={AR.acc2} strokeWidth={8} />
					<circle cx={860} cy={520} r={92} fill="url(#glw2)" />
					<text x={860} y={540} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={60} fill={AR.light}>f(t)</text>
					<g transform={`translate(760 690) rotate(${f * 3})`}><path d={gearPath(64, 10)} fill={AR.ch} /><circle r={22} fill={AR.chS} /></g>
					<g transform={`translate(860 700) rotate(${-f * 3 * (64 / 46) + 9})`}><path d={gearPath(46, 8)} fill={AR.ch} /><circle r={14} fill={AR.chS} /></g>
					<rect x={1000} y={600} width={90} height={120} rx={16} fill="#0b2a3a" />
					{/* alavanca puxada pelo mascote */}
					<g transform={`rotate(${Math.sin(f / 12) * 18} 760 360)`}><line x1={760} y1={360} x2={760} y2={290} stroke={AR.light} strokeWidth={10} strokeLinecap="round" /><circle cx={760} cy={284} r={14} fill={AR.acc} /></g>
					<Pill x={700} y={360} f={f} look={0.6} s={0.9} />
					{/* esteira */}
					<rect x={1070} y={752} width={900} height={30} rx={15} fill="#0a2a3a" />
					{Array.from({length: 9}, (_, i) => <g key={i} transform={`translate(${1100 + i * 100} 767) rotate(${f * 6})`}><circle r={13} fill={AR.midL} /><line x1={-13} y1={0} x2={13} y2={0} stroke="#0a2a3a" strokeWidth={3} /></g>)}
					{Array.from({length: 5}, (_, n) => {
						const x = cardX(n);
						return <g key={n} transform={`translate(${x} 640)`} opacity={clamp((x - 1080) / 40) * clamp((1990 - x) / 60)}><Mini n={96 + n + Math.floor((f * SPEED + n * GAP) / (GAP * 5)) * 5} w={CW} h={CH} pix={n === hero ? clamp((z - 3) / 6) : 0} /></g>;
					})}
					<Pill x={1560} y={850} f={f} look={Math.sin(f / 30)} s={1.1} />
					<Pill x={1660} y={856} f={f} look={-0.8} s={0.8} flip />
					{lab(330, 380, 290, 'TEMPO  t', 160)}
					<line x1={1080} y1={470} x2={1150} y2={470} stroke={AR.light} strokeWidth={2} opacity={clamp((f - 175) / 10)} />
					{lab(1150, 470, 400, 'O CÓDIGO  f(t)', 175, 'start')}
					{lab(1450, 630, 560, '30 FRAMES POR SEGUNDO', 190)}
				</svg>
			</div>
			{/* rótulo de escala no começo do zoom */}
			<div style={{position: 'absolute', top: 120, width: 1920, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 40, letterSpacing: '0.1em', color: AR.light, opacity: clamp((f - 4) / 8) * (1 - clamp((f - 60) / 14))}}>1 PIXEL = COR(x, y, t)</div>
			<div style={{position: 'absolute', top: 90, width: 1920, textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 64, color: AR.light, opacity: softIn(f, 215, 12).opacity, transform: `translateY(${softIn(f, 215, 12).y}px)`}}>
				Cada frame é uma <span style={{color: AR.acc}}>função</span> do tempo
			</div>
			<div style={{position: 'absolute', top: 180, width: 1920, textAlign: 'center', fontFamily: F.mono, fontSize: 28, color: AR.acc2, opacity: softIn(f, 235, 12).opacity}}>frame {Math.floor(f)} = f({(f / 30).toFixed(2).replace('.', ',')} s)</div>
			{/* granulação + vinheta */}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'overlay', opacity: 0.08}}><filter id="gr"><feTurbulence type="fractalNoise" baseFrequency={0.9} seed={f % 8} /></filter><rect width={1920} height={1080} filter="url(#gr)" /></svg>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 55%, rgba(0,0,0,0.35))'}} />
			<Invoke id="flat" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};

// =====================================================================================
// DATA STORY v3 — referência: caderno editorial (papel, cruzetas nos cantos, manchete em itálico, colunas hachuradas,
// carimbo, anotação à mão). Dados reais do vídeo "Onze formatos".
// =====================================================================================
const DUR11: [string, number][] = [['LED', 8], ['Flat', 7.5], ['Colagem', 8.5], ['Linha do tempo', 8], ['Jornada', 8], ['Demo', 8], ['Data story', 8], ['Paper', 8], ['Entrevista', 43], ['3D', 8], ['Anúncio', 8], ['Fechamento', 12]];
export const DataV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const X0 = 880, CW = 78, BW = 48, BASE = 840, HMAX = 500;
	const hy = (v: number) => BASE - (v / 43) * HMAX;
	const n31 = Math.round(31 * easeInOut(seg(f, 30, 90)));
	const st = spring01((f - 150) / 30, 20, 0.5);
	const PAPER = '#efece4', INKD = '#283754';
	return (
		<AbsoluteFill style={{background: PAPER}}>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.35}}><filter id="pp"><feTurbulence type="fractalNoise" baseFrequency={0.65} numOctaves={3} seed={4} /><feColorMatrix values="0 0 0 0 0.6  0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0.5 0" /></filter><rect width={1920} height={1080} filter="url(#pp)" /></svg>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<defs>
					<pattern id="hz" width={10} height={10} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={10} stroke={INKD} strokeWidth={2.2} /></pattern>
					<pattern id="ho" width={9} height={9} patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1={0} y1={0} x2={0} y2={9} stroke={C.orange} strokeWidth={3.4} /></pattern>
				</defs>
				{[[40, 40], [1880, 40], [40, 1040], [1880, 1040], [960, 40], [960, 1040]].map(([x, y], i) => <path key={i} d={`M${x - 12},${y} H${x + 12} M${x},${y - 12} V${y + 12}`} stroke="#b9b2a2" strokeWidth={1.5} />)}
				{/* eixo, grade e referência de 8 s */}
				<line x1={X0 - 20} y1={BASE} x2={X0 + 12 * CW} y2={BASE} stroke={INKD} strokeWidth={2} />
				{[10, 20, 30, 40].map((v) => <g key={v} opacity={clamp((f - 20) / 10)}><line x1={X0 + 12 * CW} y1={hy(v)} x2={X0 + 12 * CW + 10} y2={hy(v)} stroke={INKD} strokeWidth={1.5} /><text x={X0 + 12 * CW + 18} y={hy(v) + 7} fontFamily={F.mono} fontSize={20} fill="#6b6658">{v} s</text></g>)}
				<line x1={X0 - 20} y1={hy(8)} x2={X0 + 12 * CW} y2={hy(8)} stroke="#2a4fbf" strokeWidth={2} strokeDasharray="8 7" opacity={clamp((f - 100) / 10)} />
				{DUR11.map(([n, v], i) => {
					const g = spring01((f - 24 - i * 4) / 30, 12, 0.9);
					const x = X0 + i * CW + (CW - BW) / 2, top = BASE - (v / 43) * HMAX * g;
					const hi = n === 'Entrevista';
					return (
						<g key={n}>
							<rect x={x} y={top} width={BW} height={BASE - top} fill={hi ? 'url(#ho)' : 'url(#hz)'} />
							<rect x={x} y={top} width={BW} height={BASE - top} fill="none" stroke={hi ? C.orange : INKD} strokeWidth={hi ? 3.5 : 2} />
							<text x={x + BW / 2} y={top - 12} textAnchor="middle" fontFamily={F.mono} fontSize={22} fontWeight={hi ? 700 : 400} fill={hi ? C.orange : '#4b4a44'} opacity={clamp((f - 50 - i * 4) / 8)}>{String(v).replace('.', ',')}</text>
							<text transform={`translate(${x + BW / 2 + 8} ${BASE + 22}) rotate(-38)`} textAnchor="end" fontFamily={F.display} fontWeight={hi ? 800 : 600} fontSize={24} fill={hi ? '#111' : '#4b4a44'}>{n}</text>
						</g>
					);
				})}
			</svg>
			{/* anotação à mão na referência */}
			<div style={{position: 'absolute', left: X0 + 10, top: hy(8) - 140, fontFamily: F2.hand, fontSize: 40, color: '#2a4fbf', opacity: clamp((f - 108) / 10), transform: 'rotate(-2deg)'}}>dez formatos ≈ 8 s cada</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: clamp((f - 112) / 10)}}><path d={`M${X0 + 60},${hy(8) - 80} q-10,30 6,${74}`} stroke="#2a4fbf" strokeWidth={2.5} fill="none" /></svg>
			{/* carimbo */}
			<div style={{position: 'absolute', left: X0 + 8 * CW - 330, top: hy(43) - 30, transform: `rotate(-9deg) scale(${f < 150 ? 0 : 1.6 - 0.6 * st})`, opacity: f < 150 ? 0 : 0.88, border: '5px double #2a3f9e', padding: '10px 18px', fontFamily: F.mono, fontWeight: 700, fontSize: 30, color: '#2a3f9e', letterSpacing: '0.08em', textAlign: 'center', lineHeight: 1.15}}>41 s DE<br />CLIPE REAL</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, opacity: clamp((f - 162) / 8)}}><path d={`M${X0 + 8 * CW - 120},${hy(43) + 70} Q${X0 + 8 * CW - 40},${hy(43) + 110} ${X0 + 8 * CW + 8},${hy(43) + 70}`} stroke="#2a3f9e" strokeWidth={3} fill="none" /><path d={`M${X0 + 8 * CW - 6},${hy(43) + 66} l14,4 l-8,12`} stroke="#2a3f9e" strokeWidth={3} fill="none" /></svg>
			{/* coluna de texto */}
			<div style={{position: 'absolute', left: 96, top: 76, fontFamily: F.mono, fontSize: 20, color: '#6b6658', letterSpacing: '0.12em', opacity: clamp(f / 8)}}>Nº 03 — DATA STORY · “ONZE FORMATOS” · 08/11/2026</div>
			<div style={{position: 'absolute', left: 96, top: 112, width: 1730, height: 1.5, background: '#c9c1ae'}} />
			<div style={{position: 'absolute', left: 96, top: 150, width: 740, fontFamily: 'Georgia, serif', fontStyle: 'italic', fontSize: 60, lineHeight: '72px', color: '#1b1b1f', opacity: softIn(f, 6, 12).opacity, transform: `translateY(${softIn(f, 6, 12).y}px)`}}>Dez formatos levaram 8 s. A entrevista, 43.</div>
			<div style={{position: 'absolute', left: 90, top: 300, fontFamily: F2.hand, fontWeight: 700, fontSize: 190, lineHeight: 1, color: C.orange, opacity: clamp((f - 28) / 6)}}>{n31}%</div>
			<div style={{position: 'absolute', left: 100, top: 498, width: 600, fontFamily: F.display, fontSize: 30, lineHeight: '40px', color: '#3b3a35', opacity: softIn(f, 70, 12).opacity}}>dos 137 s do vídeo foram fala real — a única parte que não era animação.</div>
			<div style={{position: 'absolute', left: 96, bottom: 44, fontFamily: F.mono, fontSize: 18, color: '#7a7466'}}>Fonte: src/timeline.ts do vídeo “Onze formatos” (08/11/2026). Base zero; durações em segundos.</div>
			<Invoke id="datastory" dur={dur} look="paper" pos="left" />
		</AbsoluteFill>
	);
};

// =====================================================================================
// STROKE v3 — desenho técnico: câmera que percorre os nós enquanto o traço desenha, ícones em linha, cotas e laço.
// =====================================================================================
const ICONS = [
	'M-40,-58 H18 L44,-32 V58 H-40 Z M18,-58 V-32 H44 M-24,-12 H28 M-24,8 H28 M-24,28 H8',
	'M-62,-22 H62 V22 H-62 Z M-31,-22 V22 M0,-22 V22 M31,-22 V22 M-46,-44 V-30 M15,-44 V-30 M46,-44 V-30 M-62,44 H62',
	'M-62,0 C-52,-42 -40,-42 -31,0 S-10,42 0,0 S21,-42 31,0 S52,42 62,0 M-62,48 V58 M-31,48 V58 M0,48 V58 M31,48 V58 M62,48 V58',
	'M-62,-42 H62 V42 H-62 Z M-62,-28 H62 M-62,28 H62 M-14,-14 L18,0 L-14,14 Z M-46,-42 V-28 M-22,-42 V-28 M2,-42 V-28 M26,-42 V-28 M50,-42 V-28 M-46,28 V42 M-22,28 V42 M2,28 V42 M26,28 V42 M50,28 V42',
	'M-50,-16 A32,32 0 1,0 14,-16 A32,32 0 1,0 -50,-16 M5,7 L46,48 M-36,-16 L-24,-4 L-4,-30',
];
const SL: React.FC<{d: string; k: number; c?: string; w?: number}> = ({d, k, c = '#f3f4f7', w = 3}) => k <= 0 ? null : <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - k} stroke={c} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
export const StrokeV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const steps = ['Roteiro', 'Plano por trecho', 'Contratos', 'Render', 'QA'];
	const notes = ['aprovação', 'afinidade · orçamento', 'beat · bastão · áudio', 'skills e fichas', 'LUFS · frames · sync'];
	const X = (i: number) => 260 + i * 350, Y = 470, R = 112;
	const T = (i: number) => 14 + i * 38;
	const p = clamp((f - 14) / 180) * 4;
	const i0 = Math.min(3, Math.floor(p)), u = easeInOut(p - i0);
	const out = easeInOut(seg(f, 196, 236));
	const z = lerp(1.75, 1, out);
	const camX = lerp(lerp(X(i0), X(i0 + 1), u), 960, out), camY = lerp(Y, 520, out);
	const OR = C.orange;
	const loopD = `M${X(4)},${Y - R - 10} C${X(4)},${Y - R - 150} ${X(3)},${Y - R - 150} ${X(3)},${Y - R - 12}`;
	const lp = ((f - 300) % 50) / 50;
	return (
		<AbsoluteFill style={{background: '#05070a'}}>
			<AbsoluteFill style={{backgroundImage: 'linear-gradient(#10161f 1px, transparent 1px), linear-gradient(90deg, #10161f 1px, transparent 1px)', backgroundSize: `${48 * z}px ${48 * z}px`, backgroundPosition: `${960 - camX * z}px ${540 - camY * z}px`}} />
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - camX * z}px, ${540 - camY * z}px) scale(${z})`}}>
				<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					{steps.map((s, i) => {
						const kc = easeInOut(seg(f, T(i), T(i) + 22)), ki = easeInOut(seg(f, T(i) + 12, T(i) + 40));
						const act = f >= T(i) && f < T(i + 1) + 10 && out < 0.5;
						const col = i === 1 || act ? OR : '#f3f4f7';
						return (
							<g key={s}>
								<SL d={`M${X(i)},${Y - R} A${R},${R} 0 1,1 ${X(i) - 0.1},${Y - R}`} k={kc} c={col} w={3} />
								<SL d={`M${X(i)},${Y - R + 14} A${R - 14},${R - 14} 0 1,1 ${X(i) - 0.1},${Y - R + 14}`} k={kc} c="#2b3442" w={1.2} />
								<g transform={`translate(${X(i)} ${Y})`}><SL d={ICONS[i]} k={ki} c={col} w={3.2} /></g>
								<text x={X(i) - R} y={Y - R - 14} fontFamily={F.mono} fontSize={18} fill="#6b7380" opacity={kc}>{String(i + 1).padStart(2, '0')}</text>
								{i < 4 && <SL d={`M${X(i) + R + 12},${Y} L${X(i + 1) - R - 14},${Y} M${X(i + 1) - R - 28},${Y - 10} L${X(i + 1) - R - 14},${Y} L${X(i + 1) - R - 28},${Y + 10}`} k={easeInOut(seg(f, T(i) + 28, T(i) + 44))} c="#8c96a3" w={2.2} />}
							</g>
						);
					})}
					{/* pena: ponto que lidera o traço */}
					{out < 1 && f >= 14 && <circle cx={lerp(X(i0), X(i0 + 1), u)} cy={Y - R} r={7} fill={OR} opacity={1 - out} />}
					{/* cota de ponta a ponta */}
					<SL d={`M${X(0)},${Y + R + 150} L${X(4)},${Y + R + 150} M${X(0)},${Y + R + 136} V${Y + R + 164} M${X(4)},${Y + R + 136} V${Y + R + 164}`} k={easeInOut(seg(f, 250, 280))} c="#5d6673" w={1.5} />
					{/* laço de revisão */}
					<SL d={loopD} k={easeInOut(seg(f, 262, 292))} c={OR} w={3} />
					<SL d={`M${X(3) - 10},${Y - R - 26} L${X(3)},${Y - R - 12} L${X(3) + 10},${Y - R - 26}`} k={easeInOut(seg(f, 290, 298))} c={OR} w={3} />
					{f >= 300 && (() => { const a = lp, x0 = X(4), x1 = X(3), y0 = Y - R - 10; const bx = (1 - a) ** 3 * x0 + 3 * (1 - a) ** 2 * a * x0 + 3 * (1 - a) * a * a * x1 + a ** 3 * x1; const by = (1 - a) ** 3 * y0 + 3 * (1 - a) ** 2 * a * (Y - R - 150) + 3 * (1 - a) * a * a * (Y - R - 150) + a ** 3 * (Y - R - 12); return <circle cx={bx} cy={by} r={6} fill={OR} />; })()}
				</svg>
				{steps.map((s, i) => {
					const a = softIn(f, T(i) + 26, 10), b = softIn(f, 244 + i * 6, 10);
					return (
						<React.Fragment key={s}>
							<div style={{position: 'absolute', left: X(i) - 170, width: 340, top: Y + R + 20, textAlign: 'center', fontFamily: F.display, fontWeight: 700, fontSize: 34, color: i === 1 ? OR : '#f3f4f7', opacity: a.opacity}}>{s}</div>
							<div style={{position: 'absolute', left: X(i) - 170, width: 340, top: Y + R + 68, textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: '#8c96a3', opacity: b.opacity}}>{notes[i]}</div>
						</React.Fragment>
					);
				})}
				<div style={{position: 'absolute', left: X(0), width: X(4) - X(0), top: Y + R + 160, textAlign: 'center', fontFamily: F.mono, fontSize: 20, color: '#8c96a3', opacity: softIn(f, 272).opacity}}><span style={{background: '#05070a', padding: '0 14px'}}>1 pedido → 1 vídeo verificado</span></div>
				<div style={{position: 'absolute', left: X(3) - 100, width: X(4) - X(3) + 200, top: Y - R - 190, textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: OR, opacity: softIn(f, 288).opacity}}>refaz só o que falhou</div>
			</div>
			<div style={{position: 'absolute', left: 96, top: 90, fontFamily: F.itau, fontWeight: 300, fontSize: 70, color: '#f3f4f7', opacity: softIn(f, 228, 12).opacity, transform: `translateY(${softIn(f, 228, 12).y}px)`}}>Como o master trabalha</div>
			<Invoke id="stroke" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};

// =====================================================================================
// INK v3 — pincel de nanquim com pressão, câmera seguindo a ponta, ícones esboçados, carimbo AGORA e título à mão.
// =====================================================================================
const LINE = Array.from({length: 290}, (_, i) => { const x = 60 + i * 10; return [x, 560 + Math.sin(x / 260) * 14 + Math.sin(x / 97) * 5, 0.35 + 0.65 * Math.sin(x / 170) ** 2] as [number, number, number]; });
const MX = [300, 760, 1220, 1680, 2140, 2600];
const INKDATA = [['18:34', 'skills instalados'], ['18:50', 'projeto do Hub'], ['19:02', 'primeiro vídeo, 32 s'], ['19:40', 'onze formatos'], ['20:12', 'o master'], ['20:33', 'este vídeo']];
export const InkV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const sk = seg(f, 12, 330);
	const tip = lerp(60, 2950, 0.8 * sk + 0.2 * easeInOut(sk));
	const pull = easeInOut(seg(f, 334, 372));
	const z = lerp(1, 1920 / 3000, pull);
	const camX = lerp(clamp((tip - 1100) / 1, 0, 3000 - 1920) + 960, 1500, pull);
	const camY = lerp(540, 560, pull);
	const pts = LINE.filter(([x]) => x <= tip);
	const ink = pts.length > 1 ? toPath(getStroke(pts, {size: 20, thinning: 0.75, smoothing: 0.6, streamline: 0.4, simulatePressure: false, last: true})) : '';
	const R = useMemo(() => ({
		ic: [
			[...rRect(-45, -38, 90, 70, {seed: 1}), ...rLine(-45, -18, 45, -18, {seed: 2})],
			rPath('M-48,-30 L-14,-30 L-4,-18 L48,-18 L48,34 L-48,34 Z', {seed: 3}),
			[...rRect(-50, -30, 100, 62, {seed: 4}), ...rCircle(-22, -46, 34, {seed: 5}), ...rCircle(18, -46, 34, {seed: 6})],
			[...rRect(-48, -34, 96, 68, {seed: 7}), ...rLine(-16, -34, -16, 34, {seed: 8}), ...rLine(16, -34, 16, 34, {seed: 9}), ...rLine(-48, 0, 48, 0, {seed: 10})],
			rPath('M0,-44 L12,-12 L46,-12 L18,8 L28,42 L0,22 L-28,42 L-18,8 L-46,-12 L-12,-12 Z', {seed: 11}),
			rPath('M-26,-36 L36,0 L-26,36 Z', {seed: 12, fill: C.orange, fillStyle: 'hachure', hachureGap: 6}),
		],
	}), []);
	const hw = textWidth('08/11/2026: um dia, uma biblioteca', 'felix', 66);
	return (
		<AbsoluteFill style={{background: '#f2ecdf', overflow: 'hidden'}}>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0, mixBlendMode: 'multiply', opacity: 0.45}}><filter id="fib"><feTurbulence type="fractalNoise" baseFrequency="0.012 0.5" numOctaves={2} seed={9} /><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.5  0 0 0 0 0.42  0 0 0 0.35 0" /></filter><rect width={1920} height={1080} filter="url(#fib)" /></svg>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - camX * z}px, ${540 - camY * z}px) scale(${z})`}}>
				<svg width={3000} height={1080} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
					<path d={ink} fill="#15130f" />
					{MX.map((x, i) => {
						const k = clamp((tip - x) / 140);
						if (k <= 0) return null;
						const y = 560 + Math.sin(x / 260) * 14 + Math.sin(x / 97) * 5;
						const [tm, note] = INKDATA[i];
						const tw = textWidth(tm, 'felix', 70), nw = textWidth(note, 'read', 46);
						const last = i === MX.length - 1;
						return (
							<g key={x}>
								<circle cx={x} cy={y} r={16 * spring01(k * 0.9, 16, 0.6)} fill="#15130f" />
								{[0, 1, 2].map((j) => <circle key={j} cx={x + (random(`sp${i}${j}`) - 0.5) * 70} cy={y + (random(`sq${i}${j}`) - 0.5) * 50} r={2 + random(`sr${i}${j}`) * 4} fill="#15130f" opacity={k} />)}
								<g transform={`translate(${x} 320)`}><Rough paths={R.ic[i]} k={clamp((tip - x - 20) / 220)} /></g>
								<Written text={tm} font="felix" x={x - tw / 2} y={470} size={70} k={clamp((tip - x - 40) / 200)} color={last ? '#c0261c' : '#15130f'} />
								<Written text={note} font="read" x={x - nw / 2} y={650} size={46} k={clamp((tip - x - 80) / 220)} color="#4b443a" />
							</g>
						);
					})}
					{/* carimbo AGORA */}
					{(() => { const k = clamp((tip - 2700) / 40); if (k <= 0) return null; const s = 1.7 - 0.7 * spring01(k, 20, 0.5); return (
						<g transform={`translate(2780 560) rotate(-12) scale(${s})`} opacity={0.9}>
							<circle r={74} fill="none" stroke="#c0261c" strokeWidth={6} />
							<circle r={62} fill="none" stroke="#c0261c" strokeWidth={2} />
							<text y={14} textAnchor="middle" fontFamily={F.display} fontWeight={800} fontSize={38} fill="#c0261c" letterSpacing="0.06em">AGORA</text>
						</g>
					); })()}
				</svg>
			</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<Written text="08/11/2026: um dia, uma biblioteca" font="felix" x={960 - hw / 2} y={930} size={66} k={seg(f, 372, 440)} color="#15130f" />
			</svg>
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 50%, transparent 60%, rgba(90,70,40,0.18))'}} />
			<Invoke id="ink" dur={dur} look="paper" pos="top" />
		</AbsoluteFill>
	);
};

// =====================================================================================
// SHADOW v3 — teatro de sombras: silhueta Open Peeps (nada de boneco de palitinho), cenário de papel recortado em
// camadas com parallax, moldura de teatro (cortinas e bambinela), lanterna que acende os estilos pendurados.
// =====================================================================================
const SH = '#1a0a04';
export const ShadowV3: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const walk = easeInOut(seg(f, 30, 205));
	const wx = lerp(160, 900, walk);
	const walking = f > 30 && f < 205;
	const lift = easeInOut(seg(f, 214, 244));
	const lit = easeInOut(seg(f, 236, 276));
	const flick = 1 + 0.03 * Math.sin(f / 3.1) * Math.sin(f / 7.3);
	const bob = walking ? Math.abs(Math.sin(f / 5)) * -10 : 0;
	const icons = ['M0,-30 L28,20 L-28,20 Z', 'M-26,-26 H26 V26 H-26 Z', 'circle', 'M0,-30 L9,-9 L30,-9 L13,5 L19,28 L0,14 L-19,28 L-13,5 L-30,-9 L-9,-9 Z', 'M-30,0 C-30,-30 30,-30 30,0 C30,30 -30,30 -30,0 Z', 'M-28,20 L0,-28 L28,20 L14,20 L0,-4 L-14,20 Z'];
	const cards = ['Era uma vez vinte e seis estilos…', '…e ninguém para escolher entre eles.', 'Até que alguém acendeu a lanterna.'];
	const ci = f < 120 ? 0 : f < 230 ? 1 : 2;
	const par = (d: number) => -walk * 120 * d;
	const hill = (y: number, amp: number, seed: number) => `M-200,${y} ${Array.from({length: 13}, (_, i) => `Q${-200 + i * 200 + 100},${y - amp * (0.6 + random(`h${seed}${i}`) * 0.8)} ${-200 + (i + 1) * 200},${y}`).join(' ')} L2400,1080 L-200,1080 Z`;
	const LX = 1240, LY = 545;
	const lantern = {x: lerp(LX, wx + 140, lift), y: lerp(LY, 548, lift)};
	return (
		<AbsoluteFill style={{background: SH, overflow: 'hidden'}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse at ${lerp(50, (lantern.x / 1920) * 100, lit)}% 48%, rgba(255,214,150,${0.95 * flick}), rgba(226,120,40,${0.88 * flick}) 50%, #3a1405 100%)`, filter: `brightness(${0.78 + 0.42 * lit})`}} />
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				{/* estilos pendurados */}
				{Array.from({length: 13}, (_, i) => {
					const x = 160 + i * 132, y = 200 + (i % 2) * 70 + Math.sin(f / 25 + i) * 8;
					const d = icons[i % icons.length];
					return (
						<g key={i} transform={`translate(${x} ${y}) rotate(${Math.sin(f / 30 + i) * 4}) scale(${0.9 + (i % 3) * 0.1})`}>
							<line x1={0} y1={-260} x2={0} y2={-30} stroke={SH} strokeWidth={2} />
							{d === 'circle' ? <circle r={28} fill={SH} /> : <path d={d} fill={SH} />}
							{lit > 0 && <circle r={9 * lit} fill="#fff1d0" opacity={lit} />}
						</g>
					);
				})}
				{/* camadas de papel recortado */}
				<g transform={`translate(${par(0.3)} 0)`} opacity={0.22}><path d={hill(800, 120, 1)} fill={SH} /></g>
				<g transform={`translate(${par(0.6)} 0)`} opacity={0.42}>
					<path d={hill(860, 70, 2)} fill={SH} />
					{[180, 420, 1500, 1820].map((x, i) => <g key={x} transform={`translate(${x} ${820 - (i % 2) * 10})`}><rect x={-6} y={-10} width={12} height={60} fill={SH} /><circle cy={-40} r={44} fill={SH} /><circle cx={-30} cy={-14} r={28} fill={SH} /><circle cx={30} cy={-18} r={30} fill={SH} /></g>)}
					{[640, 1720].map((x) => <g key={x} transform={`translate(${x} 830)`}><path d="M-60,0 L-60,-70 L0,-120 L60,-70 L60,0 Z" fill={SH} /><rect x={-15} y={-50} width={22} height={22} fill="#ffcf8a" opacity={0.3 + 0.7 * lit} /></g>)}
				</g>
				<path d="M0,935 C300,920 600,950 960,930 C1300,912 1600,948 1920,925 L1920,1080 L0,1080 Z" fill={SH} />
				{/* poste e lanterna */}
				<path d={`M${LX - 6},905 L${LX + 2},${LY + 6} L${LX + 10},${LY + 6} L${LX + 18},905 Z`} fill={SH} />
				<path d={`M${LX + 6},${LY + 6} q30,-40 70,-20`} stroke={SH} strokeWidth={6} fill="none" opacity={1 - lift} />
				<g transform={`translate(${lantern.x} ${lantern.y})`}>
					{lit > 0 && <circle r={160 * lit} fill="#fff1c4" opacity={0.25 * lit} />}
					<path d="M-10,-20 L10,-20 L6,-8 L-6,-8 Z M-24,-8 L24,-8 L18,52 L-18,52 Z" fill={SH} />
					<path d="M-12,0 L12,0 L9,44 L-9,44 Z" fill={lit > 0 ? '#fff4d6' : '#4a1a08'} opacity={0.3 + 0.7 * lit} />
				</g>
			</svg>
			{/* a personagem: silhueta Open Peeps */}
			<div style={{position: 'absolute', left: wx - 170, top: 940 - 600 + bob, width: 340, height: 600, transform: `rotate(${walking ? Math.sin(f / 5) * 2 : 0}deg)`}}>
				<Peep style={{width: 340, height: 600}} body={(f < 210 ? 'WalkingFilled' : 'PointingFingerBW') as any} face={'Calm' as any} hair={'MediumBangs' as any} strokeColor={SH} backgroundColor={SH} viewBox={{x: '-100', y: '-20', width: '1400', height: '2470'}} />
			</div>
			{/* moldura de teatro: cortinas e bambinela */}
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<path d={`M0,0 L150,0 C120,300 170,600 110,1080 L0,1080 Z`} fill={SH} />
				<path d={`M1920,0 L1770,0 C1800,300 1750,600 1810,1080 L1920,1080 Z`} fill={SH} />
				<path d={`M0,0 H1920 V60 ${Array.from({length: 16}, (_, i) => `Q${1920 - i * 120 - 60},${120} ${1920 - (i + 1) * 120},60`).join(' ')} Z`} fill={SH} />
				{Array.from({length: 16}, (_, i) => <circle key={i} cx={i * 120 + 60} cy={104} r={6} fill={SH} />)}
			</svg>
			<div style={{position: 'absolute', top: 960, width: 1920, display: 'flex', justifyContent: 'center'}}>
				<div style={{background: '#f2e2c4', color: SH, fontFamily: F.itau, fontWeight: 300, fontSize: 40, padding: '10px 34px', clipPath: 'polygon(1% 4%, 99% 0, 100% 92%, 0 100%)', opacity: clamp((f - [10, 125, 240][ci]) / 10)}}>{cards[ci]}</div>
			</div>
			<Invoke id="shadow" dur={dur} look="shadow" pos="center" />
		</AbsoluteFill>
	);
};
