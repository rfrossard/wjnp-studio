import React, {useLayoutEffect, useMemo, useRef} from 'react';
import {AbsoluteFill, Img, random, staticFile, useCurrentFrame} from 'remotion';
import {C, F, F2} from '../theme';
import {Invoke, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01, useFonts} from './core';
import {dropIn, tornRect, drawing} from '../lib';

// máscara de uma cena desenhada em canvas → lista de pontos alvo
const maskPoints = (w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, n: number, seed: string) => {
	const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
	const g = cv.getContext('2d', {willReadFrequently: true})!;
	g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.fillStyle = '#000'; g.strokeStyle = '#000';
	draw(g);
	const d = g.getImageData(0, 0, w, h).data;
	const inside: number[] = [];
	for (let i = 0; i < w * h; i++) if (d[i * 4] < 128) inside.push(i);
	const pts: [number, number][] = [];
	for (let k = 0; k < n; k++) { const i = inside[Math.floor(random(`${seed}${k}`) * inside.length)]; pts.push([(i % w) + random(`${seed}jx${k}`), Math.floor(i / w) + random(`${seed}jy${k}`)]); }
	// ordem espacial (varredura) para o movimento parecer areia sendo arrastada, não teleporte
	pts.sort((a, b) => a[0] * 0.8 + a[1] - (b[0] * 0.8 + b[1]));
	return pts;
};

// ============ 24 · Animação em areia ============
const SW = 960, SH = 540, NG = 42000;
export const SandS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const ok = useFonts();
	const scenes = useMemo(() => !ok ? null : [
		maskPoints(SW, SH, (g) => { // lâmpada: "a primeira ideia"
			g.beginPath(); g.arc(480, 220, 110, 0, Math.PI * 2); g.fill();
			g.fillRect(430, 300, 100, 90); g.fillRect(440, 395, 80, 18); g.fillRect(450, 418, 60, 16);
			g.lineWidth = 14; for (let i = 0; i < 9; i++) { const a = -Math.PI + (i / 8) * Math.PI; g.beginPath(); g.moveTo(480 + Math.cos(a) * 150, 220 + Math.sin(a) * 150); g.lineTo(480 + Math.cos(a) * 205, 220 + Math.sin(a) * 205); g.stroke(); }
		}, NG, 'a'),
		maskPoints(SW, SH, (g) => { // notebook com uma tela
			g.lineWidth = 22; g.strokeRect(290, 110, 380, 240); g.fillRect(230, 360, 500, 34);
			g.beginPath(); g.arc(480, 230, 46, 0, Math.PI * 2); g.fill();
		}, NG, 'b'),
		maskPoints(SW, SH, (g) => { g.font = '800 290px Archivo'; g.textAlign = 'center'; g.fillText('27', 480, 360); }, NG, 'c'),
		maskPoints(SW, SH, (g) => { g.beginPath(); g.arc(480, 270, 26, 0, Math.PI * 2); g.fill(); }, NG, 'd'),
	], [ok]);
	const T = [60, 230, 400, dur - 20]; // instantes de cada cena
	const caps = ['a primeira ideia', 'uma tela', 'vinte e sete jeitos de contar'];
	useLayoutEffect(() => {
		if (!scenes) return;
		const g = ref.current!.getContext('2d')!;
		const grd = g.createRadialGradient(480, 260, 40, 480, 270, 620);
		grd.addColorStop(0, '#ffe6b0'); grd.addColorStop(0.6, '#f0b866'); grd.addColorStop(1, '#8a5320');
		g.fillStyle = grd; g.fillRect(0, 0, SW, SH);
		// qual par de cenas está ativo
		let i = 0; while (i < T.length - 1 && f > T[i + 1] - 70) i++;
		const A = scenes[Math.max(0, i - (f < T[i] ? 1 : 0))], B = scenes[i];
		const k = f < T[0] ? 0 : easeInOut(seg(f, T[i] - 70, T[i]));
		const from = f < T[0] ? null : A;
		g.fillStyle = 'rgba(40,24,10,0.42)';
		for (let n = 0; n < NG; n++) {
			const b = B[n];
			let x: number, y: number;
			if (!from) { // começo: areia espalhada caindo para formar a lâmpada
				const kk = easeInOut(seg(f, 0, T[0]));
				x = lerp(random(`s${n}`) * SW, b[0], kk); y = lerp(random(`t${n}`) * SH, b[1], kk);
			} else {
				const a = from[n];
				const swirl = Math.sin(k * Math.PI) * 26 * (random(`w${n}`) - 0.5);
				x = lerp(a[0], b[0], k) + swirl; y = lerp(a[1], b[1], k) + swirl * 0.5 + Math.sin(k * Math.PI) * 18;
			}
			g.fillRect(x, y, 1.2, 1.2);
		}
	}, [f, scenes]);
	const ci = f < 200 ? 0 : f < 370 ? 1 : 2;
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<canvas ref={ref} width={SW} height={SH} style={{width: 1920, height: 1080, filter: 'blur(0.6px) contrast(1.05)'}} />
			<div style={{position: 'absolute', bottom: 120, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 46, color: '#3a2510', opacity: clamp((f - [70, 240, 410][ci]) / 12) * (1 - clamp((f - [200, 370, dur - 160][ci]) / 10))}}>{caps[ci]}</div>
			<Invoke id="sand" dur={dur} look="sand" pos="top" />
		</AbsoluteFill>
	);
};

// ============ 25 · Teatro de sombras ============
const SH_INK = '#120a06';
const Figure: React.FC<{x: number; y: number; f: number; walking: boolean; lift: number}> = ({x, y, f, walking, lift}) => {
	const ph = walking ? Math.floor(f / 4) % 4 : 0; // pose a pose (≈ 8 desenhos/s)
	const leg = [18, 6, -18, -6][ph];
	return (
		<g transform={`translate(${x} ${y})`}>
			<line x1={0} y1={-170} x2={0} y2={-420} stroke={SH_INK} strokeWidth={2} opacity={0.5} />
			<g transform={`rotate(${leg} 0 -60)`}><path d="M-8,-60 L-14,0 L2,0 L4,-60 Z" fill={SH_INK} /></g>
			<g transform={`rotate(${-leg} 0 -60)`}><path d="M-4,-60 L4,0 L18,0 L8,-60 Z" fill={SH_INK} /></g>
			<path d="M-34,-60 C-30,-150 30,-150 34,-60 Z" fill={SH_INK} />
			<circle cx={0} cy={-170} r={26} fill={SH_INK} />
			<circle cx={9} cy={-174} r={4} fill="#ffcf8a" />
			<g transform={`rotate(${-lift * 110} 24 -120)`}><path d="M20,-125 L80,-120 L80,-112 L20,-112 Z" fill={SH_INK} /></g>
		</g>
	);
};
export const ShadowS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const walkX = lerp(220, 980, easeInOut(seg(f, 30, 200)));
	const lift = easeInOut(seg(f, 215, 245));
	const lit = easeInOut(seg(f, 235, 275));
	const flick = 1 + 0.03 * Math.sin(f / 3.1) * Math.sin(f / 7.3);
	const icons = ['M0,-30 L28,20 L-28,20 Z', 'M-26,-26 H26 V26 H-26 Z', 'circle', 'M0,-30 L9,-9 L30,-9 L13,5 L19,28 L0,14 L-19,28 L-13,5 L-30,-9 L-9,-9 Z', 'M-30,0 C-30,-30 30,-30 30,0 C30,30 -30,30 -30,0 Z', 'M-28,20 L0,-28 L28,20 L14,20 L0,-4 L-14,20 Z'];
	const cards = ['Era uma vez vinte e seis estilos…', '…e ninguém para escolher entre eles.', 'Até que alguém acendeu a lanterna.'];
	const ci = f < 120 ? 0 : f < 230 ? 1 : 2;
	return (
		<AbsoluteFill style={{background: SH_INK}}>
			<AbsoluteFill style={{background: `radial-gradient(ellipse at 50% 45%, rgba(255,207,138,${0.95 * flick}), rgba(224,122,42,${0.85 * flick}) 55%, #3a1405 100%)`, filter: `brightness(${0.8 + 0.4 * lit})`}} />
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{/* estilos pendurados por varetas: ganham brilho quando a lanterna acende */}
				{Array.from({length: 13}, (_, i) => {
					const x = 140 + i * 128, y = 180 + (i % 2) * 70 + Math.sin(f / 25 + i) * 8;
					const d = icons[i % icons.length];
					return (
						<g key={i} transform={`translate(${x} ${y}) scale(${0.9 + (i % 3) * 0.1})`} style={{filter: `blur(${(i % 3) * 1.2}px)`}}>
							<line x1={0} y1={-200} x2={0} y2={-30} stroke={SH_INK} strokeWidth={2} />
							{d === 'circle' ? <circle r={28} fill={SH_INK} /> : <path d={d} fill={SH_INK} />}
							{lit > 0 && <circle r={6 * lit} fill="#fff1d0" opacity={lit} />}
						</g>
					);
				})}
				{/* chão de papel recortado */}
				<path d="M0,900 C300,880 600,920 960,895 C1300,872 1600,915 1920,890 L1920,1080 L0,1080 Z" fill={SH_INK} />
				{/* poste com a lanterna */}
				<path d="M1180,895 L1192,560 L1200,560 L1210,895 Z" fill={SH_INK} />
				<g transform={`translate(${lerp(1196, 1080, lift)} ${lerp(560, 690, lift)})`}>
					<path d="M-26,0 L26,0 L20,56 L-20,56 Z" fill={SH_INK} />
					<path d="M-12,8 L12,8 L9,48 L-9,48 Z" fill={lit > 0 ? '#fff4d6' : '#3a1405'} opacity={0.3 + 0.7 * lit} />
				</g>
				<Figure x={walkX} y={900} f={f} walking={f > 30 && f < 200} lift={lift} />
			</svg>
			<div style={{position: 'absolute', top: 960, width: 1920, display: 'flex', justifyContent: 'center'}}>
				<div style={{background: '#f2e2c4', color: SH_INK, fontFamily: F.itau, fontWeight: 300, fontSize: 38, padding: '10px 30px', clipPath: 'polygon(1% 4%, 99% 0, 100% 92%, 0 100%)', opacity: clamp((f - [10, 125, 240][ci]) / 10)}}>{cards[ci]}</div>
			</div>
			<Invoke id="shadow" dur={dur} look="shadow" pos="center" />
		</AbsoluteFill>
	);
};

// ============ 26 · Colagem de bastidores (fotos reais deste projeto) ============
const Paper: React.FC<{id: string; w: number; h: number; fill: string}> = ({id, w, h, fill}) => (
	<svg width={w + 24} height={h + 24} style={{position: 'absolute', left: -12, top: -12, overflow: 'visible'}}>
		<g transform="translate(12,12)">
			<path d={tornRect(`${id}-f`, w + 6, h + 6, 12, 7)} transform="translate(-3,-3)" fill="#fbfaf6" />
			<path d={tornRect(id, w, h, 8, 9)} fill={fill} />
		</g>
	</svg>
);
export const CollageS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const photos = [
		{src: 'led.png', x: 120, y: 120, w: 620, rot: -4, f0: 10},
		{src: 'flat.png', x: 760, y: 90, w: 560, rot: 3, f0: 30},
		{src: 'editorial.png', x: 1300, y: 160, w: 520, rot: -2, f0: 50},
		{src: 'skills.png', x: 520, y: 520, w: 700, rot: 2, f0: 75},
	];
	const labels = [
		{t: '08/11/2026', x: 160, y: 520, w: 300, fill: C.orange, color: '#fff', f0: 100},
		{t: 'bastidores', x: 1340, y: 560, w: 330, fill: '#111', color: '#fff', f0: 115},
		{t: '11 formatos → 27 estilos', x: 1250, y: 760, w: 560, fill: '#efe6d2', color: '#111', f0: 130},
	];
	return (
		<AbsoluteFill style={{background: '#2b2620'}}>
			<div style={{position: 'absolute', left: 40, top: 30}}><Paper id="pg" w={1840} h={1020} fill="#e9e1cf" /></div>
			{photos.map((p, i) => {
				const d = dropIn(f, p.f0, `p${i}`, p.rot); if (!d) return null;
				const h = (p.w * 9) / 16;
				return (
					<div key={i} style={{position: 'absolute', left: p.x, top: p.y, width: p.w, height: h, transform: `translate(${d.dx}px, ${d.dy}px) rotate(${d.rot}deg) scale(${d.s})`, boxShadow: '0 0 0 14px #fbfaf6, 0 18px 30px rgba(0,0,0,0.35)'}}>
						<Img src={staticFile(`data/stills/${p.src}`)} style={{width: '100%', height: '100%', objectFit: 'cover'}} />
						<div style={{position: 'absolute', left: p.w / 2 - 70, top: -26, width: 140, height: 44, background: 'rgba(230,220,196,0.85)', transform: `rotate(${-p.rot * 2}deg)`}} />
					</div>
				);
			})}
			{labels.map((l, i) => {
				const d = dropIn(f, l.f0, `l${i}`, i % 2 ? 2 : -2); if (!d) return null;
				return (
					<div key={i} style={{position: 'absolute', left: l.x, top: l.y, width: l.w, height: 76, transform: `translate(${d.dx}px, ${d.dy}px) rotate(${d.rot}deg) scale(${d.s})`, filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.3))'}}>
						<Paper id={`lb${i}`} w={l.w} h={76} fill={l.fill} />
						<div style={{position: 'absolute', left: 26, top: 18, fontFamily: F.mono, fontWeight: 500, fontSize: 30, color: l.color, whiteSpace: 'nowrap'}}>{l.t}</div>
					</div>
				);
			})}
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{(() => { const q = (drawing(f) * 30) / 12; const p = easeInOut(seg(q, 150, 175)); return p > 0 ? <path d="M520,590 C430,640 420,720 500,760" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} stroke={C.orange} strokeWidth={8} fill="none" strokeLinecap="round" /> : null; })()}
			</svg>
			<Invoke id="collage" dur={dur} look="paper" pos="bottom" />
		</AbsoluteFill>
	);
};

// ============ 27 · Pixel art 16-bit: estúdio à noite (loop lofi) ============
const LW = 320, LH = 180;
const PAL = {sky0: '#0b0b1e', sky1: '#16163a', sky2: '#24245a', moon: '#f2f0d8', city: '#0a0a18', win: '#ffd27a', wall: '#2a1f3d', wall2: '#352850', desk: '#5a3a2a', desk2: '#3d261b', mon: '#11131c', glow: '#7fe3ff', glow2: '#ff9a4d', lamp: '#ffd23f', cat: '#0d0d14', plant: '#2f7a4a', rain: '#6b74c9', frame: '#4a3a66'};
const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
export const PixelS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const low = useMemo(() => { const c = document.createElement('canvas'); c.width = LW; c.height = LH; return c; }, []);
	const ok = useFonts();
	useLayoutEffect(() => {
		if (!ok) return;
		const t = Math.floor((f / 30) * 12) / 12; // 12 desenhos/s
		const g = low.getContext('2d')!;
		const R = (x: number, y: number, w: number, h: number, c: string) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
		R(0, 0, LW, LH, PAL.wall);
		// janela com céu (dithering ordenado), lua, cidade e chuva
		const WX = 30, WY = 20, WW = 150, WH = 100;
		for (let y = 0; y < WH; y++) for (let x = 0; x < WW; x++) { const k = (y / WH) * 16; R(WX + x, WY + y, 1, 1, k > BAYER[y % 4][x % 4] + 8 ? PAL.sky1 : k > BAYER[y % 4][x % 4] ? PAL.sky2 : PAL.sky0); }
		g.fillStyle = PAL.moon; g.beginPath(); g.arc(WX + 112, WY + 22, 9, 0, Math.PI * 2); g.fill();
		const bld = [[0, 55, 22], [22, 40, 18], [40, 62, 26], [66, 34, 20], [86, 50, 24], [110, 44, 18], [128, 58, 22]];
		for (const [bx, bh, bw] of bld) { R(WX + bx, WY + WH - bh, bw, bh, PAL.city); for (let wy = 4; wy < bh - 4; wy += 6) for (let wx = 3; wx < bw - 3; wx += 5) if (random(`w${bx}${wy}${wx}${Math.floor(t / 2)}`) > 0.72) R(WX + bx + wx, WY + WH - bh + wy, 2, 2, PAL.win); }
		for (let i = 0; i < 40; i++) { const rx = (random(`rx${i}`) * WW + t * 20) % WW, ry = (random(`ry${i}`) * WH + t * 90 * (0.8 + random(`rs${i}`) * 0.4)) % WH; R(WX + rx, WY + ry, 1, 3, PAL.rain); }
		R(WX - 4, WY - 4, WW + 8, 4, PAL.frame); R(WX - 4, WY + WH, WW + 8, 5, PAL.frame); R(WX - 4, WY, 4, WH, PAL.frame); R(WX + WW, WY, 4, WH, PAL.frame); R(WX + WW / 2 - 2, WY, 4, WH, PAL.frame);
		// mesa, monitor brilhando, luminária, planta, gato
		R(0, 130, LW, 50, PAL.desk2); R(0, 128, LW, 4, PAL.desk);
		R(190, 70, 90, 58, '#222533'); R(194, 74, 82, 48, PAL.mon);
		const lines = Math.floor(t * 3) % 9;
		for (let l = 0; l < 8; l++) if (l <= lines) R(198, 78 + l * 5, 20 + ((l * 37) % 50), 2, l === 3 ? PAL.glow2 : PAL.glow);
		R(230, 128, 10, 4, '#222533');
		const flick = Math.sin(t * 7) > 0.92 ? 0 : 1;
		R(140, 60, 3, 70, '#3a3048'); R(130, 56, 24, 8, PAL.lamp); if (flick) { g.globalAlpha = 0.18; R(118, 64, 48, 64, PAL.lamp); g.globalAlpha = 1; }
		R(290, 108, 14, 20, '#7a4a2a'); for (let k = 0; k < 5; k++) R(288 + k * 4 - (k % 2) * 2, 90 + (k % 3) * 4, 3, 18 - (k % 3) * 4, PAL.plant);
		// gato na janela, rabo balançando (2 desenhos)
		R(150, 108, 22, 20, PAL.cat); R(152, 100, 6, 8, PAL.cat); R(164, 100, 6, 8, PAL.cat); R(154, 112, 2, 2, PAL.glow2); R(165, 112, 2, 2, PAL.glow2);
		const tail = Math.floor(t * 2) % 2; R(172, 116 - tail * 4, 4, 12, PAL.cat); R(174, 112 - tail * 6, 6, 4, PAL.cat);
		// texto em fonte de pixel
		g.font = '8px "Press Start 2P"'; g.fillStyle = PAL.lamp; g.fillText('03:12  lofi', 196, 160);
		const out = ref.current!.getContext('2d')!; out.imageSmoothingEnabled = false; out.drawImage(low, 0, 0, LW * 6, LH * 6);
	}, [f, low, ok]);
	return (
		<AbsoluteFill style={{background: '#000'}}>
			<canvas ref={ref} width={1920} height={1080} style={{imageRendering: 'pixelated'}} />
			<Invoke id="pixel" dur={dur} look="pixel" pos="center" />
		</AbsoluteFill>
	);
};

// ============ 28 · Mosaico de vidro e ouro ============
const GX = 64, GY = 36, TS = 30;
const GLASS = ['#1d4e89', '#2a6f97', '#3b8ea5', '#5aa9b8', '#7c3a8c', '#a04668', '#c45a3c', '#1f6f5c'];
const GOLD = ['#d4a640', '#e8c062', '#b8862b'];
export const MosaicS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const ok = useFonts();
	const target = useMemo(() => {
		if (!ok) return null;
		const cv = document.createElement('canvas'); cv.width = GX; cv.height = GY;
		const g = cv.getContext('2d', {willReadFrequently: true})!;
		g.fillStyle = '#000'; g.font = '800 30px Archivo'; g.textAlign = 'center'; g.fillText('27', GX / 2, 29);
		const d = g.getImageData(0, 0, GX, GY).data;
		const cells: number[] = []; for (let i = 0; i < GX * GY; i++) if (d[i * 4 + 3] > 120) cells.push(i);
		return cells;
	}, [ok]);
	useLayoutEffect(() => {
		if (!target) return;
		const g = ref.current!.getContext('2d')!;
		g.fillStyle = '#1a140c'; g.fillRect(0, 0, 1920, 1080);
		const lift = easeInOut(seg(f, 40, 110)), form = easeInOut(seg(f, 110, 220)), back = easeInOut(seg(f, dur - 150, dur - 40));
		// cada pastilha do "27" voa da sua posição de origem para a célula alvo, em arco, virando (lado dourado)
		const assigned = new Map<number, number>();
		target.forEach((cell, k) => { const src = Math.floor(random(`src${k}`) * GX * GY); assigned.set(src, cell); });
		for (let i = 0; i < GX * GY; i++) {
			const x0 = (i % GX) * TS, y0 = Math.floor(i / GX) * TS;
			const tgt = assigned.get(i);
			let x = x0, y = y0, flip = 1, col = GLASS[Math.floor(random(`c${i}`) * GLASS.length)];
			const shimmer = 0.85 + 0.15 * Math.sin(f / 10 + i * 0.7);
			if (tgt !== undefined) {
				const x1 = (tgt % GX) * TS, y1 = Math.floor(tgt / GX) * TS;
				const k = form * (1 - back);
				x = lerp(x0, x1, k); y = lerp(y0, y1, k) - Math.sin(k * Math.PI) * 220 - lift * (1 - back) * 40;
				flip = Math.cos(k * Math.PI * 3); col = k > 0.5 ? GOLD[i % 3] : col;
			} else {
				const dl = random(`d${i}`) * 0.4; const kk = clamp((lift - dl) / (1 - dl)) * (1 - form) * (1 - back);
				y = y0 - Math.sin(kk * Math.PI) * 8; flip = Math.cos(kk * Math.PI);
			}
			const w = (TS - 3) * Math.abs(flip);
			g.globalAlpha = tgt !== undefined ? 1 : 0.55 + 0.45 * (1 - form * (1 - back) * 0.6);
			g.fillStyle = col;
			g.fillRect(x + (TS - w) / 2 + 1.5, y + 1.5, w, TS - 3);
			if (tgt !== undefined && form > 0.5) { g.fillStyle = `rgba(255,248,220,${0.35 * shimmer})`; g.fillRect(x + 3, y + 3, (w * 0.4), 4); }
		}
		g.globalAlpha = 1;
	}, [f, target]);
	return (
		<AbsoluteFill>
			<canvas ref={ref} width={1920} height={1080} />
			<Invoke id="mosaic" dur={dur} look="gold" pos="bottom" />
		</AbsoluteFill>
	);
};
