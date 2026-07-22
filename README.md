# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.3`  
Host baseline: SiYuan `3.7.3`

## v0.9.3

- Resolves transparent center topics against the effective theme/project canvas background.
- Shows node add/collapse/expand actions on pointer hover with a gap-safe interaction bridge.
- Adds a single continuous outline document with native multiline selection, clipboard editing and indentation-based tree import.
- Defers synchronization during IME composition and preserves node identity/metadata even when a label is completely rewritten.
- Keeps the node-tree outline as a synchronized secondary mode for rich text, drag and expand/collapse operations.

## v0.9.2

- Added center, first-level, second-level and normal-node border colors to all named themes.
- Unified theme and rainbow-line changes into one atomic appearance transaction followed by one complete redraw.
- Theme and rainbow palette changes now refresh immediately while preserving zoom, pan, selection and local node styles.

## v0.9.1

- Completed all 19 named theme definitions for center and descendant node levels.
- Registered 22 public themes backed by one generated runtime catalog.
- Preserved node-local text, fill and line styles above whole-map theme values.

## v0.9.0

- Safe node-image deletion with confirmation.
- In-editor image lightbox with wheel zoom, reset and multiple close gestures.
- Clean note/comment hover previews without native title overlays.
- Ten named rainbow-line palettes and matching whole-map themes.
- Three retained base themes: YeMind Default, Ink Branch and Material 3 Basic.

## Install

Extract the flat release archive directly into:

`<workspace>/data/plugins/siyuan-yemind/`

The release archive does not include user map, settings or checkpoint data.

## Validate

```bash
npm ci
npm test
npm run check
npm run build
node --check index.js
```
