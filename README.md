# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.0`  
Host baseline: SiYuan `3.7.3`

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
