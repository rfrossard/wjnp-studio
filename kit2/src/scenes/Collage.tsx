import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {drawing, dropIn, easeIn, easeInOut, lerp, seg, tornRect} from '../lib';
import {Flat} from './Flat';

// Formato 3: diário de campo em colagem de papel rasgado, stop-motion a 12 desenhos/s
export const PRINT_IN: [number, number] = [525, 552];
export const TEAR: [number, number] = [780, 800];

const Paper: React.FC<{id: string; w: number; h: number; fill: string; amp?: number; fiber?: boolean; opacity?: number}> = ({
	id, w, h, fill, amp = 8, fiber = true, opacity = 1,
}) => (
	<svg width={w + 24} height={h + 24} style={{position: 'absolute', left: -12, top: -12, overflow: 'visible'}}>
		<g transform="translate(12,12)" opacity={opacity}>
			{fiber && <path d={tornRect(`${id}-f`, w + 6, h + 6, amp * 1.4, 7)} transform="translate(-3,-3)" fill="#fbfaf6" />}
			<path d={tornRect(id, w, h, amp, 9)} fill={fill} />
		</g>
	</svg>
);

type Item = {id: string; f0: number; x: number; y: number; w: number; h: number; rot: number; render: () => React.ReactNode};

const ITEMS: Item[] = [
	{
		id: 'tape', f0: 555, x: 470, y: 150, w: 260, h: 54, rot: -9,
		render: () => <Paper id="tape" w={260} h={54} fill={C.tape} fiber={false} amp={5} opacity={0.85} />,
	},
	{
		id: 'strip', f0: 570, x: 1010, y: 118, w: 760, h: 84, rot: 1.5,
		render: () => (
			<>
				<Paper id="strip" w={760} h={84} fill={C.navy} />
				<div style={{position: 'absolute', left: 34, top: 24, fontFamily: F.mono, fontWeight: 500, fontSize: 30, color: C.ink, letterSpacing: '0.06em', whiteSpace: 'nowrap'}}>
					<span style={{color: C.orange}}>FORMATO 3</span> · DIÁRIO DE CAMPO
				</div>
			</>
		),
	},
	{
		id: 'card', f0: 600, x: 1000, y: 300, w: 790, h: 250, rot: -1.5,
		render: () => (
			<>
				<Paper id="card" w={790} h={250} fill="#ffffff" />
				<div style={{position: 'absolute', left: 48, top: 44, fontFamily: F.itau, fontWeight: 300, fontSize: 54, lineHeight: '70px', color: C.navy, whiteSpace: 'nowrap'}}>
					Bastidores com universidades
					<br />e empresas parceiras
				</div>
			</>
		),
	},
	{
		id: 'sticker', f0: 645, x: 1712, y: 236, w: 100, h: 100, rot: 0,
		render: () => (
			<svg width={100} height={100} style={{overflow: 'visible'}}>
				<defs>
					<pattern id="ht" width={9} height={9} patternUnits="userSpaceOnUse">
						<circle cx={4.5} cy={4.5} r={2.1} fill="#c84d00" />
					</pattern>
				</defs>
				<circle cx={50} cy={50} r={52} fill="#fbfaf6" />
				<circle cx={50} cy={50} r={46} fill={C.orange} />
				<circle cx={50} cy={50} r={46} fill="url(#ht)" opacity={0.55} />
			</svg>
		),
	},
	{
		id: 'notes', f0: 690, x: 180, y: 820, w: 520, h: 80, rot: -2.5,
		render: () => (
			<>
				<Paper id="notes" w={360} h={80} fill={C.paperShade} />
				<div style={{position: 'absolute', left: 30, top: 22, fontFamily: F.mono, fontSize: 28, color: C.navy, letterSpacing: '0.04em', whiteSpace: 'nowrap'}}>
					notas de campo
				</div>
			</>
		),
	},
	{
		id: 'traits', f0: 720, x: 1180, y: 860, w: 600, h: 70, rot: 1.2,
		render: () => (
			<>
				<Paper id="traits" w={600} h={70} fill="#ffffff" />
				<div style={{position: 'absolute', left: 28, top: 20, fontFamily: F.mono, fontSize: 22, color: '#4f5566', whiteSpace: 'nowrap'}}>
					papel rasgado · stop-motion · bastidores
				</div>
			</>
		),
	},
];

// traço "à mão": uma curva com tremor, desenhada por strokeDashoffset, quantizada em 12 desenhos/s
const HandStroke: React.FC<{frame: number; f0: number; dur: number; d: string; width?: number}> = ({frame, f0, dur, d, width = 6}) => {
	const q = (drawing(frame) * 30) / 12;
	const p = easeInOut(seg(q, f0, f0 + dur));
	if (p <= 0) return null;
	return <path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={1 - p} stroke={C.orange} strokeWidth={width} fill="none" strokeLinecap="round" strokeLinejoin="round" />;
};

const Page: React.FC<{frame: number}> = ({frame}) => {
	const pp = easeInOut(seg(frame, PRINT_IN[0], PRINT_IN[1]));
	const lines = Array.from({length: 20}, (_, i) => 120 + i * 46);
	return (
		<AbsoluteFill style={{background: C.stage}}>
			{/* folha do caderno */}
			<div style={{position: 'absolute', left: 60, top: 46}}>
				<Paper id="page" w={1800} h={990} fill={C.paper} amp={10} />
				<svg width={1800} height={990} style={{position: 'absolute', left: 0, top: 0}}>
					{lines.map((y) => (
						<line key={y} x1={40} x2={1760} y1={y} y2={y} stroke="#d5d0c3" strokeWidth={1.5} />
					))}
					<line x1={150} x2={150} y1={20} y2={970} stroke="#f0b89a" strokeWidth={2} />
				</svg>
			</div>
			{/* a cena flat vira uma "foto" colada no caderno */}
			<div
				style={{
					position: 'absolute', left: 0, top: 0, width: 1920, height: 1080,
					transform: `translate(${lerp(0, -385, pp)}px, ${lerp(0, -95, pp)}px) scale(${lerp(1, 0.42, pp)}) rotate(${lerp(0, -3.5, pp)}deg)`,
					boxShadow: `0 0 0 ${lerp(0, 30, pp)}px #fbfaf6, 0 ${lerp(0, 40, pp)}px ${lerp(0, 60, pp)}px rgba(0,0,0,${0.35 * pp})`,
					overflow: 'hidden',
				}}
			>
				<Flat hideLabel={frame >= PRINT_IN[0] + 6} />
			</div>
			{ITEMS.map((it) => {
				const d = dropIn(frame, it.f0, it.id, it.rot);
				if (!d) return null;
				return (
					<div
						key={it.id}
						style={{
							position: 'absolute', left: it.x, top: it.y, width: it.w, height: it.h,
							transform: `translate(${d.dx}px, ${d.dy}px) rotate(${d.rot}deg) scale(${d.s})`,
							filter: 'drop-shadow(0 6px 8px rgba(0,0,0,0.28))',
						}}
					>
						{it.render()}
					</div>
				);
			})}
			<svg width={1920} height={1080} style={{position: 'absolute', left: 0, top: 0}}>
				{/* seta da foto até o cartão */}
				<HandStroke frame={frame} f0={660} dur={24} d="M 905 470 C 930 520, 960 560, 1000 520 M 1000 520 L 978 512 M 1000 520 L 992 498" />
				{/* sublinhado em "parceiras" */}
				<HandStroke frame={frame} f0={735} dur={18} d="M 1300 482 C 1380 492, 1470 488, 1545 480" width={7} />
			</svg>
		</AbsoluteFill>
	);
};

// borda vertical irregular do rasgo
const tearEdge = (side: 'L' | 'R') => {
	const pts: string[] = [];
	for (let y = 0; y <= 1080; y += 12) {
		const x = 960 + (random(`tear-${y}`) - 0.5) * 14 + Math.sin(y / 70) * 22 + Math.sin(y / 23) * 6;
		pts.push(`${x}px ${y}px`);
	}
	return side === 'L' ? `polygon(0 0, ${pts.join(', ')}, 0 1080px)` : `polygon(1920px 0, ${pts.join(', ')}, 1920px 1080px)`;
};

export const Collage: React.FC = () => {
	const frame = useCurrentFrame();
	const k = easeIn(seg(frame, TEAR[0], TEAR[1]));
	if (k <= 0) return <Page frame={frame} />;
	return (
		<AbsoluteFill>
			{(['L', 'R'] as const).map((s) => (
				<AbsoluteFill
					key={s}
					style={{
						clipPath: tearEdge(s),
						transform: `translateX(${(s === 'L' ? -1 : 1) * k * 1150}px) rotate(${(s === 'L' ? -1 : 1) * k * 6}deg)`,
						transformOrigin: s === 'L' ? '0 100%' : '100% 100%',
					}}
				>
					<Page frame={frame} />
				</AbsoluteFill>
			))}
		</AbsoluteFill>
	);
};
