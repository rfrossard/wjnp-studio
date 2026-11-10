import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {ThreeCanvas} from '@remotion/three';
import * as THREE from 'three';
import {C, F} from '../theme';
import {Invoke, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from './core';
import {Timeline} from '../scenes/Timeline';
import entries from './entries.json';

// ============ 11 · Data story editorial (dados reais do vídeo "Onze formatos") ============
const DUR11 = [
	['LED', 8], ['Flat', 7.5], ['Colagem', 8.5], ['Linha do tempo', 8], ['Jornada', 8], ['Demo', 8],
	['Data story', 8], ['Paper', 8], ['Entrevista', 43], ['3D', 8], ['Anúncio', 8], ['Fechamento', 12],
] as [string, number][];
export const DataS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const max = 43, X0 = 1130, BW = 640, Y0 = 210, RH = 58;
	const head = softIn(f, 6, 12), note = softIn(f, 110, 12);
	return (
		<AbsoluteFill style={{background: '#f3f4f7'}}>
			<div style={{position: 'absolute', left: 96, top: 200, width: 760, fontFamily: F.itau, fontWeight: 300, fontSize: 74, lineHeight: '84px', color: '#0b0b14', opacity: head.opacity, transform: `translateY(${head.y}px)`}}>
				A fala real ocupou <span style={{color: C.orange}}>31%</span> do vídeo
			</div>
			<div style={{position: 'absolute', left: 96, top: 400, width: 700, fontFamily: F.itau, fontWeight: 300, fontSize: 32, lineHeight: '44px', color: '#4f5566', opacity: note.opacity}}>
				Onze formatos em 137 s. Dez deles levaram ~8 s; a entrevista levou 43 s (41 s de clipe + passagens).
			</div>
			{DUR11.map(([n, v], i) => {
				const g = spring01((f - 20 - i * 4) / 30, 12, 0.95);
				const hi = n === 'Entrevista';
				return (
					<div key={n} style={{position: 'absolute', left: X0 - 230, top: Y0 + i * RH, width: 1000, height: RH - 14, display: 'flex', alignItems: 'center'}}>
						<div style={{width: 220, textAlign: 'right', paddingRight: 14, fontFamily: F.mono, fontSize: 20, color: hi ? '#0b0b14' : '#6b7280'}}>{n}</div>
						<div style={{height: RH - 22, width: (BW * v * g) / max, background: hi ? C.orange : '#b9bdd6', borderRadius: 3}} />
						<div style={{marginLeft: 12, fontFamily: F.mono, fontSize: 20, color: hi ? C.orange : '#6b7280', opacity: clamp((f - 40 - i * 4) / 8)}}>{v} s</div>
					</div>
				);
			})}
			<div style={{position: 'absolute', left: X0 - 10, top: Y0 - 10, width: 2, height: DUR11.length * RH, background: '#b8bdcc'}} />
			<div style={{position: 'absolute', left: 96, bottom: 56, fontFamily: F.mono, fontSize: 18, color: '#6b7280'}}>
				Fonte: src/timeline.ts do vídeo “Onze formatos” (08/11/2026). Base zero; durações em segundos.
			</div>
			<Invoke id="datastory" dur={dur} look="light" pos="left" />
		</AbsoluteFill>
	);
};

// ============ 12 · Traço preciso: como o master trabalha ============
const Stroke: React.FC<{d: string; f: number; a: number; b: number; color?: string; w?: number}> = ({d, f, a, b, color = C.ink, w = 2.5}) => (
	<path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - easeInOut(seg(f, a, b))} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);
export const StrokeS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const steps = ['Roteiro', 'Plano por trecho', 'Contratos', 'Render', 'QA'];
	const notes = ['aprovação', 'afinidade · orçamento', 'beat · bastão · áudio', 'skills e fichas', 'LUFS · frames · sync'];
	const W = 290, H = 120, G = 70, X = (1920 - (5 * W + 4 * G)) / 2, Y = 470;
	const rr = (x: number, y: number, w: number, h: number, r = 14) => `M${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h - r} Q${x + w},${y + h} ${x + w - r},${y + h} H${x + r} Q${x},${y + h} ${x},${y + h - r} V${y + r} Q${x},${y} ${x + r},${y} Z`;
	const head = softIn(f, 8, 12);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<div style={{position: 'absolute', left: 96, top: 170, fontFamily: F.itau, fontWeight: 300, fontSize: 76, color: C.ink, opacity: head.opacity, transform: `translateY(${head.y}px)`}}>Como o master trabalha</div>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{steps.map((s, i) => {
					const x = X + i * (W + G);
					return (
						<g key={s}>
							<Stroke d={rr(x, Y, W, H)} f={f} a={30 + i * 22} b={58 + i * 22} color={i === 1 ? C.orange : C.ink} w={2.5} />
							{i < 4 && <Stroke d={`M${x + W + 10},${Y + H / 2} L${x + W + G - 12},${Y + H / 2} M${x + W + G - 24},${Y + H / 2 - 9} L${x + W + G - 12},${Y + H / 2} L${x + W + G - 24},${Y + H / 2 + 9}`} f={f} a={52 + i * 22} b={66 + i * 22} w={2} />}
							<Stroke d={`M${x + W / 2},${Y + H + 12} L${x + W / 2},${Y + H + 90}`} f={f} a={140 + i * 10} b={156 + i * 10} color={C.muted} w={1.5} />
						</g>
					);
				})}
				{/* laço de revisão do QA de volta ao render */}
				<Stroke d={`M${X + 4 * (W + G) + W / 2},${Y - 12} C${X + 4 * (W + G) + W / 2},${Y - 120} ${X + 3 * (W + G) + W / 2},${Y - 120} ${X + 3 * (W + G) + W / 2},${Y - 14} M${X + 3 * (W + G) + W / 2 - 9},${Y - 26} L${X + 3 * (W + G) + W / 2},${Y - 14} L${X + 3 * (W + G) + W / 2 + 9},${Y - 26}`} f={f} a={200} b={230} color={C.orange} w={2.5} />
			</svg>
			{steps.map((s, i) => {
				const x = X + i * (W + G);
				const a = softIn(f, 50 + i * 22), b = softIn(f, 160 + i * 10);
				return (
					<React.Fragment key={s}>
						<div style={{position: 'absolute', left: x, width: W, top: Y + 38, textAlign: 'center', fontFamily: F.display, fontWeight: 700, fontSize: 30, color: i === 1 ? C.orange : C.ink, opacity: a.opacity}}>{s}</div>
						<div style={{position: 'absolute', left: x - 20, width: W + 40, top: Y + H + 104, textAlign: 'center', fontFamily: F.mono, fontSize: 21, color: C.muted, opacity: b.opacity}}>{notes[i]}</div>
					</React.Fragment>
				);
			})}
			<div style={{position: 'absolute', left: X + 3 * (W + G) - 10, top: Y - 170, width: W * 2 + G, textAlign: 'center', fontFamily: F.mono, fontSize: 21, color: C.orange, opacity: softIn(f, 225).opacity}}>refaz só o que falhou</div>
			<Invoke id="stroke" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};

// ============ 13 · Nanquim: a linha do tempo real de hoje ============
export const InkS: React.FC<{dur: number}> = ({dur}) => {
	const xs = [300, 560, 820, 1080, 1340, 1600];
	const data = [['18:34', 'skills instalados'], ['18:50', 'projeto do Hub'], ['19:02', '1º vídeo · 32 s'], ['19:40', 'onze formatos'], ['20:12', 'o master'], ['20:33', 'este vídeo']];
	return (
		<AbsoluteFill>
			<Timeline marks={data.map(([y, n], i) => ({x: xs[i], year: y, note: n, at: 50 + i * 16}))} headline="08/11/2026 — um dia, uma biblioteca" sealText="AGORA" sealX={1600} dive={false} />
			<Invoke id="ink" dur={dur} look="paper" pos="top" />
		</AbsoluteFill>
	);
};

// ============ 14 · Constelação de partículas: os 334 vídeos da coleção ============
const CATS = [['launch', 'lançamentos'], ['showreel', 'showreels'], ['story', 'histórias'], ['explainer', 'explicadores'], ['history', 'história'], ['music', 'música'], ['self', 'Opus sobre si'], ['worlds', 'mundos 3D'], ['remix', 'remixes']] as const;
const ENT = entries as [string, number][];
const PER = 36; // partículas por vídeo
const PTS = (() => {
	const pts: {cat: number; hx: number; hy: number; sx: number; sy: number; b: number}[] = [];
	const counts = CATS.map(([c]) => ENT.filter(([k]) => k === c).length);
	const centers = CATS.map((_, i) => { const a = -Math.PI / 2 + (i / CATS.length) * Math.PI * 2; return [960 + Math.cos(a) * 360, 600 + Math.sin(a) * 285]; });
	ENT.forEach(([c, bm], ei) => {
		const ci = CATS.findIndex(([k]) => k === c);
		const rad = 20 + Math.sqrt(counts[ci]) * 13;
		for (let j = 0; j < PER; j++) {
			const id = `${ei}-${j}`;
			const a = random(`a${id}`) * Math.PI * 2, r = Math.sqrt(random(`r${id}`)) * rad;
			const A = random(`A${id}`) * Math.PI * 2, R = 120 + random(`R${id}`) * 760;
			pts.push({cat: ci, hx: centers[ci][0] + Math.cos(a) * r, hy: centers[ci][1] + Math.sin(a) * r * 0.9, sx: 960 + Math.cos(A) * R, sy: 540 + Math.sin(A) * R * 0.6, b: Math.min(1, 0.25 + Math.log10(1 + bm) / 4)});
		}
	});
	return {pts, counts, centers};
})();
export const ParticlesS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const k1 = easeInOut(seg(f, 20, 120)); // nuvem → constelações por categoria
	const k2 = easeIn(seg(f, dur - 40, dur - 10)); // tudo se condensa num ponto
	useLayoutEffect(() => {
		const g = ref.current!.getContext('2d')!;
		g.globalCompositeOperation = 'source-over';
		g.fillStyle = '#04050a'; g.fillRect(0, 0, 1920, 1080);
		g.globalCompositeOperation = 'lighter';
		const t = f / 30;
		for (let i = 0; i < PTS.pts.length; i++) {
			const p = PTS.pts[i];
			const d = random(`d${i}`) * 0.25;
			const k = clamp((k1 - d) / (1 - d));
			const nx = Math.sin(t * 0.7 + i) * 4, ny = Math.cos(t * 0.6 + i * 1.3) * 4;
			let x = lerp(p.sx, p.hx, easeInOut(k)) + nx, y = lerp(p.sy, p.hy, easeInOut(k)) + ny;
			x = lerp(x, 960, k2); y = lerp(y, 540, k2);
			const hot = p.cat === 0;
			g.fillStyle = hot ? `rgba(255,120,40,${0.75 * p.b})` : `rgba(150,180,255,${0.6 * p.b})`;
			g.fillRect(x, y, 2.6, 2.6);
		}
	}, [f, k1, k2]);
	return (
		<AbsoluteFill>
			<canvas ref={ref} width={1920} height={1080} />
			{CATS.map(([c, n], i) => {
				const o = softIn(f, 120 + i * 6).opacity * (1 - clamp((f - (dur - 50)) / 10));
				const [x, y] = PTS.centers[i];
				return (
					<div key={c} style={{position: 'absolute', left: x - 140, top: y + (y > 560 ? 80 : -120), width: 280, textAlign: 'center', opacity: o}}>
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: i === 0 ? 48 : 36, color: i === 0 ? C.orange : '#eef2ff'}}>{PTS.counts[i]}</div>
						<div style={{fontFamily: F.mono, fontSize: 24, color: '#c3cbe6'}}>{n}</div>
					</div>
				);
			})}
			<div style={{position: 'absolute', left: 96, top: 40, fontFamily: F.itau, fontWeight: 300, fontSize: 44, color: '#e8ecff', opacity: softIn(f, 140).opacity * (1 - clamp((f - (dur - 50)) / 10))}}>
				334 vídeos feitos com Opus 5.5, por categoria
			</div>
			<div style={{position: 'absolute', left: 96, bottom: 50, fontFamily: F.mono, fontSize: 18, color: '#6f7894', opacity: softIn(f, 150).opacity}}>
				Fonte: awesome-opus-5.5-video-prompts (CC BY 4.0), 27/09/2026 · brilho = salvamentos
			</div>
			<Invoke id="particles" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};

// ============ 15 · 3D extrudado: "/27" montado em peças ============
const segShape = (w: number, h: number, r: number) => {
	const s = new THREE.Shape();
	s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
	s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2);
	s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
	return s;
};
// sete segmentos: a (topo), b (dir. sup.), c (dir. inf.), d (base), e (esq. inf.), f (esq. sup.), g (meio)
const SEG: Record<string, [number, number, boolean]> = {a: [0, 1, true], b: [0.5, 0.5, false], c: [0.5, -0.5, false], d: [0, -1, true], e: [-0.5, -0.5, false], f: [-0.5, 0.5, false], g: [0, 0, true]};
const Pieces: React.FC<{f: number}> = ({f}) => {
	const geoH = useMemo(() => new THREE.ExtrudeGeometry(segShape(0.9, 0.22, 0.1), {depth: 0.35, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3}), []);
	const geoV = useMemo(() => new THREE.ExtrudeGeometry(segShape(0.22, 0.9, 0.1), {depth: 0.35, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3}), []);
	const slash = useMemo(() => { const s = new THREE.Shape(); s.moveTo(-0.55, -1.15); s.lineTo(-0.3, -1.15); s.lineTo(0.55, 1.15); s.lineTo(0.3, 1.15); s.closePath(); return new THREE.ExtrudeGeometry(s, {depth: 0.35, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 3}); }, []);
	const digits: [number, string][] = [[0.6, 'abged'], [2.1, 'abc']];
	const sep = spring01((f - 40) / 30, 6, 0.75), enter = spring01((f - 4) / 30, 9, 0.8);
	const all: {g: THREE.BufferGeometry; x: number; y: number; z: number; c: string}[] = [{g: slash, x: -1.1, y: 0, z: 0.6, c: '#f3f4f7'}];
	digits.forEach(([dx, segs], di) => segs.split('').forEach((k, i) => { const [sx, sy, hz] = SEG[k]; all.push({g: hz ? geoH : geoV, x: dx + sx * 1.0, y: sy * 1.0, z: (i - 2) * 0.35 + di * 0.4, c: C.orange}); }));
	const rotY = lerp(-0.4, 0.3, easeInOut(seg(f, 0, 300))) + Math.sin(f / 40) * 0.03;
	return (
		<group rotation={[0.18, rotY, 0]} scale={enter} position={[-0.4, 0.15, 0]}>
			{all.map((p, i) => (
				<mesh key={i} geometry={p.g} position={[p.x, p.y, p.z * 0.9 * sep]}>
					<meshStandardMaterial color={p.c} roughness={0.35} metalness={0.1} />
				</mesh>
			))}
		</group>
	);
};
export const Extrude3DS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const t = softIn(f, 70, 12);
	return (
		<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, #1a1d2b 0%, #000 70%)'}}>
			<ThreeCanvas width={1920} height={1080} camera={{fov: 32, position: [0, 0.2, 11]}}>
				<ambientLight intensity={0.5} />
				<directionalLight position={[3, 4, 7]} intensity={2.6} />
				<pointLight position={[-5, -2, 4]} intensity={40} color={C.orange} />
				<pointLight position={[4, 2, -3]} intensity={30} color="#6f7bff" />
				<Pieces f={f} />
			</ThreeCanvas>
			<div style={{position: 'absolute', top: 120, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 54, color: C.ink, opacity: t.opacity}}>vinhetas, marcas e assinaturas em 3D</div>
			<Invoke id="extrude3d" dur={dur} look="dark" />
		</AbsoluteFill>
	);
};
