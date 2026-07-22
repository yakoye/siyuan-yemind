# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.7`  
Host baseline: SiYuan `3.7.3`

## v0.9.7

- Rebuilds right-logical dragging around the nearest legal node and an enlarged per-node local target box, so unequal node sizes do not require fixed global lanes.
- Uses the target's left upper/lower halves for sibling before/after and its right half/outward extension for child placement.
- Adds sticky-target hysteresis between dense neighbours while preserving immediate switching when the pointer enters a new node body or child side.
- Keeps one YeMind-green dashed parent link visible throughout the drag: original parent fallback first, then real-time candidate-parent switching.
- Draws parent and ghost endpoints in one scene coordinate system and makes the dashed link, room preview and final commit consume the same candidate.

## v0.9.6

- Added native outline Enter splitting, Shift+Enter soft breaks and two-stage empty-node deletion.
- Expanded the outline drag hit area to the complete indent cell and stabilized green depth-aligned guides.
- Displayed “Default font” semantics instead of an empty inherited-font field.
- Removed right-logical canvas insertion lines in favour of one candidate-parent dashed link and live room making.

## v0.9.5

- Structural outline dragging now starts only from the invisible gutter left of the marker; text remains selectable and editable, and leaf squares are `5 × 5px`.
- Depth-aligned YeMind-green insertion guides show sibling-before, sibling-after, child and parent-aligned destinations.
- Canvas drop intent is pointer-driven, so large image ghosts no longer trigger targets while the pointer remains in a neutral gap.
- Dashed parent previews remain visible throughout canvas dragging and switch from the original parent to the current candidate parent.
- Sibling targets respond quickly, child targets require a short dwell, and neutral space clears stale candidates immediately.
- Invalid/self/descendant/root/no-op targets do not mutate data or history; Escape cancels the active drag session.
- The trash-can artwork is visually matched to the magnifier while button boxes and hit areas remain unchanged.
- Image preview, delete and resize controls are isolated from structural node dragging.

## v0.9.4

- Replaces the separate text/tree outline modes with one structured node document that supports native selection across rows.
- Implements staged `Ctrl/Cmd+A`: current-node content first, complete outline second; an existing cross-node range promotes directly to the full outline.
- Makes paste replace the live selection across single nodes, multiple nodes, rich text, plain text and indentation-based tree input.
- Commits structural edits as one undoable tree transaction while preserving stable UIDs, metadata, local styles and unselected subtrees.
- Uses equal black triangles and leaf squares, retains indent-rainbow guides, and removes row/input borders and focus shadows.
- Restricts node dragging to a dedicated gutter and shows depth-aligned before/inside/after insertion feedback.
- Shows the rich-format toolbar only after selection completes and keeps staged selection/copy available in readonly mode.

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
