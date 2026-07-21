# YeMind Zen

A local-first mind-map plugin for SiYuan, powered by `simple-mind-map`.

- Plugin folder and ID: `siyuan-yemind-zen`
- Display name: `YeMind Zen`
- Version: `0.2.0`
- No Pro, payment, trial, activation, membership, or feature-gating logic

## v0.2.0

The installable runtime is now built entirely from `src/` with Vite. The v0.1.0 transitional runtime has been removed.

Implemented in this release:

- SiYuan Dock map management
- Stable one-tab-per-map behavior
- Node editing, insertion, deletion, hierarchy dragging, undo and redo
- Canvas pan, zoom and fit
- Native context menu
- Multiple layouts
- Local persistence and autosave
- Read-only, zen and fullscreen modes
- Top, left and bottom floating toolbars
- Basic global settings

## Install

Copy the complete folder to:

```text
<workspace>/data/plugins/siyuan-yemind-zen/
```

Restart SiYuan and enable **YeMind Zen**.

## Develop

```bash
npm install
npm test
npm run check
npm run build
```
