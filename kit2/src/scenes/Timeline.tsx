import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {clamp, easeIn, easeInOut, lerp, seg, softIn, spring01} from '../lib';
import {FormatLabel} from '../Label';

// Formato 4: linha do tempo em nanquim sobre papel creme, com selo redondo laranja
const INK = '#16161d';
const Y = 640;
const X0 = 230, X1 = 1690;
const MARKS = [
	{x: 420, year: '2023', note: '3 anos atrás', at: 70},
	{x: 1000, year: '2025', note: '1 ano atrás', at: 95},
	{x: 1480, year: '2026', note: 'hoje', at: 120},
];
export const SEAL = {x: 1480, y: Y, r: 74, at: 165};

// pincelada: polígono com espessura variável
function brush(seed: string, x0: number, x1: number, y: number, w: number) {
	const top: string[] = [], bot: string[] = [];
	for (let x = x0; x <= x1; x += 12) {
		const k = (x - x0) / (x1 - x0);
		const taper = Math.sin(Math.PI * clamp(k * 1.02)) ** 0.35;
		const t = w * taper * (0.75 + 0.35 * Math.sin(x / 90 + random(seed) * 6)) + (random(`${seed}${x}`) - 0.5) * 2.4;
		const yy = y + Math.sin(x / 210) * 6;
		top.push(`${x},${(yy - t / 2).toFixed(1)}`);
		bot.unshift(`${x},${(yy + t / 2).toFixed(1)}`);
	}
	return `M${top.join('L')}L${bot.join('L')}Z`;
}

type Mark = {x: number; year: string; note: string; at: number};
export const Timeline: React.FC<{marks?: Mark[]; headline?: string; sealText?: string; sealX?: number; dive?: boolean}> = ({marks, headline, sealText = 'HOJE', sealX, dive = true}) => {
	const f = useCurrentFrame();
	const MK = marks ?? MARKS;
	const SX = sealX ?? SEAL.x;
	const draw = easeInOut(seg(f, 22, 78));
	const head = softIn(f, 140, 12);
	// selo: carimbo com leve sobre-escala
	const st = (f - SEAL.at) / 30;
	const sealS = f < SEAL.at ? 0 : 1 + 0.5 * Math.exp(-st * 10) * Math.cos(st * 18) * (st < 0.4 ? 1 : 0.3);
	// saída: a câmera mergulha no selo até ele cobrir a tela
	const diveK = dive ? easeIn(seg(f, 200, 240)) : 0;
	const zoom = Math.exp(lerp(0, Math.log(24), diveK));
	return (
		<AbsoluteFill style={{background: '#f2ede1', overflow: 'hidden'}}>
			<AbsoluteFill style={{transform: `scale(${zoom})`, transformOrigin: `${SX}px ${SEAL.y}px`}}>
				<svg width={1920} height={1080}>
					<defs>
						<clipPath id="tl-reveal">
							<rect x={0} y={0} width={X0 + (X1 - X0) * draw + 20} height={1080} />
						</clipPath>
					</defs>
					{/* fibras do papel */}
					{Array.from({length: 90}, (_, i) => (
						<line
							key={i}
							x1={random(`fx${i}`) * 1920}
							y1={random(`fy${i}`) * 1080}
							x2={random(`fx${i}`) * 1920 + 30 * (random(`fd${i}`) - 0.5)}
							y2={random(`fy${i}`) * 1080 + 12 * (random(`fe${i}`) - 0.5)}
							stroke="#d9d1bf"
							strokeWidth={1}
						/>
					))}
					<path d={brush('tl', X0, X1, Y, 16)} fill={INK} clipPath="url(#tl-reveal)" />
					{MK.map((m, i) => {
						const p = spring01((f - m.at) / 30, 16, 0.75);
						if (p <= 0) return null;
						return (
							<g key={m.year}>
								<path d={brush(`mk${i}`, m.x - 4, m.x + 4, Y, 60 * p)} fill={INK} transform={`rotate(90 ${m.x} ${Y})`} />
							</g>
						);
					})}
					{f >= SEAL.at && (
						<g transform={`translate(${SX} ${SEAL.y}) scale(${sealS}) rotate(-8)`}>
							<circle r={SEAL.r} fill={C.orange} />
							<circle r={SEAL.r - 9} fill="none" stroke="#fff" strokeWidth={2.5} opacity={0.9} />
							{/* falhas de tinta do carimbo */}
							{Array.from({length: 14}, (_, i) => (
								<circle key={i} cx={(random(`sp${i}`) - 0.5) * SEAL.r * 1.6} cy={(random(`sq${i}`) - 0.5) * SEAL.r * 1.6} r={1 + random(`sr${i}`) * 3} fill="#f2ede1" opacity={0.55} />
							))}
							<text textAnchor="middle" y={11} fontFamily="Archivo" fontWeight={800} fontSize={32} letterSpacing={2} fill="#fff">
								{sealText}
							</text>
						</g>
					)}
				</svg>
				{MK.map((m) => {
					const s = softIn(f, m.at + 6, 10);
					return (
						<div key={m.year} style={{position: 'absolute', left: m.x - 160, width: 320, top: Y - 230, textAlign: 'center', opacity: s.opacity, transform: `translateY(${s.y}px)`, filter: `blur(${s.blur}px)`}}>
							<div style={{fontFamily: F.itau, fontWeight: 300, fontSize: marks ? 58 : 72, color: INK}}>{m.year}</div>
							<div style={{fontFamily: F.mono, fontSize: 24, color: '#4f5566', marginTop: 4}}>{m.note}</div>
						</div>
					);
				})}
				<div style={{position: 'absolute', top: 820, width: 1920, textAlign: 'center', fontFamily: F.itau, fontWeight: 300, fontSize: 72, color: INK, opacity: head.opacity, transform: `translateY(${head.y}px)`, filter: `blur(${head.blur}px)`}}>
					{headline ?? 'O que mudou desde então?'}
				</div>
			</AbsoluteFill>
			{f < 200 && <FormatLabel frame={f} f0={24} n={4} name="LINHA DO TEMPO" traits="nanquim · selo · contexto" dark={false} />}
		</AbsoluteFill>
	);
};
