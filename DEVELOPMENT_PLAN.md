# YeMind development plan

## Current baseline

- Product version: 0.9.29
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
- Conservative import-width repair and post-measure relayout with exact viewport restoration.
- Recursive branch collapse with one-level expansion for node and global disclosure.
- Outline image single-click editing, double-click lightbox preview and full node-content action parity.
- Sprite-backed outline icon editing, anchored compact asset dialogs, semantic hover previews and dirty-outline accessory synchronization.
- Direct compact outline marker geometry, semantic note/comment symbols, stabilized first-hover previews, restored clipart resize controls and shared dialog chrome.
- Persisted floating toolbar visibility, inline zoom/title editing, wide relation hit targets and layout-aware direct-child quick actions.

## Next priorities

1. Validate v0.9.29 floating toolbar reveal/pin behavior, editable zoom/title, relation selection and layout-aware quick actions inside SiYuan 3.7.3 with built-in and representative third-party themes.
2. Profile 1,000+ node import, outline editing and recursive disclosure without weakening transaction safety.
3. Improve keyboard access and screen-reader labels for outline content status controls and image actions.
4. Continue accessibility and mobile-layout coverage for content-rich outline rows.
5. Prepare a stable 1.0 compatibility and migration policy.
