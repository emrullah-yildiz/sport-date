# KeepItUp brand assets

Generated from the canonical mark in `apps/web/src/lib/brand.tsx` (neon motion-arc +
"KeepItUp" wordmark, anthracite `#20262B` / neon `#3BEA7E` / off-white `#F1F5F3`).
Served at `/{brand}/…` — e.g. `https://keepitup.social/brand/keepitup-mark-1024.png`.

## Files & where to use them

| File | Use |
|---|---|
| `keepitup-mark-1024.png` | **Social profile picture** (IG/TikTok/X/Facebook avatar). Square, on-brand background. |
| `keepitup-mark-512.png` / `-400.png` | Smaller avatar sizes if a platform wants them. |
| `keepitup-mark-transparent-1024.png` | The mark with no background — overlay on photos/slides. |
| `keepitup-wordmark.png` | **Horizontal lockup** (mark + name) — banners, email header, site header, press. |
| `keepitup-wordmark-transparent.png` | Wordmark, transparent background. |
| `keepitup-*.svg` | Vector sources — scale to any size, edit in a design tool. |

## Notes
- Profile pics are often shown circle-cropped (Instagram) — the mark stays centred and
  safe inside a circle.
- To change the mark/colours, edit `src/lib/brand.tsx` (the single source of truth) and
  regenerate; `brand.test.tsx` guards the in-app favicon against drift.
- A social banner (1500×500) and a favicon refresh can be produced on request.
