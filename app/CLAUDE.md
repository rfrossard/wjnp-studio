# What's just now possible? — studio map for Claude

Personal weekly video studio for Roberto Frossard (personal brand, NOT his employer's).
One ~5 min narrated English video per week for LinkedIn, built to need 15–20 min of his time.

## Non-negotiables
1. **LLMs write data, code renders.** Every model output must parse against `packages/contracts`. Same `episode.json` ⇒ same video.
2. **Facts before script.** A scene may only cite claims with `verdict: "verified"` (≥2 independent sources, one primary). Numbers on screen are read from the claim by id.
3. **Nothing is published without `post.ownerConfirmedAt`** set by an explicit owner action.
4. **Protected modules** (`compliance`, `factuality`, `publish`) change only by explicit owner instruction — never from a metrics-derived proposal.
5. **Personal brand only.** No employer logos, colours (no orange, no purple), titles or mentions. Never load the Hub/ICTi/Itaú brand profile here.
6. **No unlicensed media.** `license.kind: "unknown"` can never enter a video. `standard`-licence clips: ask the owner on every generation (short quote / quote card / both).
7. Paid generation (ElevenLabs, Lyria) stays inside the weekly budget in `modules/orchestration/routing.json`; above it, show the cost and wait for OK.
8. **No scene ships without the gate** (`modules/gate/criteria.json`): two critique rounds minimum, every criterion ≥ 4, defects listed before scores, and the audit run on the rendered MP4 — not on the episode JSON. If a scene ships below the bar for lack of time, say which one and why. Never deliver quietly.
9. Never say "rendered/tested" without having done it. Models cannot hear audio: verify by measurement and transcript.

## Layout
| Path | What |
|---|---|
| `packages/contracts` | zod schemas + constants. The contract between every module. |
| `packages/core` | store, validators (factuality, compliance, gate, timing, design), plan, feedback→proposal→version, publish kit, importer, CLI `wjnp`, HTTP API |
| `packages/providers` | LLM / TTS (ElevenLabs) / music (Lyria) interfaces, mocks, tier router with escalation, the episode pipeline |
| `packages/render` | Remotion project: personal brand, 10 scene templates × 2 layouts (9:16 master, 16:9 desktop), end card with QR |
| `packages/studio` | local web UI (8 screens) talking to the core API on :4317 |
| `modules/<name>/` | rules-as-data. Each has `manifest.json` + `CHANGELOG.md`. Most improvements are edits here, not code. |
| `brand/` | logo kit (silhouette mark, QR, lockups) |
| `episodes/<id>/episode.json` | one folder per episode; `episodes/_golden/` is the regression set |
| `library/` | reusable assets (`assets/<type>/<id>.json`, `blobs/<sha256>`) |
| `feedback/` | `feedback.jsonl`, `proposals/<id>.json` |
| `skill/SKILL.md` | the iteration procedure (read this when the owner gives feedback) |
| `docs/` | ARCHITECTURE.md, API.md, SELF-REVIEW.md |

## Commands
- `npm install` · `npm test` · `npm run typecheck`
- `npm run wjnp -- <cmd>`: `new`, `validate`, `lint`, `plan`, `gate`, `kit`, `import`, `library`, `feedback add|list|propose|apply`, `regress`, `serve`
- `npm run step -- <radar|brainstorm|claims|verify|script|review|narrate|post> <episodeId> [--mock] [--input f.json] [--ok-spend]` runs one pipeline step (real providers need keys; `--mock` is free and offline)
- `npm run render -- <episodeId> <master|desktop|cut> [--stills]` · `npm run e2e:mock` (offline end-to-end check)
- `npm run studio` (UI on :4318, needs `npm run wjnp -- serve` on :4317) · `npm run render:studio` (Remotion preview)

## State of the build (update this when it changes)
- Verified here: typecheck, unit tests, gate/regress on the golden fixture, mock narration → render of all three outputs, studio against the real API.
- NOT yet verified against live services: Anthropic/OpenAI-compatible LLM calls, ElevenLabs, Lyria, live URL import, radar feeds (none configured), LinkedIn posting (manual/assisted only).
- Scene templates are this repo's own. The motion-director kit 2 scenes are still not wired in, but its **quality gate** is (`modules/gate` 0.2.0): order of work, two critique rounds minimum, defects before scores, a critic from another model family, twelve hard rules and an audit of the rendered MP4. Its **mix targets** are in `modules/audio` 0.2.0.
- Transitions are live: the preset's kind (cut, dissolve, slide, zoom, wipe) runs as a silent layer over each join, so both sides of a passage are drawn and narration still plays once. Verified on a rendered MP4: no blank frame across a join.
- Approvals live in `episodes/<id>/approvals.json` and are mirrored read-only into `episode.approvals`. Editing the script after approval withdraws script + final approvals; a published episode is locked.

## When the owner gives feedback
Follow `skill/SKILL.md`: log it → classify (one-off vs standing) → propose an exact edit to one module file → run `regress` → wait for approval → apply (version bump + CHANGELOG) → update `docs/SELF-REVIEW.md`.
