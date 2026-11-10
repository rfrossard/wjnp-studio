# wjnp-studio

Ported from Beto's Mac repos so the whole "What's just now possible?" weekly
LinkedIn-video pipeline can run inside a Claude session's own sandbox, with
no separate app on his Mac.

- `app/` — the main pipeline (contracts, validators, 36-style catalog +
  selector, voice/music menus, ElevenLabs narration, Lyria music, the native
  8-style Remotion library). Ported from `~/Dev/whats-just-now-possible`.
- `kit2/` — the second rendering engine, covering the other 27 visual
  styles. Ported from `~/Dev/md-render/motion-director/motion-director`.

Both were verified to install (`npm install`), typecheck, pass their test
suites, and produce real Remotion renders from inside a Claude sandbox as of
2026-11-10. `node_modules/`, `.env` and generated render output (`out/`,
`lib-out/`) are intentionally not committed — reinstall with `npm install`
and regenerate renders as needed.
