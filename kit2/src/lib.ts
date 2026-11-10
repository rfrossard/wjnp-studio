import {random} from 'remotion';

export const FPS = 30;
export const BEAT = 15; // 120 BPM a 30 fps

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, k: number) => a + (b - a) * k;
export const seg = (f: number, a: number, b: number) => clamp((f - a) / (b - a));
export const expo = (u: number) => (u >= 1 ? 1 : 1 - Math.pow(2, -10 * clamp(u)));
export const easeInOut = (x: number) => {
	x = clamp(x);
	return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
};
export const easeIn = (x: number) => clamp(x) ** 3;

// resposta ao degrau de uma mola amortecida, 0 -> 1 (t em segundos)
export function spring01(t: number, w = 14, z = 0.82) {
	if (t <= 0) return 0;
	if (z >= 1) return 1 - Math.exp(-w * t) * (1 + w * t);
	const wd = w * Math.sqrt(1 - z * z);
	return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t));
}

// entrada "soft": sobe, desfoca e aparece, sem overshoot
export function softIn(frame: number, f0: number, dur = 10) {
	const u = (frame - f0) / dur;
	const e = expo(u);
	return {opacity: clamp(u * 3), y: (1 - e) * 24, blur: (1 - e) * 8};
}

// índice do "desenho" em stop-motion a 12 desenhos/s
export const drawing = (frame: number) => Math.floor((frame / FPS) * 12);

// retângulo com bordas rasgadas (path SVG em coordenadas 0..w, 0..h)
export function tornRect(seed: string, w: number, h: number, amp = 7, step = 16): string {
	const pts: [number, number][] = [];
	const j = (i: number, k: string) =>
		(random(`${seed}-${k}-${i}`) - 0.5) * amp * 0.45 + Math.sin(i * 0.37 + random(`${seed}-ph-${k}`) * 6) * amp * 0.35;
	let i = 0;
	for (let x = 0; x < w; x += step) pts.push([x, j(i++, 't')]);
	for (let y = 0; y < h; y += step) pts.push([w + j(i++, 'r'), y]);
	for (let x = w; x > 0; x -= step) pts.push([x, h + j(i++, 'b')]);
	for (let y = h; y > 0; y -= step) pts.push([j(i++, 'l'), y]);
	return 'M' + pts.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join('L') + 'Z';
}

// queda em stop-motion: 3 desenhos no ar + 1 de assentamento, depois "boil" de 1 px
export function dropIn(frame: number, f0: number, id: string, rot = 0) {
	if (frame < f0) return null;
	const d = drawing(frame) - drawing(f0);
	const frames: [number, number, number][] = [
		[-140, -9, 1],
		[-55, -5, 1],
		[0, -1.2, 1.03],
	];
	const [dy, dr, s] = d < frames.length ? frames[d] : [0, 0, 1];
	const g = drawing(frame);
	const bx = (random(`bx-${id}-${g}`) - 0.5) * 2;
	const by = (random(`by-${id}-${g}`) - 0.5) * 2;
	return {dx: bx, dy: dy + by, rot: rot + dr, s};
}
