import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F, SAFE} from '../theme';
import {easeInOut, lerp, seg, softIn} from '../lib';
import {FormatLabel} from '../Label';
import {DATA_LINE_X} from './DataStory';

// Formato 8: "paper explicado" no estilo 03 do Hub — linhas finas laranja e brancas desenhadas sobre preto
const DOC = {x: 1060, y: 170, w: 560, h: 760};
const draw = (f: number, a: number, b: number) => 1 - easeInOut(seg(f, a, b));

const Stroke: React.FC<{d: string; f: number; a: number; b: number; color?: string; w?: number}> = ({d, f, a, b, color = C.ink, w = 2.5}) => (
	<path d={d} pathLength={1} strokeDasharray={1} strokeDashoffset={draw(f, a, b)} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" strokeLinejoin="round" />
);

export const Paper: React.FC = () => {
	const f = useCurrentFrame();
	// entrada: a linha de tela cheia vinda do data story encolhe até a borda esquerda do documento
	const ink = easeInOut(seg(f, 0, 22));
	const lx = lerp(DATA_LINE_X, DOC.x, ink);
	const ly0 = lerp(0, DOC.y, ink), ly1 = lerp(1080, DOC.y + DOC.h, ink);
	// saída: o contorno do documento vira o quadro 16:9 da entrevista
	const ex = easeInOut(seg(f, 206, 240));
	const R = {x: lerp(DOC.x, 0, ex), y: lerp(DOC.y, 0, ex), w: lerp(DOC.w, 1920, ex), h: lerp(DOC.h, 1080, ex)};
	const fade = 1 - ex;
	const head = softIn(f, 120, 12);
	const tl = DOC.x + 50;
	return (
		<AbsoluteFill style={{background: C.stage}}>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				{f < 24 && <line x1={lx} x2={lx} y1={ly0} y2={ly1} stroke={C.orange} strokeWidth={lerp(4, 2.5, ink)} />}
				{f >= 22 && (
					<path
						d={`M${R.x},${R.y} L${R.x + R.w},${R.y} L${R.x + R.w},${R.y + R.h} L${R.x},${R.y + R.h} Z`}
						pathLength={1} strokeDasharray={1} strokeDashoffset={f < 206 ? draw(f, 22, 52) : 0}
						stroke={ex > 0 ? C.ink : C.ink} strokeWidth={2.5} fill="none"
					/>
				)}
				<g opacity={fade}>
					{/* título do artigo */}
					<Stroke f={f} a={44} b={64} d={`M${tl},${DOC.y + 70} L${tl + 400},${DOC.y + 70}`} color={C.orange} w={6} />
					<Stroke f={f} a={52} b={70} d={`M${tl},${DOC.y + 108} L${tl + 300},${DOC.y + 108}`} color={C.orange} w={6} />
					{/* autores */}
					<Stroke f={f} a={60} b={74} d={`M${tl},${DOC.y + 150} L${tl + 220},${DOC.y + 150}`} color={C.muted} w={2} />
					{/* corpo */}
					{Array.from({length: 7}, (_, i) => (
						<Stroke key={i} f={f} a={66 + i * 3} b={86 + i * 3} d={`M${tl},${DOC.y + 210 + i * 30} L${tl + (i % 3 === 2 ? 330 : 460)},${DOC.y + 210 + i * 30}`} w={2} />
					))}
					{/* diagrama: três nós e setas */}
					{[0, 1, 2].map((k) => {
						const cx = tl + 60 + k * 170, cy = DOC.y + 560;
						return (
							<g key={k}>
								<Stroke f={f} a={96 + k * 10} b={118 + k * 10} d={`M${cx + 34},${cy} A34,34 0 1,1 ${cx + 33.9},${cy - 0.1}`} color={k === 2 ? C.orange : C.ink} w={3} />
								{k < 2 && <Stroke f={f} a={110 + k * 10} b={124 + k * 10} d={`M${cx + 44},${cy} L${cx + 124},${cy} M${cx + 112},${cy - 9} L${cx + 124},${cy} L${cx + 112},${cy + 9}`} w={2.5} />}
							</g>
						);
					})}
					<Stroke f={f} a={120} b={136} d={`M${tl},${DOC.y + 660} L${tl + 420},${DOC.y + 660}`} w={2} />
					{/* chamadas laterais */}
					<Stroke f={f} a={140} b={160} d={`M${tl + 400},${DOC.y + 560} C ${DOC.x + DOC.w + 40},${DOC.y + 560} ${DOC.x + DOC.w + 40},${DOC.y + 470} ${DOC.x + DOC.w + 90},${DOC.y + 470}`} color={C.orange} w={2.5} />
					<Stroke f={f} a={150} b={170} d={`M${tl + 460},${DOC.y + 90} C ${DOC.x + DOC.w + 40},${DOC.y + 90} ${DOC.x + DOC.w + 40},${DOC.y + 160} ${DOC.x + DOC.w + 90},${DOC.y + 160}`} color={C.ink} w={2} />
				</g>
			</svg>
			<div style={{position: 'absolute', left: DOC.x + DOC.w + 100, top: DOC.y + 140, fontFamily: F.mono, fontSize: 24, color: C.ink, opacity: softIn(f, 166).opacity * fade}}>pergunta</div>
			<div style={{position: 'absolute', left: DOC.x + DOC.w + 100, top: DOC.y + 450, fontFamily: F.mono, fontSize: 24, color: C.orange, opacity: softIn(f, 158).opacity * fade}}>resultado</div>
			<div style={{position: 'absolute', left: SAFE, top: 470, width: 860, fontFamily: F.itau, fontWeight: 300, fontSize: 76, lineHeight: '86px', color: C.ink, opacity: head.opacity * fade, transform: `translateY(${head.y}px)`, filter: `blur(${head.blur}px)`}}>
				Um artigo,
				<br />
				explicado em traço
			</div>
			{f < 206 && <FormatLabel frame={f} f0={10} n={8} name="PAPER EXPLICADO" traits="estilo 03 · traço que se desenha · precisão" />}
		</AbsoluteFill>
	);
};
