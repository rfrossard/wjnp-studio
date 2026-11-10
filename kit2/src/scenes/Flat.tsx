import React from 'react';
import {AbsoluteFill, random, useCurrentFrame} from 'remotion';
import {C, F} from '../theme';
import {FPS, clamp, easeInOut, lerp, seg, softIn, spring01} from '../lib';
import {FormatLabel} from '../Label';

// Formato 2: flat científico — vetor plano, sombra cel, brilho, tudo flutua
const shade = (hex: string, k: number) => {
	const n = parseInt(hex.slice(1), 16);
	const f = (v: number) => Math.round(clamp(v / 255 + k) * 255);
	return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`;
};

const Sphere: React.FC<{id: string; cx: number; cy: number; r: number; color: string; glow?: string}> = ({
	id, cx, cy, r, color, glow,
}) => (
	<g>
		<defs>
			<clipPath id={`c-${id}`}>
				<circle cx={cx} cy={cy} r={r} />
			</clipPath>
			<radialGradient id={`g-${id}`}>
				<stop offset="0%" stopColor={glow ?? color} stopOpacity={0.45} />
				<stop offset="100%" stopColor={glow ?? color} stopOpacity={0} />
			</radialGradient>
		</defs>
		<circle cx={cx} cy={cy} r={r * 2.6} fill={`url(#g-${id})`} />
		<circle cx={cx} cy={cy} r={r} fill={color} />
		<circle cx={cx + r * 0.3} cy={cy + r * 0.3} r={r} fill={shade(color, -0.2)} clipPath={`url(#c-${id})`} />
		<ellipse cx={cx - r * 0.36} cy={cy - r * 0.4} rx={r * 0.2} ry={r * 0.13} fill={shade(color, 0.18)} />
	</g>
);

const NODES = [
	{x: 520, label: 'Hipótese', pop: 300, labelAt: 345},
	{x: 960, label: 'Experimento', pop: 390, labelAt: 405},
	{x: 1400, label: 'Evidência', pop: 450, labelAt: 465},
];
const Y = 560, R = 78;

export const Flat: React.FC<{hideLabel?: boolean; labels?: string[]}> = ({hideLabel = false, labels}) => {
	const frame = useCurrentFrame();
	const t = (f: number) => (frame - f) / FPS;
	const bob = (k: number) => Math.sin(frame / 38 + k * 1.7) * 7;
	const push = lerp(1, 1.05, easeInOut(seg(frame, 330, 540)));

	// nó 1 nasce do ponto do LED no centro e desliza para a esquerda
	const grow = spring01(t(300), 12, 0.7);
	const slide = easeInOut(seg(frame, 325, 352));
	const n0x = lerp(960, NODES[0].x, slide);
	const n0r = lerp(8, R, grow);

	const stars = Array.from({length: 150}, (_, i) => {
		const x = random(`sx${i}`) * 1920, y = random(`sy${i}`) * 1080;
		const tw = 0.5 + 0.5 * Math.sin(frame / (14 + random(`st${i}`) * 30) + i);
		return <circle key={i} cx={x} cy={y} r={0.7 + random(`sr${i}`) * 1.5} fill={C.ink} opacity={0.12 + 0.45 * tw * random(`so${i}`)} />;
	});

	const arrow = (x1: number, x2: number, f0: number, key: string) => {
		const p = easeInOut(seg(frame, f0, f0 + 24));
		const a = x1 + R + 34, b = x2 - R - 34;
		const xe = lerp(a, b, p);
		return (
			<g key={key} opacity={p > 0 ? 1 : 0}>
				<line x1={a} y1={Y} x2={xe} y2={Y} stroke={C.muted} strokeWidth={3} strokeLinecap="round" />
				{p > 0.95 && <path d={`M${b - 14},${Y - 10} L${b},${Y} L${b - 14},${Y + 10}`} stroke={C.muted} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />}
			</g>
		);
	};

	const pop = (f0: number) => spring01(t(f0), 13, 0.62);
	const n1 = pop(NODES[1].pop), n2 = pop(NODES[2].pop);

	// órbitas do experimento e pulsos da evidência
	const orbit = [0, 1, 2].map((k) => {
		const ang = frame / 22 + (k * Math.PI * 2) / 3;
		return <circle key={k} cx={NODES[1].x + Math.cos(ang) * R * 1.55} cy={Y + bob(1) + Math.sin(ang) * R * 0.5} r={9 * n1} fill={C.orange} />;
	});
	const rings = [0, 1].map((k) => {
		const ph = ((frame - NODES[2].pop + k * 30) % 60) / 60;
		if (frame < NODES[2].pop + 10) return null;
		return <circle key={k} cx={NODES[2].x} cy={Y + bob(2)} r={R * (1.1 + ph * 1.1)} fill="none" stroke={C.orange} strokeWidth={3} opacity={(1 - ph) * 0.7} />;
	});

	return (
		<AbsoluteFill style={{background: `linear-gradient(180deg, #00006e 0%, #00003a 55%, #000018 100%)`}}>
			<AbsoluteFill style={{transform: `scale(${push})`}}>
				<svg width={1920} height={1080}>
					{stars}
					{arrow(NODES[0].x, NODES[1].x, 360, 'a1')}
					{arrow(NODES[1].x, NODES[2].x, 420, 'a2')}
					<Sphere id="n0" cx={n0x} cy={Y + bob(0) * grow} r={n0r} color={C.orange} />
					{n1 > 0 && <Sphere id="n1" cx={NODES[1].x} cy={Y + bob(1)} r={R * n1} color="#e9ecf2" glow="#9fb0ff" />}
					{orbit}
					{rings}
					{n2 > 0 && <Sphere id="n2" cx={NODES[2].x} cy={Y + bob(2)} r={R * n2} color="#f3f4f7" glow={C.orange} />}
				</svg>
				{NODES.map((n, k) => {
					const s = softIn(frame, n.labelAt);
					return (
						<div
							key={n.label}
							style={{
								position: 'absolute', left: n.x - 200, width: 400, top: Y + 130, textAlign: 'center',
								fontFamily: F.itau, fontWeight: 300, fontSize: 46, color: C.ink,
								opacity: s.opacity, transform: `translateY(${s.y + bob(k) * 0.4}px)`, filter: `blur(${s.blur}px)`,
							}}
						>
							{labels?.[k] ?? n.label}
						</div>
					);
				})}
			</AbsoluteFill>
			{!hideLabel && <FormatLabel frame={frame} f0={318} n={2} name="EXPLICADOR DE PESQUISA" traits="ilustração vetorial · luz e escala · calma" />}
		</AbsoluteFill>
	);
};
