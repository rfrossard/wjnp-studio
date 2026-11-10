import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, F, SAFE} from '../theme';
import {easeIn, easeInOut, lerp, seg, softIn, spring01} from '../lib';
import {FormatLabel} from '../Label';

// Formato 7: data story editorial em tema claro — base zero, um destaque, fonte sempre. Sem valores reais.
const INKL = '#0b0b14';
const BARS = [0.42, 0.55, 0.48, 0.92, 0.6];
const HI = 3;
const CX = 940, BASE = 860, BW = 110, GAP = 70, HMAX = 470;
export const DATA_LINE_X = CX + HI * (BW + GAP) + BW / 2;

export const DataStory: React.FC = () => {
	const f = useCurrentFrame();
	const head = softIn(f, 2, 12);
	const note = softIn(f, 120, 12);
	// saída: o fundo escurece de cima para baixo e a barra laranja vira uma linha fina de tela inteira
	const ex = easeIn(seg(f, 200, 232));
	return (
		<AbsoluteFill style={{background: '#f3f4f7'}}>
			<div style={{position: 'absolute', left: SAFE, top: 250, width: 760, fontFamily: F.itau, fontWeight: 300, fontSize: 76, lineHeight: '86px', color: INKL, opacity: head.opacity * (1 - ex), transform: `translateY(${head.y}px)`, filter: `blur(${head.blur}px)`}}>
				Uma comparação,
				<br />
				uma conclusão
			</div>
			<div style={{position: 'absolute', left: SAFE, top: 470, width: 640, fontFamily: F.itau, fontWeight: 300, fontSize: 34, lineHeight: '44px', color: '#4f5566', opacity: note.opacity * (1 - ex), transform: `translateY(${note.y}px)`}}>
				O destaque em laranja é a mensagem. O resto é contexto.
			</div>
			<svg width={1920} height={1080} style={{position: 'absolute'}}>
				<line x1={CX - 30} x2={CX + 5 * (BW + GAP) - GAP + 30} y1={BASE} y2={BASE} stroke="#b8bdcc" strokeWidth={2} opacity={1 - ex} />
				{BARS.map((v, i) => {
					const g = spring01((f - 10 - i * 6) / 30, 12, 0.9);
					const x = CX + i * (BW + GAP);
					const h = HMAX * v * g;
					if (i === HI) {
						// a barra destacada sobe até o topo e afina até virar uma linha
						const lw = lerp(BW, 4, ex);
						const top = lerp(BASE - h, 0, ex);
						const bot = lerp(BASE, 1080, ex);
						return null;
					}
					return <rect key={i} x={x} y={BASE - h} width={BW} height={h} rx={4} fill={C.navy} opacity={0.22 * (1 - ex)} />;
				})}
			</svg>
			{BARS.map((_, i) => (
				<div key={i} style={{position: 'absolute', left: CX + i * (BW + GAP), width: BW, top: BASE + 18, textAlign: 'center', fontFamily: F.mono, fontSize: 22, color: '#4f5566', opacity: softIn(f, 16 + i * 6).opacity * (1 - ex)}}>
					{String.fromCharCode(65 + i)}
				</div>
			))}
			<div style={{position: 'absolute', right: SAFE, top: 300, fontFamily: F.mono, fontSize: 20, color: '#4f5566', border: '1.5px solid #c9cdd8', borderRadius: 4, padding: '4px 12px', opacity: softIn(f, 30).opacity * (1 - ex)}}>
				ilustrativo / illustrative
			</div>
			<div style={{position: 'absolute', left: SAFE, bottom: 60, fontFamily: F.mono, fontSize: 18, color: '#4f5566', opacity: softIn(f, 90).opacity * (1 - ex)}}>
				Fonte: dados ilustrativos, só para demonstrar o formato.
			</div>
			{/* cortina escura que desce */}
			<div style={{position: 'absolute', left: 0, top: 0, width: 1920, height: 1080 * ex, background: C.stage}} />
			{(() => {
				// a barra destacada sobe até o topo e afina até virar uma linha (desenhada por cima da cortina)
				const g = spring01((f - 10 - HI * 6) / 30, 12, 0.9);
				const h = HMAX * BARS[HI] * g;
				const x = CX + HI * (BW + GAP);
				const lw = lerp(BW, 4, ex);
				const top = lerp(BASE - h, 0, ex);
				const bot = lerp(BASE, 1080, ex);
				return (
					<svg width={1920} height={1080} style={{position: 'absolute'}}>
						<rect x={x + BW / 2 - lw / 2} y={top} width={lw} height={bot - top} rx={lerp(4, 0, ex)} fill={C.orange} />
					</svg>
				);
			})()}
			{ex > 0.6 && <div style={{position: 'absolute', left: DATA_LINE_X - 2, top: 0, width: 4, height: 1080, background: C.orange}} />}
			{f < 200 && <FormatLabel frame={f} f0={8} n={7} name="DATA STORY" traits="editorial · base zero · fonte sempre" dark={false} />}
		</AbsoluteFill>
	);
};
