// Quadro branco v2: referência = explicadores de quadro branco da coleção (papel pontilhado, selos numerados,
// traço com pressão, hachura de marca-texto, lápis desenhando, apresentadora Open Peeps em vez de boneco feito à mão).
import React, {useMemo} from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import Peep from 'react-peeps';
import {Invoke, clamp, easeInOut, lerp, seg, spring01} from './core';
import {Pencil, Rough, Written, rCircle, rLine, rPath, rRect, textStrokes, useWritten} from './hand';

const INK = '#1b1b1f';
const YEL = '#ffc93c', ORG = '#ff6a2b', BLU = '#3a7bd5', GRN = '#2fa36b';
type W = {text: string; font: 'felix' | 'read'; x: number; y: number; size: number; a: number; b: number; color?: string};

export const SketchV2: React.FC<{dur: number}> = ({dur}) => {
	const f = useCurrentFrame();
	const TL = {x: 620, y: 320, w: 1180, h: 170, n: 8};
	const segW = TL.w / TL.n;
	const ACC = [{i: 3, c: ORG, t: 'um número → data story'}, {i: 5, c: BLU, t: 'uma fala → editorial'}, {i: 7, c: GRN, t: 'um lugar → mapa'}];
	const words: W[] = [
		{text: 'Escolha um estilo-base', font: 'felix', x: 635, y: 190, size: 92, a: 45, b: 118},
		{text: 'ele carrega quase todo o vídeo', font: 'read', x: 640, y: 252, size: 40, a: 120, b: 165, color: '#4b4f58'},
		{text: 'estilo-base', font: 'read', x: 660, y: 568, size: 34, a: 292, b: 318},
		{text: 'Acentos só onde ajudam', font: 'felix', x: 635, y: 715, size: 92, a: 350, b: 420},
		{text: 'até 3 por vídeo. mais que isso, só em catálogo...', font: 'read', x: 640, y: 778, size: 40, a: 425, b: 480, color: '#4b4f58'},
		{text: '(como este!)', font: 'felix', x: 1480, y: 850, size: 62, a: 482, b: 502, color: '#d62828'},
		...ACC.map((ac, k) => ({text: ac.t, font: 'read' as const, x: TL.x + ac.i * segW + segW / 2 - 118, y: 568, size: 24, a: 418 + k * 14, b: 440 + k * 14, color: ac.c})),
		{text: '1', font: 'felix', x: 566, y: 180, size: 66, a: 36, b: 44},
		{text: '2', font: 'felix', x: 564, y: 705, size: 66, a: 341, b: 349},
	];
	const R = useMemo(() => ({
		badge1: rCircle(578, 158, 80, {fill: YEL, fillStyle: 'solid', seed: 3}),
		badge2: rCircle(576, 683, 80, {fill: YEL, fillStyle: 'solid', seed: 4}),
		box: rRect(TL.x, TL.y, TL.w, TL.h, {seed: 7, strokeWidth: 3.5}),
		divs: Array.from({length: TL.n - 1}, (_, i) => rLine(TL.x + (i + 1) * segW, TL.y + 6, TL.x + (i + 1) * segW + 3, TL.y + TL.h - 6, {seed: 20 + i, strokeWidth: 2.5})),
		base: Array.from({length: TL.n}, (_, i) => rRect(TL.x + i * segW + 10, TL.y + 14, segW - 20, TL.h - 28, {seed: 40 + i, stroke: 'none', fill: YEL, fillStyle: 'hachure', hachureGap: 9, fillWeight: 4, hachureAngle: -41})),
		acc: ACC.map((ac, k) => rRect(TL.x + ac.i * segW + 10, TL.y + 14, segW - 20, TL.h - 28, {seed: 70 + k, stroke: 'none', fill: ac.c, fillStyle: 'cross-hatch', hachureGap: 8, fillWeight: 3.5})),
		accArrows: ACC.map((ac, k) => rPath(`M${TL.x + ac.i * segW + segW / 2} ${TL.y + TL.h + 8} L${TL.x + ac.i * segW + segW / 2 + 3} ${TL.y + TL.h + 44}`, {seed: 90 + k, stroke: ac.c, strokeWidth: 2.5})),
		play: rPath(`M${TL.x - 70} ${TL.y + 40} L${TL.x - 20} ${TL.y + 70} L${TL.x - 70} ${TL.y + 100} Z`, {seed: 5, fill: ORG, fillStyle: 'solid'}),
		baseArrow: rPath(`M${TL.x + 30} ${TL.y + TL.h + 50} Q ${TL.x + 20} ${TL.y + TL.h + 30} ${TL.x + 60} ${TL.y + TL.h + 10}`, {seed: 11, strokeWidth: 2.5}),
		underline: rLine(1470, 866, 1840, 861, {seed: 13, stroke: '#d62828', strokeWidth: 3}),
	}), []);
	// ponta do lápis: o que estiver sendo escrito/desenhado agora
	let tip: [number, number] | null = null;
	for (const w of words) if (f >= w.a && f < w.b) tip = useWritten(textStrokes(w.text, w.font, w.x, w.y, w.size, w.x + w.y), (f - w.a) / (w.b - w.a), 2).tip;
	const kBox = seg(f, 165, 205), kDiv = seg(f, 205, 235), kBase = seg(f, 238, 292);
	if (!tip && f >= 165 && f < 205) tip = [TL.x + TL.w * kBox, TL.y];
	if (!tip && f >= 238 && f < 292) tip = [TL.x + TL.w * kBase, TL.y + TL.h / 2];
	// apresentadora: entra de baixo, aponta, e sorri na piada
	const enter = spring01((f - 4) / 30, 9, 0.75);
	const face = f >= 482 ? 'SmileBig' : f >= 340 ? 'Explaining' : f >= 100 ? 'Calm' : 'Smile';
	const bob = Math.sin(f / 22) * 4;
	const er = easeInOut(seg(f, dur - 40, dur - 16));
	return (
		<AbsoluteFill style={{background: '#f7f2e7'}}>
			{/* papel pontilhado + vinheta suave */}
			<AbsoluteFill style={{backgroundImage: 'radial-gradient(#d9d2c3 1.6px, transparent 1.7px)', backgroundSize: '34px 34px', opacity: 0.9}} />
			<AbsoluteFill style={{background: 'radial-gradient(ellipse at 50% 45%, transparent 60%, rgba(120,100,70,0.12))'}} />
			<div style={{position: 'absolute', left: -105, top: 350 + (1 - enter) * 800 + bob, width: 700, height: 750}}>
				<Peep style={{width: 700, height: 750}} viewBox={{x: '-60', y: '-20', width: '1400', height: '1500'}} body="PointingFingerWB" face={face as any} hair="MediumBangs" strokeColor={INK} backgroundColor="#fff" />
			</div>
			<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
				<Rough paths={R.badge1} k={seg(f, 20, 36)} />
				<Rough paths={R.badge2} k={seg(f, 330, 341)} />
				<Rough paths={R.play} k={seg(f, 160, 170)} />
				<Rough paths={R.box} k={kBox} />
				{R.divs.map((d, i) => <Rough key={i} paths={d} k={clamp(kDiv * 7 - i)} />)}
				{R.base.map((d, i) => <Rough key={i} paths={d} k={clamp(kBase * 8 - i)} />)}
				{R.acc.map((d, i) => <Rough key={i} paths={d} k={seg(f, 362 + i * 16, 382 + i * 16)} />)}
				<Rough paths={R.baseArrow} k={seg(f, 284, 296)} />
				{R.accArrows.map((d, i) => <Rough key={i} paths={d} k={seg(f, 408 + i * 14, 418 + i * 14)} />)}
				<Rough paths={R.underline} k={seg(f, 500, 510)} />
				{words.map((w, i) => <Written key={i} text={w.text} font={w.font} x={w.x} y={w.y} size={w.size} k={(f - w.a) / (w.b - w.a)} color={w.color} />)}
				<Pencil tip={tip} />
			</svg>
			{er > 0 && <AbsoluteFill style={{background: '#f7f2e7', clipPath: `inset(0 ${100 - er * 100}% 0 0)`}} />}
			<Invoke id="sketch" dur={dur} look="hand" />
		</AbsoluteFill>
	);
};
