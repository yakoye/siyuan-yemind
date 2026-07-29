# YeMind v0.9.15 proportional clipart geometry design

## Problem

The corrected local SVG library contains landscape, portrait and square viewports. The previous picker wrote `imageSize: { width: 72, height: 72, custom: true }` for every clipart item. Because `simple-mind-map` treats a custom image size as authoritative, non-square SVGs were rendered into a square viewport and appeared stretched. The old asset set largely used square canvases, so the defect was previously masked.

## Runtime design

- `src/core/clipartGeometry.ts` parses numeric SVG `width`/`height` and falls back to `viewBox`.
- The original ratio is fitted inside a `72 × 72` default box without enlarging one axis independently.
- The picker resolves geometry before invoking `SET_NODE_IMAGE`.
- `yemindClipartGeometryVersion` marks nodes written with proportional geometry.
- Existing clipart nodes with `yemindClipartId`, custom `72 × 72` geometry and no current geometry marker are repaired when the map opens.
- Ordinary images and manually resized clipart are not migration candidates.

## Catalog contract

The catalog remains the authoritative inventory and matches `assets_tree.txt`: 13 categories and 764 SVG paths. Geometry is derived from each SVG at insertion or migration time; it is not duplicated in the catalog.

## Packaging

The versioned update ZIP intentionally excludes `assets/**`. It must be extracted over the user's local project containing the corrected visual resources. The filename follows `siyuan-yemind-vX.Y.Z.zip` and does not use an `-overlay` suffix.
