# YeMind v0.9.23 — unified icon grid and dark-theme states

## Problem

The supplied SVG documents have different intrinsic sizes: 16×16, 20×20, 24×24 and 32×32. v0.9.22 correctly isolated them from host SVG CSS, but the browser then honored those different intrinsic geometries. Native SiYuan menu SVGs also used their own padding rules. The result was inconsistent visual size, icon-to-label spacing and label start positions.

Several outline states still used fixed light colors (`#ececec`, `#deeae6`) and fixed black disclosure symbols, which were inappropriate on a dark host theme. The dark fixed-color source icons were also not visible enough when rendered as isolated image documents.

## Geometry contract

- Icon slot: `22 × 22px`.
- Artwork bounding box: `15 × 15px`.
- Artwork scaling: `object-fit: contain`; intrinsic aspect ratio is never stretched.
- Icon-to-label gap: `4px`.
- Native SiYuan menu SVG: `22 × 22px` outer box with `3.5px` padding, yielding the same 15px drawing area.
- Missing or disabled icons retain the same menu column instead of moving the label.

## Source-icon appearance contract

Each supplied icon remains an isolated image document. The light URI remains byte-for-byte identical to `图标-svg.txt`. A second deterministic dark URI is produced by mapping fixed dark strokes/fills and `currentColor` artwork to high-contrast light foregrounds. The full white background rectangle used by the outer-frame icon becomes transparent only in the dark variant; white mask geometry is preserved.

The editor chooses variants from `data-appearance`. Detached SiYuan context menus receive their own `data-appearance` value from `detectAppearance()`.

## Dark state contract

- Outline hover uses a low-opacity host foreground mix.
- Outline selection uses a stronger YeMind accent mix and an accessible accent foreground.
- Disclosure triangles and leaf squares use the current theme foreground rather than black.
- Top-toolbar active controls use accent background, border, foreground and an inset focus line.
- Dark panels and floating surfaces use host surface/background variables and stronger dark shadows.

## Non-goals

- The original light SVG paths are not redrawn.
- Map data, node styles and saved themes are not migrated.
- Native SiYuan icons are not replaced; only their layout box is normalized inside YeMind menus.
