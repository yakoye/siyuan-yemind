# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.6`  
Host baseline: SiYuan `3.7.3`

## v0.9.6

- Enlarges outline structural drag initiation to the complete indentation cell while preserving native text selection in node content.
- Makes Enter split or create sibling nodes, Shift+Enter insert a soft break, and empty-row Backspace delete in two stages without adding blank lines to the previous node.
- Stabilizes outline drop guides with whole-row before/after zones and horizontally snapped parent/same/child depths.
- Shows `Default font` for inherited selection typography instead of leaving the formatting toolbar field blank.
- Rebuilds right-growing logical-structure dragging without canvas insertion lines: the green dashed preview identifies only the actual candidate parent.
- Uses target upper/lower zones for sibling ordering, an explicit right-tail zone for child placement, and no-op behavior for neutral space or unchanged positions.
- Moves destination nodes during drag to expose the pending structure while preserving subtree UIDs, metadata and one-step undo.

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
