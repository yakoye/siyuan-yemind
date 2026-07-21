# YeMind Zen v0.1.0 migration status

## Completed

- Project, plugin ID, storage keys, tab type, Dock type, protocol links, display name and icon renamed to `yemind-zen` / `YeMind Zen`.
- Added a TypeScript + Vite source project under `src/`.
- Added the `simple-mind-map` dependency and the editor-core creation entry.
- Preserved the last installable runtime as a temporary fallback, so this package can still be loaded while the core migration proceeds.
- Removed Study naming and did not add account, payment, Pro, trial or activation concepts.

## Transitional limitation

The installable root `index.js` is the renamed transitional runtime. The new `simple-mind-map` source entry is present in `src/`, but the complete editor-core migration is not yet finished in v0.1.0. Building `src/` after installing dependencies will replace the transitional runtime progressively in later versions.

## Next version

v0.2.0 will move node rendering, selection, editing, drag/drop, history and context-menu commands to `simple-mind-map` first. Rich text, formulas and cloze follow after the base editor is stable.
