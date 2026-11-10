import React, {useEffect, useLayoutEffect, useMemo, useRef, useState} from 'react';
import {AbsoluteFill, OffthreadVideo, continueRender, delayRender, staticFile, useCurrentFrame} from 'remotion';
import {geoOrthographic, geoPath, geoInterpolate, geoGraticule10} from 'd3-geo';
import {feature} from 'topojson-client';
import land110 from 'world-atlas/land-110m.json';
import {C, F} from '../theme';
import {Invoke, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01, useFonts} from './core';

// ============ 16 · Telejornal / boletim ============
const RED = '#d62828', NAVY = '#0d1b3e';
const ITEMS = [
	{h: '15 estilos novos entram na biblioteca', s: 'pixel art, Manim, Blender, mapa, areia, HQ, telejornal e mais', src: 'fonte: motion-director/references/catalog.md'},
	{h: 'Master passa a coordenar 27 estilos', s: 'escolhe o estilo de cada trecho e monta o vídeo', src: 'fonte: motion-director/SKILL.md'},
	{h: 'Manim e Blender rodam nesta máquina', s: 'cenas 8 e 18 deste vídeo saíram dos motores reais', src: 'fonte: este projeto, 08/11/2026'},
];
export const NewsS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const vin = f < 70;
	const bands = [0, 1, 2].map((i) => easeInOut(seg(f, 4 + i * 5, 26 + i * 5)) - easeIn(seg(f, 52 + i * 4, 70 + i * 4)));
	const block = Math.floor((f - 150) / 110);
	const bi = clamp(block, 0, 2);
	const inBlocks = f >= 150;
	const tick = '• 334 vídeos analisados  • 11 formatos no vídeo do Hub  • 6 skills de terceiros com proveniência  • 15 fichas novas no master  • kit Remotion testado  ';
	return (
		<AbsoluteFill style={{background: `linear-gradient(160deg, ${NAVY}, #050914)`}}>
			{/* fundo de estúdio: grade e globo de linhas */}
			<svg width={1920} height={1080} style={{position: 'absolute', opacity: 0.18}}>
				{Array.from({length: 24}, (_, i) => <line key={i} x1={i * 90} y1={0} x2={i * 90 - 300} y2={1080} stroke="#4c6fff" strokeWidth={1} />)}
				<circle cx={1450} cy={480} r={330} fill="none" stroke="#4c6fff" strokeWidth={2} />
				{[-60, -30, 0, 30, 60].map((a) => <ellipse key={a} cx={1450} cy={480} rx={330 * Math.cos((a * Math.PI) / 180)} ry={330} fill="none" stroke="#4c6fff" strokeWidth={1} transform={`rotate(${f * 0.3} 1450 480)`} />)}
			</svg>
			{/* vinheta: faixas que varrem */}
			{vin && [0, 1, 2].map((i) => (
				<div key={i} style={{position: 'absolute', left: 0, top: 380 + i * 110, height: 100, width: 1920 * bands[i], background: [RED, '#fff', NAVY][i], transform: 'skewX(-12deg)', transformOrigin: 'left'}} />
			))}
			{vin && (
				<div style={{position: 'absolute', top: 400, width: 1920, textAlign: 'center', opacity: clamp((f - 20) / 6) * (1 - clamp((f - 54) / 6))}}>
					<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 120, color: '#fff', letterSpacing: '0.04em', textShadow: '0 6px 0 rgba(0,0,0,0.3)'}}>RADAR DA BIBLIOTECA</div>
					<div style={{fontFamily: F.mono, fontSize: 30, color: '#fff', marginTop: 10}}>edição de 08/11/2026</div>
				</div>
			)}
			{/* escalada */}
			{!vin && !inBlocks && ITEMS.map((it, i) => {
				const a = softIn(f, 72 + i * 22, 8);
				return (
					<div key={i} style={{position: 'absolute', left: 140, top: 300 + i * 150, opacity: a.opacity, transform: `translateX(${(1 - a.opacity) * -80}px)`, display: 'flex', alignItems: 'center', gap: 24}}>
						<div style={{width: 14, height: 90, background: RED}} />
						<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 56, color: '#fff'}}>{it.h}</div>
					</div>
				);
			})}
			{/* blocos: cartela + visual + tarja com fonte */}
			{inBlocks && f < dur - 150 && (
				<>
					<div style={{position: 'absolute', left: 140, top: 200, width: 900, height: 520, borderRadius: 6, overflow: 'hidden', background: '#0b1430', border: '2px solid #2b3d78'}}>
						<div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontWeight: 800, fontSize: [210, 230, 150][bi], color: [C.orange, '#fff', '#7fe3ff'][bi], transform: `scale(${0.9 + 0.1 * expo((f - 150 - bi * 110) / 12)})`}}>
							{['+15', '27', 'M · B'][bi]}
						</div>
						<div style={{position: 'absolute', left: 24, top: 20, fontFamily: F.mono, fontSize: 20, color: '#8ea0d8'}}>BLOCO {bi + 1} / 3</div>
					</div>
					<div style={{position: 'absolute', left: 1100, top: 260, width: 700, fontFamily: F.itau, fontWeight: 300, fontSize: 44, lineHeight: '56px', color: '#dfe6ff', opacity: softIn(f, 150 + bi * 110 + 8).opacity}}>{ITEMS[bi].s}</div>
					<div style={{position: 'absolute', left: 140, top: 760, display: 'flex', transform: `translateX(${(1 - expo((f - 150 - bi * 110) / 10)) * -900}px)`}}>
						<div style={{background: RED, color: '#fff', fontFamily: F.display, fontWeight: 800, fontSize: 30, padding: '14px 22px'}}>AGORA</div>
						<div style={{background: '#fff', color: '#111', fontFamily: F.display, fontWeight: 700, fontSize: 32, padding: '12px 26px'}}>{ITEMS[bi].h}</div>
					</div>
					<div style={{position: 'absolute', left: 140, top: 830, background: '#111', color: '#bbb', fontFamily: F.mono, fontSize: 20, padding: '8px 18px'}}>{ITEMS[bi].src}</div>
				</>
			)}
			{/* relógio e ticker */}
			{!vin && <div style={{position: 'absolute', right: 96, top: 70, fontFamily: F.mono, fontSize: 28, color: '#fff', background: RED, padding: '6px 16px'}}>20:{String(33 + Math.floor(f / 1800)).padStart(2, '0')} · AO VIVO</div>}
			{!vin && (
				<div style={{position: 'absolute', left: 0, bottom: 0, width: 1920, height: 64, background: '#fff', overflow: 'hidden', display: 'flex', alignItems: 'center'}}>
					<div style={{background: NAVY, color: '#fff', height: 64, display: 'flex', alignItems: 'center', padding: '0 24px', fontFamily: F.display, fontWeight: 800, fontSize: 24, zIndex: 2}}>RADAR</div>
					<div style={{whiteSpace: 'nowrap', fontFamily: F.display, fontWeight: 700, fontSize: 26, color: '#111', transform: `translateX(${-((f * 5) % 1800)}px)`}}>{tick.repeat(4)}</div>
				</div>
			)}
			<Invoke id="news" dur={dur} look="news" />
		</AbsoluteFill>
	);
};

// ============ 17 · Mapa e terreno cinematográfico (dados públicos reais) ============
const LAND = feature(land110 as any, (land110 as any).objects.land) as any;
const SP: [number, number] = [-46.63, -23.55], BAY: [number, number] = [-122.27, 37.6];
const TILE = {z: 9, x0: 80, x1: 83, y0: 196, y1: 199};
const lon2x = (lon: number) => ((lon + 180) / 360) * 2 ** TILE.z * 256;
const lat2y = (lat: number) => ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) * 2 ** TILE.z * 256;
const PLACES: [string, number, number, number, number][] = [['São Francisco', -122.42, 37.77, -250, 10], ['Oakland', -122.27, 37.8, 16, -40], ['Palo Alto', -122.14, 37.44, 16, -32], ['San José', -121.89, 37.34, 16, -32], ['Monte Diablo', -121.91, 37.88, 16, -32]];

const useTerrain = () => {
	const [img, setImg] = useState<HTMLCanvasElement | null>(null);
	const [h] = useState(() => delayRender('terreno'));
	useEffect(() => {
		const nx = TILE.x1 - TILE.x0 + 1, ny = TILE.y1 - TILE.y0 + 1;
		const cv = document.createElement('canvas'); cv.width = nx * 256; cv.height = ny * 256;
		const g = cv.getContext('2d', {willReadFrequently: true})!;
		const loads: Promise<void>[] = [];
		for (let x = TILE.x0; x <= TILE.x1; x++) for (let y = TILE.y0; y <= TILE.y1; y++) {
			loads.push(new Promise((res) => { const im = new Image(); im.onload = () => { g.drawImage(im, (x - TILE.x0) * 256, (y - TILE.y0) * 256); res(); }; im.src = staticFile(`data/terrain/${TILE.z}_${x}_${y}.png`); }));
		}
		Promise.all(loads).then(() => {
			const W = cv.width, H = cv.height;
			const d = g.getImageData(0, 0, W, H).data;
			const el = new Float32Array(W * H);
			for (let i = 0; i < W * H; i++) el[i] = d[i * 4] * 256 + d[i * 4 + 1] + d[i * 4 + 2] / 256 - 32768;
			const out = g.createImageData(W, H);
			for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
				const i = y * W + x, e = el[i];
				const dzdx = (el[i + 1] - el[i - 1]) / 2, dzdy = (el[i + W] - el[i - W]) / 2;
				const shade = clamp(0.55 + (-dzdx * 0.7 - dzdy * 0.7) / 90 + 0.15, 0, 1.2);
				let r: number, gg: number, b: number;
				if (e <= 0.5) { const k = clamp(-e / 60); r = 18 - 8 * k; gg = 42 - 12 * k; b = 74 - 10 * k; }
				else { const k = clamp(e / 1200); r = lerp(70, 196, k); gg = lerp(98, 170, k); b = lerp(64, 128, k); r *= shade; gg *= shade; b *= shade; }
				out.data[i * 4] = r; out.data[i * 4 + 1] = gg; out.data[i * 4 + 2] = b; out.data[i * 4 + 3] = 255;
			}
			g.putImageData(out, 0, 0);
			setImg(cv); continueRender(h);
		});
	}, [h]);
	return img;
};

export const GeomapS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const ref = useRef<HTMLCanvasElement>(null);
	const terrain = useTerrain();
	const fontsOk = useFonts();
	// fase 1 (0–200): globo gira de São Paulo para a Bay Area, arco se desenha
	// fase 2 (200–260): mergulho no globo; fase 3 (240+): terreno real, câmera aérea baixando
	const rotK = easeInOut(seg(f, 10, 170));
	const lon = lerp(SP[0], BAY[0], rotK), lat = lerp(SP[1], BAY[1], rotK) * 0.7;
	const dive = easeIn(seg(f, 200, 250));
	const globeScale = lerp(380, 380 * 9, dive);
	const terrK = easeInOut(seg(f, 236, 262));
	const zoom = Math.exp(lerp(Math.log(0.55), Math.log(1.25), easeInOut(seg(f, 240, dur - 40))));
	useLayoutEffect(() => {
		if (!fontsOk) return;
		const g = ref.current!.getContext('2d')!;
		g.fillStyle = '#05070d'; g.fillRect(0, 0, 1920, 1080);
		if (terrK < 1) {
			const proj = geoOrthographic().scale(globeScale).translate([960, 560]).rotate([-lon, -lat]).clipAngle(90);
			const path = geoPath(proj, g);
			g.globalAlpha = 1 - terrK;
			g.beginPath(); path({type: 'Sphere'} as any); g.fillStyle = '#0c1a33'; g.fill();
			g.beginPath(); path(geoGraticule10() as any); g.strokeStyle = 'rgba(120,150,220,0.18)'; g.lineWidth = 1; g.stroke();
			g.beginPath(); path(LAND); g.fillStyle = '#2b3f5e'; g.fill(); g.strokeStyle = 'rgba(200,215,255,0.35)'; g.stroke();
			// arco São Paulo → Bay Area
			const arcK = easeInOut(seg(f, 30, 170));
			const ip = geoInterpolate(SP, BAY);
			const pts = Array.from({length: 80}, (_, i) => ip((i / 79) * arcK));
			g.beginPath(); path({type: 'LineString', coordinates: pts} as any); g.strokeStyle = C.orange; g.lineWidth = 4; g.stroke();
			for (const [p, name] of [[SP, 'São Paulo'], [BAY, 'Bay Area']] as const) {
				const xy = proj(p as [number, number]); if (!xy) continue;
				g.beginPath(); g.arc(xy[0], xy[1], 7, 0, Math.PI * 2); g.fillStyle = C.orange; g.fill();
				g.font = '26px "IBM Plex Mono"'; g.fillStyle = '#e8ecff'; g.fillText(name, xy[0] + 14, xy[1] - 10);
			}
			g.globalAlpha = 1;
		}
		if (terrain && terrK > 0) {
			const ox = TILE.x0 * 256, oy = TILE.y0 * 256;
			const cx = lon2x(BAY[0]) - ox, cy = lat2y(BAY[1]) - oy;
			g.save(); g.globalAlpha = terrK;
			g.translate(960, 560); g.scale(zoom * 1.6, zoom * 1.6); g.translate(-cx, -cy);
			g.drawImage(terrain, 0, 0);
			g.restore();
		}
	}, [f, terrain, globeScale, lon, lat, terrK, zoom, fontsOk]);
	const ox = TILE.x0 * 256, oy = TILE.y0 * 256;
	const cx = lon2x(BAY[0]) - ox, cy = lat2y(BAY[1]) - oy;
	const toScreen = (lo: number, la: number) => [960 + (lon2x(lo) - ox - cx) * zoom * 1.6, 560 + (lat2y(la) - oy - cy) * zoom * 1.6];
	return (
		<AbsoluteFill>
			{/* inclinação de câmera aérea na fase do terreno */}
			<AbsoluteFill style={{transform: `perspective(1600px) rotateX(${lerp(0, 32, terrK)}deg) scale(${1 + 0.25 * terrK})`, transformOrigin: '50% 60%'}}>
				<canvas ref={ref} width={1920} height={1080} />
				{terrK > 0.5 && PLACES.map(([n, lo, la, ox, oy], i) => {
					const [x, y] = toScreen(lo, la);
					const o = softIn(f, 270 + i * 10).opacity;
					return (
						<div key={n} style={{position: 'absolute', left: x, top: y, opacity: o}}>
							<div style={{width: 12, height: 12, borderRadius: 6, background: '#fff', border: `3px solid ${C.orange}`, transform: 'translate(-50%,-50%)'}} />
							<div style={{position: 'absolute', left: ox, top: oy, fontFamily: F.mono, fontSize: 26, color: '#fff', whiteSpace: 'nowrap', textShadow: '0 2px 8px #000'}}>{n}</div>
						</div>
					);
				})}
			</AbsoluteFill>
			<AbsoluteFill style={{background: 'linear-gradient(180deg, rgba(5,7,13,0.75), transparent 30%, transparent 75%, rgba(5,7,13,0.6))'}} />
			<div style={{position: 'absolute', left: 96, top: 90, fontFamily: F.itau, fontWeight: 300, fontSize: 56, color: '#fff', opacity: softIn(f, 20).opacity}}>
				{f < 230 ? 'Da reportagem em São Paulo…' : '…ao vídeo feito na Bay Area'}
			</div>
			<div style={{position: 'absolute', left: 96, bottom: 46, fontFamily: F.mono, fontSize: 18, color: '#9aa6c4'}}>Relevo: AWS Terrain Tiles (Mapzen; SRTM/NED) · Contornos: Natural Earth via world-atlas</div>
			<Invoke id="geomap" dur={dur} look="dark" pos="center" />
		</AbsoluteFill>
	);
};

// ============ 18 · Reconstrução realista (Blender de verdade) ============
export const BlenderS: React.FC<{dur: number}> = ({dur}) => (
	<AbsoluteFill style={{background: '#000'}}>
		<OffthreadVideo src={staticFile('clips/blender.mp4')} muted />
		<div style={{position: 'absolute', left: 96, top: 80, fontFamily: F.mono, fontSize: 22, color: 'rgba(255,255,255,0.75)'}}>reconstrução 3D · Blender 5.2 · Eevee · 450 frames</div>
		<Invoke id="blender" dur={dur} look="terminal" pos="top" />
	</AbsoluteFill>
);
