# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.1`  
Host baseline: SiYuan `3.7.3`

## v0.9.1

- Complete layered color definitions for 19 named themes.
- Separate colors for the map background, center, first-level, second-level and ordinary nodes.
- Separate center-to-first, first-to-second and second-to-ordinary connection colors.
- Three base themes with independent light and dark appearances.
- 22 public themes and 25 generated appearance definitions.
- JSON-driven theme color generation before build, type checking and tests.
- Local node text, background and line colors remain authoritative.

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
