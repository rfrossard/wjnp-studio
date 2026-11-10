import React, {useEffect, useLayoutEffect, useRef, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, random, useCurrentFrame} from 'remotion';
import {fontsReady} from '../fonts';
import {C} from '../theme';
import {BEAT, clamp, easeInOut, lerp, seg} from '../lib';
import {FormatLabel} from '../Label';

// Formato 1: painel de LED com pontos REDONDOS (a marca proíbe quadrados soltos)
const W = 1920, H = 1080, PITCH = 10, COLS = W / PITCH, ROWS = H / PITCH;
type Seg = {t: string; hi?: boolean};
type Card = {f0: number; f1: number; lines: Seg[][]};

export type {Card};
export const LED_CARDS: Card[] = [
	{f0: 60, f1: 120, lines: [[{t: 'E SE A INTELIGÊNCIA'}], [{t: 'FOR '}, {t: 'ABUNDANTE', hi: true}, {t: ','}]]},
	{f0: 120, f1: 180, lines: [[{t: 'QUAL SERÁ O NOSSO'}], [{t: 'DIFERENCIAL?', hi: true}]]},
	{f0: 180, f1: 240, lines: [[{t: 'VAMOS FAZER O MESMO'}], [{t: 'DE '}, {t: '1 ANO', hi: true}, {t: ' ATRÁS?'}]]},
	{f0: 240, f1: 300, lines: [[{t: 'DE '}, {t: '3 ANOS', hi: true}, {t: ' ATRÁS?'}]]},
];
const CONVERGE: [number, number] = [282, 299];

// rasteriza o cartão na resolução da grade: 0 = apagado, 1 = branco, 2 = laranja
function rasterize(card: Card): Uint8Array {
	const cv = document.createElement('canvas');
	cv.width = COLS; cv.height = ROWS;
	const ctx = cv.getContext('2d', {willReadFrequently: true})!;
	const fs = 15;
	ctx.font = `800 ${fs}px Archivo`;
	ctx.textBaseline = 'alphabetic';
	const lh = 20;
	const top = ROWS / 2 - (card.lines.length * lh) / 2 + 15;
	card.lines.forEach((line, li) => {
		const full = line.map((s) => s.t).join('');
		const tw = ctx.measureText(full).width;
		let x = (COLS - tw) / 2;
		for (const s of line) {
			ctx.fillStyle = s.hi ? '#ff0000' : '#ffffff';
			ctx.fillText(s.t, x, top + li * lh);
			x += ctx.measureText(s.t).width;
		}
	});
	const px = ctx.getImageData(0, 0, COLS, ROWS).data;
	const out = new Uint8Array(COLS * ROWS);
	for (let i = 0; i < COLS * ROWS; i++) {
		const r = px[i * 4], g = px[i * 4 + 1], a = px[i * 4 + 3];
		if (a > 110) out[i] = r > 200 && g < 120 ? 2 : 1;
	}
	return out;
}

export const Led: React.FC<{cards?: Card[]; converge?: [number, number]}> = ({cards, converge}) => {
	const frame = useCurrentFrame();
	const CARDS = cards ?? LED_CARDS;
	const CONV = converge ?? CONVERGE;
	const ref = useRef<HTMLCanvasElement>(null);
	const [masks, setMasks] = useState<Uint8Array[] | null>(null);
	const [handle] = useState(() => delayRender('LED: fontes e rasterização'));

	useEffect(() => {
		fontsReady.then(() => {
			setMasks(CARDS.map(rasterize));
			continueRender(handle);
		});
	}, [handle]);

	useLayoutEffect(() => {
		const cv = ref.current;
		if (!cv || !masks) return;
		const ctx = cv.getContext('2d')!;
		ctx.fillStyle = C.stage;
		ctx.fillRect(0, 0, W, H);
		const ci = CARDS.findIndex((c) => frame >= c.f0 && frame < c.f1);
		const card = CARDS[ci];
		const mask = ci >= 0 ? masks[ci] : null;
		// pulso de brilho em cada beat
		const sinceBeat = (frame % BEAT) / BEAT;
		const pulse = 1 + 0.22 * Math.exp(-sinceBeat * 6);
		const conv = seg(frame, CONV[0], CONV[1]);
		const sweep = card ? clamp((frame - card.f0) / 8) : 0; // varredura da esquerda p/ direita
		const isLast = ci === CARDS.length - 1;

		for (let r = 0; r < ROWS; r++) {
			for (let c = 0; c < COLS; c++) {
				const i = r * COLS + c;
				const x = c * PITCH + PITCH / 2, y = r * PITCH + PITCH / 2;
				let v = mask ? mask[i] : 0;
				if (v && c / COLS > sweep) v = 0;
				// saída: pontos apagam em ordem aleatória nos 3 frames finais do cartão (menos no último)
				if (v && card && !isLast && frame >= card.f1 - 3) {
					if (random(`off-${i}`) < (frame - (card.f1 - 3) + 1) / 3) v = 0;
				}
				if (!v || (isLast && conv > 0)) {
					ctx.fillStyle = '#141922';
					ctx.beginPath();
					ctx.arc(x, y, 2.6, 0, Math.PI * 2);
					ctx.fill();
					continue;
				}
				const col = v === 2 ? C.orange : C.ink;
				ctx.globalAlpha = 0.16 * pulse;
				ctx.fillStyle = col;
				ctx.beginPath();
				ctx.arc(x, y, 5.6, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = clamp(0.9 * pulse);
				ctx.beginPath();
				ctx.arc(x, y, 3.7, 0, Math.PI * 2);
				ctx.fill();
				ctx.globalAlpha = 1;
			}
		}
		// passagem: os pontos acesos do último cartão convergem para um único ponto laranja
		if (isLast && conv > 0 && mask) {
			for (let i = 0; i < COLS * ROWS; i++) {
				if (!mask[i]) continue;
				const c = i % COLS, r = Math.floor(i / COLS);
				const d = random(`cv-${i}`) * 0.35;
				const k = easeInOut(clamp((conv - d) / (1 - d)));
				const x = lerp(c * PITCH + PITCH / 2, W / 2, k);
				const y = lerp(r * PITCH + PITCH / 2, H / 2, k);
				ctx.globalAlpha = 1 - k * 0.85;
				ctx.fillStyle = mask[i] === 2 ? C.orange : C.ink;
				ctx.beginPath();
				ctx.arc(x, y, 3.7, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.globalAlpha = 1;
			ctx.fillStyle = C.orange;
			ctx.beginPath();
			ctx.arc(W / 2, H / 2, lerp(0, 8, conv), 0, Math.PI * 2);
			ctx.fill();
		}
	}, [frame, masks, CARDS, CONV]);

	return (
		<AbsoluteFill>
			<canvas ref={ref} width={W} height={H} />
			{frame < CONV[0] && (
				<FormatLabel
					frame={frame}
					f0={64}
					n={1}
					name="TEASER DE HIPÓTESE"
					traits="pontos de LED · tipografia no beat · energia"
				/>
			)}
		</AbsoluteFill>
	);
};
