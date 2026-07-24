# YeMind development plan

## Current baseline

- Product version: 0.9.25
- Host baseline: SiYuan 3.7.3
- Plugin ID and folder: `siyuan-yemind`

## Completed foundations

- Local map, settings and checkpoint repositories.
- Canvas, split outline and full outline views.
- Stable UID-based node transactions and focus ownership.
- Rich-text editing, node images, notes, comments and styles.
- Global search integration and node navigation.
- Structured diagnostics and domain-organized regression suite.
- Complete theme text, fill, border and line color system.
- Atomic whole-map appearance refresh with viewport and selection preservation.
- Unified structured outline with native cross-node selection, staged select-all and selection-aware paste.
- Indentation-based hierarchy import, UID/metadata preservation and failure rollback.
- Dedicated outline drag gutter with aligned insertion feedback.
- Hover-owned canvas node quick actions with a pointer-safe bridge.
- Single-layer outline rainbow guides aligned below expanded triangle tips, plus bidirectional canvas/outline visible-node synchronization.
- Exact `图标-svg.txt` Base64 SVG rendering through a host-CSS-isolated image boundary, with source-byte hashes and Chromium coverage.
- Unified 22px icon columns, 15px proportional artwork, deterministic dark variants and theme-aware toolbar/outline states.
- Outline text-to-map import for six structured formats with preview, atomic replacement and explicit insertion policy.
- Outline node context commands with line-only cut semantics and repeated empty-row Enter promotion.
- Host appearance redraw stabilization with exact transform preservation and zero-size deferral.
- Viewport-bounded text-to-map dialog with processed hierarchy preview and long-label import-width policy.
- Custom dark-aware Theme/Line panels and a unified project-control interaction palette.
- Content-only outline projection and shared Add actions for node icons, images and clipart.

## Next priorities

1. Validate v0.9.25 processed import preview, custom Theme/Line panels and outline image/icon/clipart actions inside SiYuan 3.7.3 with built-in and representative third-party themes.
2. Profile 1,000+ node import, outline editing and drag-target resolution without weakening transaction safety.
3. Extend compact outline content indicators to notes, links, tags and formulas while keeping row geometry stable.
4. Continue accessibility, screen-reader and keyboard-navigation coverage.
5. Prepare a stable 1.0 compatibility and migration policy.
