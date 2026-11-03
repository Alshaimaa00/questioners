# Mulhim icons — extracted from the approved icon sheet (2 Nov 2026)

Source: `source/mulhim-approved-icon-sheet.webp` — the icon sheet approved by the team, stored unchanged
(1600 x 1168, SHA-256 e565ccdf45f7e8f22b98a128383bd3e6d2a7211abd87e4c9463f1b3f31ac8a68).

These are RASTER images cut from that artwork, not vectors and not redrawn:
- `png/<name>.png`  — 288 x 288, RGBA (master files)
- `webp/<name>.webp` — the same, smaller (quality 92, with transparency)

How they were made:
1. each circle's centre and radius was fitted to its ring (about 80 ring points each, fit error ~1px);
2. everything inside the circle (disc, ring, icon) is the original pixels, fully opaque, unchanged;
3. outside it the white page background was made transparent ("colour to alpha"), keeping the soft
   shadow and the ring's anti-aliased edge as semi-transparent pixels; the crop's outer edge fades out;
4. each tile was scaled (by at most ±3%) so every disc has the same size: 110px radius on a 288px canvas.
Placed back on white, every icon matches the original inside its disc (mean difference 0, max 2/255).

Names (sheet order, left to right, top to bottom):
dna, test-tube, microscope, report, calendar, apple, dumbbell, moon, heart-pulse, water-drop,
flame, active-hoop, knee-joint, meditation, target, growth-chart, child-height, family-group,
medical-institution, checklist

Update (2 Nov 2026, review): the soft shadow/halo outside each circle was removed - a faint detached arc
above each disc (the shadow of the circle above it on the sheet, caught in the crop) and the sheet's shadow
below. Everything beyond the ring's outer edge is now transparent (2px soft edge from 111 to 113px radius).
The disc, ring and artwork pixels are unchanged (verified identical inside 110.5px radius).
The previous files are kept in rollback/before-icon-halo-fix/assets-icons/.
