# Kit 2: vídeo multi-estilo guiado por `plan.json`

Origem: projeto do vídeo "Biblioteca de estilos" (8 min 21 s, 30 cenas). Testado em 08/11/2026; versões aprovadas pelo portão de qualidade em 09/11/2026.
Use este kit quando o vídeo tiver vários estilos. Para um estilo só, copie a cena de ouro, `core.tsx` (e `hand.tsx`, se for feito à mão).
**Antes de produzir qualquer cena, leia `../../references/quality.md` (portão obrigatório).**

## Montar um projeto
```bash
mkdir meu-video && cd meu-video
K=~/.claude/skills/motion-director/assets/kit2
cp $K/{package.json,tsconfig.json,remotion.config.ts} . && cp -R $K/src src && cp -R $K/scripts scripts
mkdir -p public/{source,audio,clips,data,math} screencast blender manim work && cp -R $K/public/fonts public/
ln -s ~/.local/share/motion-director/whisper.cpp whisper.cpp     # transcrição (opcional)
cp $K/engines/screencast/app.html screencast/ ; cp $K/engines/blender/* blender/ ; cp -R $K/engines/manim/* manim/
npm install    # versões fixas (Remotion 4.0.541, three, react-peeps, roughjs, perfect-freehand, mathjax-full…)
node scripts/tex2svg.mjs manim/tex/formulas.json manim/tex          # fórmulas do Manim
```
- **Fontes:** as OFL já vêm em `public/fonts/` do kit (`cp -R $K/public/fonts public/`), com os nomes esperados em `src/fonts.ts`. A Itau Display só entra em vídeo do Hub (skill `hub-internacional-video`); fora dele, troque `F.itau` em `theme.ts`.
- **Dados de exemplo:** `src/b/*.json` (words, entries, wave, screencast-log, handfonts) são do vídeo de exemplo. `handfonts.json` é a fonte de traço: mantenha.

## Estilo → cena de ouro (parta sempre daqui)
| estilo | arquivo · componente | estilo | arquivo · componente |
|---|---|---|---|
| hype | `v3.tsx` · `HypeV3` | news | `ch4.tsx` · `NewsS` |
| creator | `ch1.tsx` · `CreatorV` | geomap | `ch4.tsx` · `GeomapS` |
| anime | `v2.tsx` · `AnimeV2` | blender | `ch4.tsx` · `BlenderS` + `engines/blender/cena.py` |
| toon3d | `v3.tsx` · `Toon3DV3` | archival | `Archival.tsx` |
| led | `ch1.tsx` · `LedS` | broll | `ch5.tsx` · `BrollS` ⚠ abaixo do portão (composição 3) |
| flat | `v3.tsx` · `FlatV3` | podcast | `ch5.tsx` · `PodcastS` |
| journey | `v2.tsx` · `JourneyV2` | screencast | `ch5.tsx` · `ScreencastS` + `record_screencast.mjs` |
| manim | `engines/manim/mola2.py` · `Mola2` | demo | `v2.tsx` · `DemoV2` |
| sketch | `sketch2.tsx` · `SketchV2` | sand | `ch6.tsx` · `SandS` |
| comic | `v2.tsx` · `ComicV2` | shadow | `v3.tsx` · `ShadowV3` |
| datastory | `v3.tsx` · `DataV3` | collage | `ch6.tsx` · `CollageS` |
| stroke | `v3.tsx` · `StrokeV3` | pixel | `ch6.tsx` · `PixelS` ⚠ abaixo do portão (composição/ofício 3,5) |
| ink | `v3.tsx` · `InkV3` | mosaic | `ch6.tsx` · `MosaicS` |
| particles | `ch3.tsx` · `ParticlesS` | extrude3d | `ch3.tsx` · `Extrude3DS` |

O `MAP` de `src/b/Biblioteca.tsx` já usa estas versões. As cenas marcadas com ⚠ precisam de uma rodada de crítica antes de entrar num vídeo novo.
**Não use** (v1, só como contraexemplo): `HypeV`, `Toon3DV`, `AnimeV` (`ch1`); `FlatS`, `JourneyS`, `SketchS`, `ComicS` (`ch2`); `DataS`, `StrokeS`, `InkS` (`ch3`); `DemoS` (`ch5`); `ShadowS` (`ch6`); `engines/manim/mola.py`.

## Arquitetura
- **`src/b/plan.json`** é a fonte única: `scenes[] = {id, dur (frames), chap, out (transição), uso, master, direct}`, mais `overlap` por transição.
  A composição (`Biblioteca.tsx`) e a trilha (`scripts/score2.py`) leem o mesmo arquivo.
- **`core.tsx`:**
  - `TIMELINE`/`TOTAL`: início de cada cena, descontando a sobreposição das transições.
  - `Shot`: transições de entrada e saída (`whip`, `swipe`, `zoom`, `page`, `dip`, `iris`, `flood`, `impact`, `cut`).
  - `Invoke`: cartão "como invocar" com 17 visuais e posições `top|center|bottom|left`. Ele aparece a `dur − 146` frames do fim; nada importante pode ficar embaixo dele. É opcional: tire-o se o vídeo não for demonstração.
  - `Vertical`: moldura 9:16 dentro do 16:9 (prop `aside` para conteúdo fora do celular).
  - `useFonts()`: **obrigatório** antes de desenhar texto em `<canvas>`.
- **`hand.tsx`:** escrita traço a traço (`Written`), formas rough (`Rough`, `rRect`/`rCircle`/`rLine`/`rPath`), lápis (`Pencil`), `missingGlyphs`. O render **falha** se faltar glifo; as fontes EMS não têm º, · nem —.
- **Personagens:** `react-peeps` (Open Peeps). Os `viewBox` por tipo de pose estão em `quality.md` §4.1. Nunca desenhe pessoas em SVG.

## Motores externos (geram clipes que entram via `OffthreadVideo`)
- **Manim** (sem admin):
  - ambiente global `~/.local/share/motion-director/env`. Se não existir, crie com `micromamba create -p ~/.local/share/motion-director/env -c conda-forge python=3.12 manim ffmpeg` (peça OK ao usuário antes de baixar);
  - **sem LaTeX**: as fórmulas vêm de `scripts/tex2svg.mjs` (MathJax → SVG, `\color{#hex}` por variável) e entram com `SVGMobject(..., stroke_width=0)`;
  - render: `~/.local/share/motion-director/env/bin/manim render -qh --fps 30 -r 1920,1080 manim/mola2.py Mola2 --media_dir work/manim`;
  - a cena imprime `COLAPSO_EM`: confira que fica antes de `dur − 146` frames. Ajuste o fim com `self.wait(max(0.5, DUR − self.time))`.
- **Matemática no Remotion:** gere SVG com `tex2svg.mjs … public/math '#f3f4f7'` e use `<Img src={staticFile('math/x.svg')}>`. Fórmula em fonte mono é proibida.
- **Blender** (`blender --version`): `blender -b -P blender/cena.py -- <out_dir> <frames>` gera PNGs, que viram vídeo com ffmpeg. Eevee leva ≈ 0,45 s/frame a 1080p no Mac M.
- **Gravação de tela real:** `node scripts/record_screencast.mjs` (Chrome headless + CDP, log do cursor), depois `ffmpeg -f concat … -fps_mode cfr -r 30`.
- **Transcrição:** `transcribe.mjs` (whisper.cpp medium, pt) → `words.py` → `words.json`. O Whisper repete frases em trechos de música ou silêncio; use só a fala confiável.

## Áudio
1. `score2.py` gera música e efeitos por cena a partir do `plan.json` e abaixa a música (×0,3) nas cenas com fala.
2. Nivelamento por cena (já no script): cenas calmas ficam até ~4 dB abaixo das energéticas, com rampas de 0,4 s.
3. Drive 2,8 leva o total a ≈ −18,6 LUFS (LRA 4,6). Depois do render, aplique o limitador de master sem re-renderizar:
   `ffmpeg -i out.mp4 -map 0:v -map 0:a -c:v copy -af "alimiter=limit=0.79:attack=3:release=60:level=false" -c:a aac -b:a 256k final.mp4` (pico −0,8 dBFS).
4. Meça por cena: `python3 scripts/measure_scenes.py out/final.mp4 <ffmpeg>`.

## QA: o portão de qualidade (`references/quality.md`)
1. Por cena, durante a produção: `node scripts/stills.mjs work/stills <frames…>`, folha com `ffmpeg … tile`, lado a lado com a referência, ≥ 2 rodadas, todos os critérios ≥ 4.
2. Depois do render final:
   - `~/.local/share/motion-director/env/bin/python scripts/audit.py extract out/final.mp4`;
   - dê as notas em `work/audit/scores.md`;
   - `audit.py check` precisa passar. Entregue as folhas e as notas.
3. Erros já corrigidos no kit:
   - cartão dentro do celular → use `aside`;
   - tela preta no fim de cortes → use `Freeze`;
   - `rect {...{w,h}}` em SVG → precisa de `width`/`height`;
   - espaço engolido em flex → `whiteSpace: 'pre'`;
   - sobreposição do cartão com tarjas;
   - zoom exponencial que perde o alvo (use `kc`);
   - Peep cortado na cintura (use o viewBox de corpo inteiro);
   - glifo ausente na fonte de traço.

## Instalar o ambiente (máquina nova)
1. Instale o micromamba em `~/.local/share/motion-director/bin/` (binário único, sem admin).
2. `micromamba create -p ~/.local/share/motion-director/env -c conda-forge python=3.12 manim ffmpeg` (≈ 830 MB; peça OK).
3. Opcional, para transcrição: `@remotion/install-whisper-cpp` em `~/.local/share/motion-director/whisper.cpp` com o modelo `medium` (≈ 1,5 GB).
