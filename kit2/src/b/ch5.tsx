import React from 'react';
import {AbsoluteFill, Freeze, OffthreadVideo, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {Invoke, clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from './core';
import words from './words.json';
import wave from './wave.json';
import sclog from './screencast-log.json';

const FPS = 30;
type W = [string, number, number];
const WORDS = words as W[];
const clip = staticFile('source/clipe.mp4');

// legenda palavra a palavra para um trecho do clipe (t em segundos do clipe)
const Caption: React.FC<{t: number; from: number; to: number; top: number; size?: number; dark?: boolean}> = ({t, from, to, top, size = 40, dark}) => {
	const ws = WORDS.filter(([, s]) => s >= from && s < to);
	const gi = ws.findIndex(([, s, e]) => t >= s - 0.05 && t <= e + 0.1);
	if (gi < 0) return null;
	const g0 = gi - (gi % 6);
	const g = ws.slice(g0, g0 + 6);
	return (
		<div style={{position: 'absolute', top, left: 0, width: 1920, display: 'flex', justifyContent: 'center'}}>
			<div style={{background: dark ? 'rgba(17,21,27,0.86)' : 'rgba(255,255,255,0.92)', borderRadius: 6, padding: '8px 20px', fontFamily: F.display, fontWeight: 700, fontSize: size, color: dark ? '#f3f4f7' : '#14161c'}}>
				{g.map(([w, s], k) => <span key={k} style={{opacity: t >= s - 0.05 ? 1 : 0.3, color: g0 + k === gi ? C.orange : undefined}}>{(k ? ' ' : '') + w}</span>)}
			</div>
		</div>
	);
};

// ============ 20 · B-roll animado com quem fala em PiP (podcast) ============
// trecho 44,5–51,3 s: "aí eu fui atrás do meu cunhado, que trouxe inspiração… festa de aniversário da filha dele"
const BR0 = 44.45, BR1 = 51.4;
export const BrollS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const IN = 20;
	const t = BR0 + (f - IN) / FPS;
	const st = t < 46.0 ? 0 : t < 48.6 ? 1 : 2; // estado da forma, preso às palavras
	const tk = (k: number) => [44.5, 46.0, 48.6][k];
	// uma forma só que muda de tamanho/raio/cor a cada estado (molas)
	const tr = (vals: number[]) => { let v = vals[0]; for (let k = 1; k < 3; k++) v += (vals[k] - vals[k - 1]) * spring01(t - tk(k), 12, 0.82); return v; };
	const w = tr([640, 420, 720]), h = tr([300, 420, 360]), r = tr([24, 210, 28]);
	const col = ['#ffffff', '#ffd23f', '#ffffff'][st];
	const pip = spring01((f - 6) / 30, 12, 0.8);
	return (
		<AbsoluteFill style={{background: '#eef0f4'}}>
			<div style={{position: 'absolute', left: 640 - w / 2, top: 470 - h / 2, width: w, height: h, borderRadius: r, background: col, boxShadow: '0 30px 80px rgba(20,30,60,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden'}}>
				{st === 0 && (
					<div style={{display: 'flex', alignItems: 'center', gap: 28, opacity: clamp((t - 44.6) * 5)}}>
						<div style={{width: 130, height: 130, borderRadius: 65, background: '#c7d2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 56, color: '#3730a3'}}>C</div>
						<div><div style={{fontFamily: F.display, fontWeight: 800, fontSize: 52, color: '#14161c'}}>Cunhado</div><div style={{fontFamily: F.mono, fontSize: 24, color: '#6b7280'}}>contato · ligar</div></div>
					</div>
				)}
				{st === 1 && (
					<svg width={240} height={300} style={{opacity: clamp((t - 46.1) * 5)}}>
						<circle cx={120} cy={120} r={86} fill="#fff" stroke="#14161c" strokeWidth={8} />
						<rect x={84} y={200} width={72} height={46} rx={10} fill="#14161c" />
						{Array.from({length: 8}, (_, i) => { const a = (i / 8) * Math.PI * 2; const k = 0.5 + 0.5 * Math.sin(f / 4 + i); return <line key={i} x1={120 + Math.cos(a) * 104} y1={120 + Math.sin(a) * 104} x2={120 + Math.cos(a) * (122 + 14 * k)} y2={120 + Math.sin(a) * (122 + 14 * k)} stroke="#14161c" strokeWidth={8} strokeLinecap="round" />; })}
						<text x={120} y={290} textAnchor="middle" fontFamily="Archivo" fontWeight={800} fontSize={34} fill="#14161c">inspiração</text>
					</svg>
				)}
				{st === 2 && (
					<div style={{display: 'flex', gap: 36, alignItems: 'center', opacity: clamp((t - 48.7) * 5)}}>
						<div style={{width: 180, borderRadius: 18, overflow: 'hidden', border: '4px solid #14161c'}}>
							<div style={{background: C.orange, color: '#fff', textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 30, padding: 8}}>SÁB</div>
							<div style={{textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 96, color: '#14161c'}}>12</div>
						</div>
						<div><div style={{fontFamily: F.display, fontWeight: 800, fontSize: 48, color: '#14161c'}}>Festa de aniversário</div><div style={{fontFamily: F.mono, fontSize: 24, color: '#6b7280'}}>da filha dele</div></div>
					</div>
				)}
			</div>
			{/* quem fala, em PiP redondo, seguindo o áudio original */}
			<div style={{position: 'absolute', left: 1330, top: 230, width: 460, height: 460, borderRadius: 230, overflow: 'hidden', transform: `scale(${pip})`, boxShadow: `0 0 0 10px #fff, 0 0 0 14px ${C.orange}, 0 30px 80px rgba(20,30,60,0.25)`}}>
				<Sequence from={IN} layout="none">
					<OffthreadVideo src={clip} trimBefore={Math.round(BR0 * FPS)} volume={1.5} style={{width: 818, height: 460, marginLeft: -300, objectFit: 'cover'}} />
				</Sequence>
			</div>
			<Caption t={t} from={BR0} to={BR1} top={800} />
			<div style={{position: 'absolute', right: 96, bottom: 40, fontFamily: F.mono, fontSize: 18, color: '#6b7280'}}>Imagens: TV Globo / Jornal Nacional</div>
			<Invoke id="broll" dur={dur} look="light" pos="top" />
		</AbsoluteFill>
	);
};

// ============ 21 · Pacote do episódio: audiograma + capítulos + cortes verticais ============
const PD0 = 51.4;
const CHAPS: [string, string, number][] = [['00:00', 'O projeto no Hospital das Clínicas', 0], ['00:19', 'A festa e o guardanapo', 19], ['00:39', 'Cinco dias para uma solução', 39], ['00:51', 'O esboço que virou projeto', 51]];
export const PodcastS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const IN = 20;
	const t = PD0 + (f - IN) / FPS;
	const wv = wave as number[];
	const wi = clamp(Math.floor(((f - IN) / FPS) * FPS), 0, wv.length - 1);
	const prog = clamp((t - 0) / 64);
	return (
		<AbsoluteFill style={{background: 'linear-gradient(135deg, #12141c, #1d1430)'}}>
			{/* capa */}
			<div style={{position: 'absolute', left: 96, top: 110, width: 420, height: 420, borderRadius: 18, background: `linear-gradient(140deg, ${C.orange}, #8a2be2)`, padding: 34, boxSizing: 'border-box', boxShadow: '0 30px 80px rgba(0,0,0,0.5)', transform: `scale(${0.96 + 0.04 * (wv[wi] ?? 0)})`}}>
				<div style={{fontFamily: F.mono, fontSize: 22, color: 'rgba(255,255,255,0.8)'}}>PODCAST · EP. 01</div>
				<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 52, lineHeight: '56px', color: '#fff', marginTop: 150}}>Do guardanapo ao protótipo</div>
			</div>
			{/* audiograma com o áudio real (RMS medido do clipe) */}
			<svg width={900} height={220} style={{position: 'absolute', left: 580, top: 200}}>
				{Array.from({length: 60}, (_, i) => {
					const v = wv[clamp(wi - 30 + i, 0, wv.length - 1)] ?? 0;
					const h = 10 + v * 200;
					return <rect key={i} x={i * 15} y={110 - h / 2} width={9} height={h} rx={4} fill={i === 30 ? C.orange : i < 30 ? '#f3f4f7' : '#5b5f75'} />;
				})}
			</svg>
			<div style={{position: 'absolute', left: 580, top: 440, width: 900, height: 8, borderRadius: 4, background: '#3a3d52'}}>
				<div style={{width: `${prog * 100}%`, height: 8, borderRadius: 4, background: C.orange}} />
			</div>
			{/* capítulos estilo YouTube */}
			<div style={{position: 'absolute', left: 580, top: 480, width: 900}}>
				{CHAPS.map(([ts, name, s], i) => {
					const on = t >= s && (i === CHAPS.length - 1 || t < CHAPS[i + 1][2]);
					return <div key={ts} style={{display: 'flex', gap: 18, padding: '8px 0', fontFamily: F.display, fontWeight: on ? 800 : 500, fontSize: 28, color: on ? '#fff' : '#8a8fa6', opacity: softIn(f, 30 + i * 8).opacity}}><span style={{fontFamily: F.mono, color: on ? C.orange : '#6b7090'}}>{ts}</span>{name}</div>;
				})}
			</div>
			{/* cortes verticais (Shorts) gerados do mesmo trecho */}
			{[0, 1].map((k) => {
				const s = spring01((f - 60 - k * 12) / 30, 12, 0.8);
				return (
					<div key={k} style={{position: 'absolute', left: 1470 + k * 150, top: 130 + k * 70, width: 230, height: 409, borderRadius: 18, overflow: 'hidden', border: '4px solid #fff', transform: `scale(${s}) rotate(${k ? 4 : -3}deg)`, boxShadow: '0 20px 60px rgba(0,0,0,0.5)'}}>
						<Sequence from={IN} layout="none">
							<OffthreadVideo src={clip} trimBefore={Math.round((k ? 41 : 44.6) * FPS)} muted style={{width: 727, height: 409, marginLeft: k ? -330 : -360, objectFit: 'cover'}} />
						</Sequence>
						<div style={{position: 'absolute', bottom: 40, width: '100%', textAlign: 'center', fontFamily: F.display, fontWeight: 800, fontSize: 30, color: '#ffd23f', WebkitTextStroke: '3px #000', paintOrder: 'stroke fill'}}>{k ? 'CINCO DIAS' : 'O CUNHADO'}</div>
					</div>
				);
			})}
			{/* áudio do episódio */}
			<Sequence from={IN} layout="none"><OffthreadVideo src={clip} trimBefore={Math.round(PD0 * FPS)} volume={1.5} style={{display: 'none'}} /></Sequence>
			<Caption t={t} from={PD0} to={61} top={840} dark />
			<div style={{position: 'absolute', right: 96, bottom: 30, fontFamily: F.mono, fontSize: 18, color: '#8a8fa6'}}>Imagens/áudio: TV Globo / Jornal Nacional · episódio ilustrativo</div>
			<Invoke id="podcast" dur={dur} look="dark" pos="top" />
		</AbsoluteFill>
	);
};

// ============ 22 · Screencast real com zoom nos cliques ============
type LogF = {t: number; x: number; y: number; click: boolean};
const LOG = (sclog as {frames: LogF[]}).frames;
const VW = 1440, VH = 900;
const WIN = {x: 210, y: 130, w: 1500, h: 937 - 120}; // janela na tela (16:10 aprox.)
export const ScreencastS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const IN = 14, REC = 450;
	const t = (f - IN) / FPS;
	// posição do cursor (do log real) no tempo t
	const at = (tt: number) => { let p = LOG[0]; for (const q of LOG) { if (q.t <= tt) p = q; else break; } return p; };
	const p = at(clamp(t, 0, 14.99));
	// plano de câmera: zoom 1,7× perto de cada clique, suavizado
	const clicks = LOG.filter((q) => q.click).map((q) => q.t);
	let z = 1;
	for (const c of clicks) { const d = t - c; z = Math.max(z, 1 + 0.7 * (d > -0.8 && d < 1.6 ? easeInOut(clamp((d + 0.8) / 0.6)) * (d < 1.0 ? 1 : 1 - (d - 1.0) / 0.6) : 0)); }
	const sx = WIN.w / VW, sy = (WIN.h) / VH;
	const fx = WIN.x + p.x * sx, fy = WIN.y + 44 + p.y * sy * 0.95;
	const camX = lerp(960, fx, (z - 1) / 0.7), camY = lerp(540, fy, (z - 1) / 0.7);
	const ring = clicks.some((c) => t - c >= 0 && t - c < 0.35);
	const out = easeIn(seg(f, dur - 30, dur - 14));
	return (
		<AbsoluteFill style={{background: 'linear-gradient(135deg, #ffb48a, #c49bff 55%, #7fc8ff)'}}>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - camX * z}px, ${540 - camY * z}px) scale(${z * (1 - out * 0.5)})`}}>
				<div style={{position: 'absolute', left: WIN.x, top: WIN.y, width: WIN.w, height: WIN.h + 44, borderRadius: 14, overflow: 'hidden', boxShadow: '0 40px 120px rgba(40,20,80,0.35)', background: '#fff'}}>
					<div style={{height: 44, background: '#ecedf0', display: 'flex', alignItems: 'center', gap: 8, paddingLeft: 16}}>
						{['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => <span key={c} style={{width: 13, height: 13, borderRadius: 7, background: c}} />)}
						<span style={{marginLeft: 20, fontFamily: F.mono, fontSize: 15, color: '#666'}}>estudio.local/podcast/novo</span>
					</div>
					<Sequence from={IN} durationInFrames={REC} layout="none">
						<OffthreadVideo src={staticFile('clips/screencast.mp4')} muted style={{width: WIN.w, height: WIN.h, objectFit: 'cover', objectPosition: 'top'}} />
					</Sequence>
					{f >= IN + REC && (
						<Freeze frame={REC - 1}>
							<Sequence from={0} layout="none"><OffthreadVideo src={staticFile('clips/screencast.mp4')} muted style={{width: WIN.w, height: WIN.h, objectFit: 'cover', objectPosition: 'top'}} /></Sequence>
						</Freeze>
					)}
				</div>
				{/* cursor grande redesenhado a partir do log real */}
				<svg width={60} height={70} style={{position: 'absolute', left: fx - 6, top: fy - 4, overflow: 'visible'}}>
					{ring && <circle cx={6} cy={4} r={30} fill="none" stroke={C.orange} strokeWidth={4} opacity={0.8} />}
					<path d="M6 4 L6 52 L18 41 L27 62 L36 58 L27 37 L44 37 Z" fill="#111" stroke="#fff" strokeWidth={3} strokeLinejoin="round" />
				</svg>
			</div>
			<div style={{position: 'absolute', left: 96, top: 40, fontFamily: F.mono, fontSize: 20, color: 'rgba(20,10,40,0.6)'}}>gravação real: Chrome headless + eventos de mouse e teclado</div>
			<Invoke id="screencast" dur={dur} look="terminal" pos="center" />
		</AbsoluteFill>
	);
};

// ============ 23 · Demo calmo de produto (UI recriada, câmera de perto) ============
export const DemoS: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const prompt = '/motion-director vídeo pessoal com todos os estilos';
	const typed = prompt.slice(0, Math.floor(clamp((f - 70) / 55) * prompt.length));
	const rows = [['abertura', 'hype'], ['explicação', 'flat'], ['dados', 'datastory'], ['entrevista', 'archival'], ['fecho', 'mosaic']];
	// câmera: abre numa frase, empurra para o campo de texto, acompanha, recua para o plano
	const cam = (() => {
		const keys: [number, number, number, number][] = [[0, 960, 540, 1.6], [60, 960, 520, 1.6], [80, 700, 560, 1.9], [130, 1180, 560, 1.9], [160, 960, 600, 1.0], [300, 960, 600, 1.05]];
		let k = keys[0];
		for (let i = 1; i < keys.length; i++) if (f >= keys[i - 1][0]) { const a = keys[i - 1], b = keys[i]; const u = easeInOut(seg(f, a[0], b[0])); k = [0, lerp(a[1], b[1], u), lerp(a[2], b[2], u), lerp(a[3], b[3], u)]; }
		return k;
	})();
	return (
		<AbsoluteFill style={{background: '#fafaf7'}}>
			<div style={{position: 'absolute', inset: 0, transformOrigin: '0 0', transform: `translate(${960 - cam[1] * cam[3]}px, ${540 - cam[2] * cam[3]}px) scale(${cam[3]})`}}>
				<div style={{position: 'absolute', top: 300, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 64, color: '#14161c', opacity: softIn(f, 6).opacity * (1 - clamp((f - 150) / 14))}}>Um pedido.</div>
				<div style={{position: 'absolute', left: 460, top: 520, width: 1000, height: 84, borderRadius: 42, background: '#fff', border: '2px solid #e3e6eb', boxShadow: '0 10px 30px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', padding: '0 34px', fontFamily: F.mono, fontSize: 26, color: '#14161c', whiteSpace: 'pre'}}>
					<span style={{color: C.orange}}>{typed.slice(0, 16)}</span>{typed.slice(16)}<span style={{opacity: f % 20 < 10 ? 1 : 0}}>|</span>
				</div>
				{rows.map(([a, b], i) => {
					const s = softIn(f, 170 + i * 10, 10);
					return (
						<div key={a} style={{position: 'absolute', left: 560, top: 640 + i * 62, width: 800, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #e3e6eb', opacity: s.opacity, transform: `translateY(${s.y}px)`, fontFamily: F.display, fontSize: 26, color: '#14161c'}}>
							<span>{String(i + 1).padStart(2, '0')} · {a}</span><span style={{fontFamily: F.mono, color: C.orange}}>{b}</span>
						</div>
					);
				})}
			</div>
			<Invoke id="demo" dur={dur} look="light" pos="top" />
		</AbsoluteFill>
	);
};
