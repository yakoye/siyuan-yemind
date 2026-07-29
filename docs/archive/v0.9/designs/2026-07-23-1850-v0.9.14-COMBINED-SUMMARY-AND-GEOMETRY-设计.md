# YeMind v0.9.14 combined summary and geometry design

## Goals

1. A multi-selection produces one summary describing the selected structural range.
2. Rich-text content and its node frame are measured in the same render generation.
3. In drag-first mode, right-button drag is a pure canvas pan gesture.

## Combined summary plan

`src/core/combinedSummary.ts` removes duplicate nodes and descendants already covered by a selected ancestor. For more than one remaining node it finds their lowest common ancestor, projects each node to the corresponding direct child, and creates one native contiguous range summary from the minimum to maximum child index. A single remaining ancestor receives one self summary. Existing identical self/range summaries are not duplicated.

The adapter temporarily supplies only the calculated range endpoints to the upstream `ADD_GENERALIZATION` command. Native history, rich-text initialization, focus and render behavior remain in effect.

## Stable measurement host

The upstream engine creates HTML measurement caches inside the canvas. Hidden SiYuan tabs can make those caches report zero size. YeMind moves them to one off-screen host under `document.body` that mirrors the active `.ymz-editor` classes, data attributes and CSS variables. Relocation schedules one full `render()` rather than a partial `reRender()`, ensuring text, frame and layout are recalculated together.

## Right-drag isolation

When canvas mode is `pan`, YeMind cancels the upstream Select plugin's right-button gesture immediately after mousedown and before every pan move. The selection rectangle, selection timer and cached selection are cleared without changing `renderer.activeNodeList`. A stationary right click continues to open the context menu.
