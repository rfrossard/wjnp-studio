// Kit de "feito à mão": escrita traço a traço (fontes de traço único EMS, OFL), traço com pressão (perfect-freehand, MIT)
// e formas/hachuras com cara de desenho (rough.js, MIT). Tudo determinístico (seeds fixas) e função do frame.
import React, {useMemo} from 'react';
import rough from 'roughjs';
import {getStroke} from 'perfect-freehand';
import fonts from './handfonts.json';

type Pt = [number, number];
type Glyph = {a: number; s: number[][][]};
const FONTS = fonts as unknown as Record<'felix' | 'read', Record<string, Glyph>>;

const resample = (pts: Pt[], step = 3): Pt[] => {
	if (pts.length < 2) return pts;
	const out: Pt[] = [pts[0]];
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
		const d = Math.hypot(x1 - x0, y1 - y0), n = Math.max(1, Math.floor(d / step));
		for (let k = 1; k <= n; k++) out.push([x0 + ((x1 - x0) * k) / n, y0 + ((y1 - y0) * k) / n]);
	}
	return out;
};
const plen = (p: Pt[]) => p.reduce((s, q, i) => (i ? s + Math.hypot(q[0] - p[i - 1][0], q[1] - p[i - 1][1]) : 0), 0);

// contorno do perfect-freehand → path SVG (curvas quadráticas)
const toPath = (o: number[][]) => {
	if (!o.length) return '';
	const d = o.reduce((acc: (string | number)[], [x0, y0], i, arr) => { const [x1, y1] = arr[(i + 1) % arr.length]; acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2); return acc; }, ['M', ...o[0], 'Q']);
	d.push('Z');
	return d.join(' ');
};

export type HandStroke = {pts: Pt[]; len: number};
// texto → traços em coordenadas de tela (x,y = início da linha de base)
export const textStrokes = (text: string, font: 'felix' | 'read', x: number, y: number, size: number, jitterSeed = 1): HandStroke[] => {
	const F = FONTS[font], sc = size / 1000;
	let cur = 0; const out: HandStroke[] = [];
	[...text].forEach((ch, ci) => {
		const g = F[ch];
		// portão de qualidade: glifo ausente vira "?" no vídeo — falhe no render em vez de entregar texto quebrado
		if (!g) throw new Error(`hand.tsx: a fonte "${font}" não tem o glifo "${ch}" (em "${text}"). Reescreva o texto ou componha o glifo em build_hand_fonts.mjs.`);
		const dy = Math.sin(ci * 1.7 + jitterSeed) * size * 0.012; // linha de base levemente irregular
		for (const st of g.s) {
			const pts = resample(st.map(([gx, gy]) => [x + (cur + gx) * sc, y - gy * sc + dy] as Pt), 2.5);
			out.push({pts, len: plen(pts)});
		}
		cur += g.a;
	});
	return out;
};
export const textWidth = (text: string, font: 'felix' | 'read', size: number) => [...text].reduce((s, ch) => s + (FONTS[font][ch]?.a ?? 0), 0) * (size / 1000);
export const missingGlyphs = (text: string, font: 'felix' | 'read') => [...new Set([...text].filter((ch) => !FONTS[font][ch]))];

// desenha traços até a fração k (0..1) do comprimento total; devolve a ponta atual
export const useWritten = (strokes: HandStroke[], k: number, width: number) => {
	const total = strokes.reduce((s, x) => s + x.len, 0);
	let left = total * Math.max(0, Math.min(1, k));
	const paths: string[] = [];
	let tip: Pt | null = null;
	for (const s of strokes) {
		if (left <= 0) break;
		if (left >= s.len) { paths.push(toPath(getStroke(s.pts, {size: width, thinning: 0.5, smoothing: 0.5, streamline: 0.3, simulatePressure: true, last: true}))); left -= s.len; tip = s.pts[s.pts.length - 1]; continue; }
		let acc = 0; const part: Pt[] = [s.pts[0]];
		for (let i = 1; i < s.pts.length; i++) { acc += Math.hypot(s.pts[i][0] - s.pts[i - 1][0], s.pts[i][1] - s.pts[i - 1][1]); part.push(s.pts[i]); if (acc >= left) break; }
		paths.push(toPath(getStroke(part, {size: width, thinning: 0.5, smoothing: 0.5, streamline: 0.3, simulatePressure: true, last: false})));
		tip = part[part.length - 1]; left = 0;
	}
	return {paths, tip, done: k >= 1};
};

export const Written: React.FC<{text: string; font?: 'felix' | 'read'; x: number; y: number; size: number; k: number; color?: string; width?: number; onTip?: (p: Pt | null) => void}> = ({text, font = 'felix', x, y, size, k, color = '#1b1b1f', width}) => {
	const strokes = useMemo(() => textStrokes(text, font, x, y, size, x + y), [text, font, x, y, size]);
	const {paths} = useWritten(strokes, k, width ?? Math.max(2.4, size * (font === 'felix' ? 0.095 : 0.07)));
	return <g fill={color}>{paths.map((d, i) => <path key={i} d={d} />)}</g>;
};
export const writtenTip = (text: string, font: 'felix' | 'read', x: number, y: number, size: number, k: number) => {
	const strokes = textStrokes(text, font, x, y, size, x + y);
	return useWritten(strokes, k, 2).tip;
};

// ---------- rough.js ----------
const gen = rough.generator();
type RoughOpts = Parameters<typeof gen.rectangle>[4];
export type RPath = {d: string; stroke: string; strokeWidth: number; fill?: string};
const toR = (dr: ReturnType<typeof gen.rectangle>): RPath[] => gen.toPaths(dr).map((p) => ({d: p.d, stroke: p.stroke, strokeWidth: p.strokeWidth, fill: p.fill}));
export const rRect = (x: number, y: number, w: number, h: number, o: RoughOpts = {}) => toR(gen.rectangle(x, y, w, h, {roughness: 1.3, bowing: 1.2, strokeWidth: 3, stroke: '#1b1b1f', ...o}));
export const rCircle = (x: number, y: number, d: number, o: RoughOpts = {}) => toR(gen.circle(x, y, d, {roughness: 1.2, strokeWidth: 3, stroke: '#1b1b1f', ...o}));
export const rLine = (x1: number, y1: number, x2: number, y2: number, o: RoughOpts = {}) => toR(gen.line(x1, y1, x2, y2, {roughness: 1.4, strokeWidth: 3, stroke: '#1b1b1f', ...o}));
export const rPath = (d: string, o: RoughOpts = {}) => toR(gen.path(d, {roughness: 1.2, strokeWidth: 3, stroke: '#1b1b1f', ...o}));

// desenha caminhos rough progressivamente (k 0..1), com o preenchimento hachurado entrando por último
export const Rough: React.FC<{paths: RPath[]; k: number}> = ({paths, k}) => (
	<g>
		{paths.map((p, i) => {
			const a = i / paths.length, b = (i + 1) / paths.length;
			const kk = Math.max(0, Math.min(1, (k - a) / (b - a)));
			if (kk <= 0) return null;
			return <path key={i} d={p.d} stroke={p.stroke === 'none' ? (p.fill ?? '#000') : p.stroke} strokeWidth={p.strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - kk} />;
		})}
	</g>
);

// lápis que acompanha a ponta do traço
export const Pencil: React.FC<{tip: Pt | null}> = ({tip}) =>
	!tip ? null : (
		<g transform={`translate(${tip[0]} ${tip[1]}) rotate(-38)`}>
			<path d="M0,0 L14,-7 L14,7 Z" fill="#e8c9a0" stroke="#1b1b1f" strokeWidth={2} />
			<path d="M0,0 L5,-2.5 L5,2.5 Z" fill="#1b1b1f" />
			<rect x={14} y={-8} width={150} height={16} fill="#ffcf3a" stroke="#1b1b1f" strokeWidth={2} />
			<line x1={14} y1={-2.5} x2={164} y2={-2.5} stroke="#e0a800" strokeWidth={2} />
			<rect x={164} y={-8} width={14} height={16} fill="#c9ccd2" stroke="#1b1b1f" strokeWidth={2} />
			<rect x={178} y={-8} width={18} height={16} rx={4} fill="#f29b9b" stroke="#1b1b1f" strokeWidth={2} />
		</g>
	);
