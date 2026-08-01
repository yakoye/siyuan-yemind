# YeMind

YeMind is a local-first mind-map workspace for SiYuan and the web. One shared TypeScript codebase powers both hosts, so maps, outlines, cards, themes, import/export, and interaction behavior stay compatible.

Current version: `1.9.0`
SiYuan baseline: `3.7.3`

## Highlights

- 28 real map structures covering directional mind maps, trees, timelines, organization charts, fishbones, tree tables, radial diagrams, bubbles, and bracket diagrams.
- Editable canvas and structured outline with synchronized selection, rich text, drag-and-drop, images, clipart, markers, notes, comments, relations, and outer frames.
- Transaction-safe clipboard routing for text, images and complete node structures across canvas, outline and multiple files, with atomic undo/redo.
- Cards and focused review with persistent status, favorites, progress, scheduling, and node linkage.
- Light, dark, and system/host appearance plus 25 project themes and responsive, discoverable toolbars.
- Shared import/export for editable YeMind SVG/ZIP, SVG, KMindz, XMind, Markdown, OPML, PNG, Text, outline/interactive HTML, and PDF.
- Local storage by default: SiYuan data remains in the plugin store; the standalone web app uses IndexedDB.

## Install and use

For SiYuan, install the release ZIP as `data/plugins/siyuan-yemind`. For the standalone edition, open the deployed GitHub Pages site or host the web release ZIP on any static host.

Before upgrades, export a `.yemind.svg` or create a full library backup. Existing `.yemindz.svg` and `.yemindz.zip` files remain import-compatible.

## Development

```text
npm ci
npm run dev
npm run dev:web
```

Verification and release:

```text
npm run check
npm test
npm run test:web
npm run test:offline
npm run verify:assets
npm run test:e2e
npm run release:build
npm run release:verify
```

See [回归验收清单](docs/standards/回归验收清单.md), [版本与发布规范](docs/standards/版本与发布规范.md), [测试与验收](docs/standards/测试与验收.md), and [v1.5.0 design](docs/designs/2026-07-28-1853-v1.5.0-界面与双端统一-设计.md). Release history is maintained in [CHANGELOG.md](CHANGELOG.md).

## License

MIT
