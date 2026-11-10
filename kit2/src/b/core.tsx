import React, {useEffect, useState} from 'react';
import {AbsoluteFill, continueRender, delayRender, useCurrentFrame} from 'remotion';
import {fontsReady, fontsReady2} from '../fonts';
import plan from './plan.json';
import {C, F, F2} from '../theme';
import {clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01} from '../lib';

export type SceneId = string;
export type Trans = 'flood' | 'impact' | 'swipe' | 'cut' | 'zoom' | 'whip' | 'page' | 'dip' | 'iris' | 'none';
export type PlanScene = {id: string; dur: number; chap: string; out: Trans; uso?: string; master?: string; direct?: string};
export const SCENES = plan.scenes as PlanScene[];
const OV = plan.overlap as Record<Trans, number>;

// início de cada cena considerando a sobreposição das transições
export const TIMELINE = (() => {
	let at = 0;
	return SCENES.map((s, i) => {
		const start = at;
		const ov = OV[s.out] ?? 0;
		at = start + s.dur - ov;
		const prevOut: Trans = i > 0 ? SCENES[i - 1].out : 'none';
		return {...s, start, inTrans: prevOut, ovIn: i > 0 ? OV[prevOut] ?? 0 : 0, ovOut: ov};
	});
})();
export const TOTAL = TIMELINE[TIMELINE.length - 1].start + TIMELINE[TIMELINE.length - 1].dur;
export const sceneById = (id: string) => TIMELINE.find((s) => s.id === id)!;

// Aplica a transição de entrada (do tipo de saída da cena anterior) e a de saída
export const Shot: React.FC<{dur: number; inT: Trans; outT: Trans; children: React.ReactNode}> = ({dur, inT, outT, children}) => {
	const f = useCurrentFrame();
	let tf = '', filter = '', opacity = 1, clip = '';
	const outF = f - (dur - 14); // últimos 14 frames
	// entrada
	if (inT === 'whip' && f < 10) { const k = 1 - easeInOut(f / 10); tf += `translateX(${k * 1920}px)`; filter += `blur(${k * 24}px)`; }
	if (inT === 'swipe' && f < 10) { const k = 1 - easeInOut(f / 10); tf += `translateY(${k * 1080}px)`; }
	if (inT === 'zoom' && f < 10) { const k = 1 - easeInOut(f / 10); tf += `scale(${1 - 0.35 * k})`; opacity = 1 - k; }
	if (inT === 'page' && f < 14) { const k = 1 - easeInOut(f / 14); tf += `perspective(2400px) rotateY(${-70 * k}deg)`; opacity = 1 - k * 0.6; }
	if (inT === 'dip' && f < 12) opacity = f / 12;
	if (inT === 'iris' && f < 16) clip = `circle(${lerp(0, 1150, easeIn(f / 16))}px at 50% 50%)`;
	// saída
	if (outT === 'whip' && f > dur - 10) { const k = easeInOut((f - (dur - 10)) / 10); tf += ` translateX(${-k * 1920}px)`; filter += ` blur(${k * 24}px)`; }
	if (outT === 'swipe' && f > dur - 10) { const k = easeInOut((f - (dur - 10)) / 10); tf += ` translateY(${-k * 1080}px)`; }
	if (outT === 'zoom' && f > dur - 10) { const k = easeIn((f - (dur - 10)) / 10); tf += ` scale(${1 + 2.2 * k})`; opacity = 1 - k; }
	if (outT === 'page' && f > dur - 14) { const k = easeIn((f - (dur - 14)) / 14); tf += ` perspective(2400px) rotateY(${85 * k}deg)`; }
	if (outT === 'dip' && outF > 0) opacity *= 1 - clamp(outF / 12);
	if (outT === 'iris' && f > dur - 16) clip = `circle(${lerp(1150, 0, easeIn((f - (dur - 16)) / 16))}px at 50% 50%)`;
	return (
		<AbsoluteFill style={{transform: tf || undefined, filter: filter || undefined, opacity, clipPath: clip || undefined, transformOrigin: outT === 'page' || inT === 'page' ? '0% 50%' : '50% 50%'}}>
			{children}
			{/* sobreposições: inundação de cor e flash de impacto */}
			{outT === 'flood' && f > dur - 12 && <Flood k={easeIn((f - (dur - 12)) / 12)} />}
			{inT === 'flood' && f < 12 && <Flood k={1 - easeInOut(f / 12)} />}
			{outT === 'impact' && f > dur - 4 && <AbsoluteFill style={{background: '#fff', mixBlendMode: 'difference'}} />}
			{inT === 'impact' && f < 3 && <AbsoluteFill style={{background: '#fff', opacity: 1 - f / 3}} />}
		</AbsoluteFill>
	);
};
const Flood: React.FC<{k: number}> = ({k}) => (
	<svg width={1920} height={1080} style={{position: 'absolute', inset: 0}}>
		<circle cx={960} cy={540} r={lerp(0, 1150, k)} fill={C.orange} />
	</svg>
);

// ---------- Cartão de invocação, no idioma visual de cada estilo ----------
export type InvokeLook = 'hud' | 'terminal' | 'pixel' | 'comic' | 'news' | 'led' | 'manim' | 'paper' | 'hand' | 'light' | 'dark' | 'sand' | 'shadow' | 'anime' | 'toon' | 'phone' | 'gold';
const CARD = 130; // frames antes do fim em que o cartão aparece

export const Invoke: React.FC<{id: string; dur: number; look: InvokeLook; pos?: 'bottom' | 'center' | 'top' | 'left'}> = ({id, dur, look, pos = 'bottom'}) => {
	const f = useCurrentFrame();
	const s = SCENES.find((x) => x.id === id)!;
	const t0 = dur - CARD - 16;
	if (f < t0 || f > dur - 12) return null;
	const a = softIn(f, t0, 10);
	const out = clamp((f - (dur - 22)) / 8);
	const opacity = a.opacity * (1 - out);
	const y = pos === 'bottom' ? 760 : pos === 'top' ? 120 : 380;
	const base: React.CSSProperties = pos === 'left'
		? {position: 'absolute', left: 96, top: 600, transform: `translateY(${a.y}px) scale(0.78)`, transformOrigin: '0 0', opacity, filter: `blur(${a.blur}px)`, whiteSpace: 'nowrap'}
		: {position: 'absolute', left: '50%', top: y, transform: `translate(-50%, ${a.y}px)`, opacity, filter: `blur(${a.blur}px)`, maxWidth: 1500, whiteSpace: 'nowrap'};
	const L = (k: string, v: string, accent = C.orange, sub = '#9aa3ae') => (
		<div style={{display: 'flex', gap: 18, alignItems: 'baseline'}}>
			<span style={{fontFamily: F.mono, fontSize: 20, color: sub, width: 120, textAlign: 'right'}}>{k}</span>
			<span style={{color: accent}}>{v}</span>
		</div>
	);
	const lines = (accent: string, sub: string) => (
		<>
			{L('via master', s.master!, accent, sub)}
			{L('direto', s.direct!, accent, sub)}
			{L('uso', s.uso!, accent, sub)}
		</>
	);
	switch (look) {
		case 'pixel':
			return (
				<div style={{...base, background: '#0f0f23', border: '6px solid #f2f2f2', boxShadow: '0 0 0 6px #0f0f23', padding: '22px 30px', fontFamily: F2.pixel, fontSize: 18, lineHeight: '34px', color: '#f2f2f2'}}>
					<div style={{color: '#ffd23f'}}>▶ COMO INVOCAR</div>
					<div>{s.master}</div>
					<div style={{color: '#7fe3ff'}}>ou: {s.direct}</div>
					<div style={{color: '#9aa'}}>uso: {s.uso}</div>
				</div>
			);
		case 'comic':
			return (
				<div style={{...base, top: 700}}>
					<div style={{background: '#fff', border: '5px solid #111', borderRadius: 40, padding: '20px 36px', fontFamily: F2.comicText, fontSize: 30, color: '#111', boxShadow: '8px 8px 0 #111'}}>
						<div style={{fontFamily: F2.comic, fontSize: 40, color: '#e63946', letterSpacing: 1}}>COMO INVOCAR!</div>
						<div>{s.master}</div>
						<div style={{fontSize: 24, color: '#444'}}>ou {s.direct} · {s.uso}</div>
					</div>
				</div>
			);
		case 'news':
			return (
				<div style={{...base, left: 0, top: 820, transform: `translateX(${(1 - a.opacity) * -400}px)`, whiteSpace: 'nowrap'}}>
					<div style={{display: 'flex', alignItems: 'stretch'}}>
						<div style={{background: '#d62828', color: '#fff', fontFamily: F.display, fontWeight: 800, fontSize: 26, padding: '14px 22px'}}>COMO INVOCAR</div>
						<div style={{background: '#fff', color: '#111', fontFamily: F.display, fontWeight: 700, fontSize: 28, padding: '12px 26px'}}>{s.master}</div>
					</div>
					<div style={{background: '#111', color: '#ddd', fontFamily: F.mono, fontSize: 20, padding: '8px 22px', display: 'inline-block'}}>direto: {s.direct} · uso: {s.uso}</div>
				</div>
			);
		case 'manim':
			return (
				<div style={{...base, fontFamily: 'Menlo, monospace', fontSize: 28, color: '#e8e8e8', lineHeight: '46px', top: 640}}>
					{lines(C.orange, '#8a8f98')}
				</div>
			);
		case 'hand':
			return (
				<div style={{...base, top: 880, fontFamily: F2.hand, fontSize: 40, color: '#1a1a1a', transform: `translate(-50%, ${a.y}px) rotate(-1.5deg)`, lineHeight: '54px'}}>
					<div style={{color: '#d62828'}}>como invocar →</div>
					<div>{s.master}</div>
					<div style={{fontSize: 36, color: '#1f4fbf'}}>ou {s.direct} · {s.uso}</div>
				</div>
			);
		case 'paper':
		case 'light':
			return (
				<div style={{...base, background: look === 'paper' ? '#fbfaf6' : '#ffffff', border: '1.5px solid #d5d8e0', borderRadius: 8, padding: '20px 30px', fontFamily: F.mono, fontSize: 26, color: '#14161c', lineHeight: '42px', boxShadow: '0 20px 50px rgba(0,0,0,0.12)'}}>
					{lines(C.orange, '#6b7280')}
				</div>
			);
		case 'led':
			return (
				<div style={{...base, fontFamily: F.mono, fontSize: 28, color: '#f3f4f7', lineHeight: '44px', textShadow: '0 0 12px rgba(255,98,0,0.6)'}}>
					{lines('#ffb27a', '#7b8494')}
				</div>
			);
		case 'sand':
			return (
				<div style={{...base, fontFamily: F.itau, fontWeight: 300, fontSize: 32, color: '#2a1d10', lineHeight: '46px', textAlign: 'center'}}>
					<div style={{fontFamily: F.mono, fontSize: 20, letterSpacing: '0.1em', color: '#6b4b2a'}}>COMO INVOCAR</div>
					<div>{s.master}</div>
					<div style={{fontSize: 24, color: '#6b4b2a'}}>{s.direct} · {s.uso}</div>
				</div>
			);
		case 'shadow':
			return (
				<div style={{...base, background: '#120a06', color: '#ffcf8a', padding: '18px 30px', fontFamily: F.itau, fontWeight: 300, fontSize: 30, lineHeight: '44px', borderRadius: 4, clipPath: 'polygon(1% 0, 99% 3%, 100% 96%, 0 100%)'}}>
					<div style={{fontFamily: F.mono, fontSize: 18, letterSpacing: '0.12em', color: '#e07a2a'}}>COMO INVOCAR</div>
					<div>{s.master}</div>
					<div style={{fontSize: 22, color: '#c9a070'}}>{s.direct} · {s.uso}</div>
				</div>
			);
		case 'anime':
			return (
				<div style={{...base, top: 720, transform: `translate(-50%, ${a.y}px) skewX(-8deg)`}}>
					<div style={{background: '#111', color: '#fff', padding: '16px 34px', fontFamily: F.display, fontWeight: 800, fontSize: 30, borderLeft: '10px solid #ff2e63'}}>
						<div style={{color: '#ff2e63', fontSize: 22, letterSpacing: '0.2em'}}>COMO INVOCAR</div>
						<div>{s.master}</div>
						<div style={{fontSize: 20, color: '#aaa', fontFamily: F.mono}}>{s.direct} · {s.uso}</div>
					</div>
				</div>
			);
		case 'toon':
			return (
				<div style={{...base, top: 800, background: '#ffd23f', border: '6px solid #1a1033', borderRadius: 26, padding: '14px 30px', fontFamily: F.display, fontWeight: 800, fontSize: 28, color: '#1a1033', boxShadow: '0 8px 0 #1a1033'}}>
					<div>{s.master}</div>
					<div style={{fontSize: 20, fontFamily: F.mono, fontWeight: 500}}>{s.direct} · {s.uso}</div>
				</div>
			);
		case 'phone':
			return (
				<div style={{...base, left: 1300, top: 300, transform: `translateY(${a.y}px)`, whiteSpace: 'normal', width: 540, fontFamily: F.mono, fontSize: 22, lineHeight: '34px', color: '#f3f4f7'}}>
					<div style={{fontFamily: F.display, fontWeight: 800, fontSize: 24, color: C.orange, letterSpacing: '0.08em', marginBottom: 10}}>COMO INVOCAR</div>
					<div>{s.master}</div>
					<div style={{color: '#9aa3ae', marginTop: 10}}>direto: {s.direct}</div>
					<div style={{color: '#9aa3ae'}}>uso: {s.uso}</div>
				</div>
			);
		case 'gold':
			return (
				<div style={{...base, fontFamily: F.itau, fontWeight: 300, fontSize: 34, color: '#f5e6b8', lineHeight: '50px', textAlign: 'center', textShadow: '0 2px 18px rgba(0,0,0,0.8)', background: 'rgba(20,14,6,0.88)', border: '2px solid #d4a640', padding: '16px 34px', borderRadius: 6}}>
					<div style={{fontFamily: F.mono, fontSize: 20, letterSpacing: '0.14em', color: '#d4a640'}}>COMO INVOCAR</div>
					<div>{s.master}</div>
					<div style={{fontSize: 24, color: '#c9b98a'}}>{s.direct} · {s.uso}</div>
				</div>
			);
		case 'terminal':
			return (
				<div style={{...base, background: '#0d0f14', border: '1px solid #2a2f38', borderRadius: 10, padding: '16px 26px 18px', fontFamily: F.mono, fontSize: 24, lineHeight: '38px', color: '#e6e6e6', boxShadow: '0 30px 80px rgba(0,0,0,0.5)'}}>
					<div style={{display: 'flex', gap: 8, marginBottom: 8}}>{['#ff5f56', '#ffbd2e', '#27c93f'].map((c) => <span key={c} style={{width: 12, height: 12, borderRadius: 6, background: c}} />)}</div>
					<div><span style={{color: '#7b8494'}}>$ </span><span style={{color: C.orange}}>{s.master}</span></div>
					<div style={{color: '#7b8494'}}># ou: {s.direct} · {s.uso}</div>
				</div>
			);
		default: // hud / dark
			return (
				<div style={{...base, background: 'rgba(10,12,16,0.78)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '18px 30px', fontFamily: F.mono, fontSize: 26, lineHeight: '42px', color: '#f3f4f7', backdropFilter: 'blur(6px)'}}>
					{lines(C.orange, '#8a93a0')}
				</div>
			);
	}
};

// ---------- Moldura vertical (9:16) dentro do 16:9, para mostrar o uso em redes ----------
export const Vertical: React.FC<{children: React.ReactNode; bg?: string; label?: string; aside?: React.ReactNode}> = ({children, bg = '#0b0d12', label, aside}) => {
	const W = 1080 * 0.5, H = 1920 * 0.5; // 540 x 960
	return (
		<AbsoluteFill style={{background: bg}}>
			<div style={{position: 'absolute', left: 960 - W / 2, top: 60, width: W, height: H, borderRadius: 34, overflow: 'hidden', boxShadow: '0 0 0 10px #15181f, 0 40px 120px rgba(0,0,0,0.6)'}}>
				<div style={{width: 1080, height: 1920, transform: 'scale(0.5)', transformOrigin: '0 0', position: 'relative', overflow: 'hidden'}}>{children}</div>
			</div>
			{label && <div style={{position: 'absolute', left: 960 + W / 2 + 40, top: 80, fontFamily: F.mono, fontSize: 20, color: '#6b7380', letterSpacing: '0.08em'}}>{label}</div>}
			{aside}
		</AbsoluteFill>
	);
};

export {clamp, easeIn, easeInOut, expo, lerp, seg, softIn, spring01};

// espera as fontes antes de desenhar texto em canvas (determinismo entre processos de render)
export const useFonts = () => {
	const [ok, setOk] = useState(false);
	const [h] = useState(() => delayRender('fontes para canvas'));
	useEffect(() => { Promise.all([fontsReady, fontsReady2]).then(() => { setOk(true); continueRender(h); }); }, [h]);
	return ok;
};
