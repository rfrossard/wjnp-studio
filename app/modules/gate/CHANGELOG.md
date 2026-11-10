# Changelog

## 0.2.0 (2026-11-09)
- Added `process`: reference, start from a passing scene, at least two critique rounds, hard rules, audit of the rendered MP4. Ported from the motion-director library's quality gate (`references/quality.md`), whose own self-review found that 13 of 27 first-version scenes scored at or below 3 against their references.
- Added `scoring`: minimum two rounds even when the first passes, at least three defects listed before any score, a 5 only with an empty defect list, and a critic from a different model family than the author.
- Added `audit`: the rendered MP4 is scored, not the episode JSON. One still per scene, both sides of every transition, an eight-frame motion strip per scene.
- Three new hard rules: `passage_both_sides`, `visible_motion`, `audio_measured`.
- `minimum_legibility` now separates the two layouts: 22 px on the desktop cut, 30 px on the vertical master, 18 px for source lines, and a 60 px safe margin.
- `full_composition` now states the threshold: elements fill at least 60 percent of the frame at the scene's climax.
- `transitions` replaced the ban on wipes, zooms and spins with the handoff contract: a transition is an object, both sides carry content, no blank frame beyond 10 frames, at most two hard cuts a minute. The owner confirmed on 2026-11-09 that wipe, zoom and slide stay.

## 0.1.0 (2026-11-09)
- Initial version.
