# YeMind

YeMind is a local-first mind-map plugin for SiYuan. It provides canvas, split-outline and outline views, rich node editing, images, notes, comments, styles, checkpoints, diagnostics and global-search navigation.

Current version: `0.9.16`  
Host baseline: SiYuan `3.7.3`

## v0.9.16 proportional clipart geometry

- Clipart insertion now reads authored SVG `width`/`height`, falling back to `viewBox`, instead of forcing every item to `72 × 72`.
- Landscape, portrait and square assets are fitted proportionally inside a 72px box, and node frames use the resulting display size.
- Legacy default clipart nodes with `yemindClipartId` and the old square geometry are repaired automatically when a map opens.
- The local asset contract now matches the corrected set of 764 SVGs in 13 categories.

## v0.9.14 combined summaries, stable geometry and right-drag isolation

- Multi-selection summary now creates one combined range summary instead of one summary per selected node.
- Rich-text measurement uses an off-screen editor-context host and one full geometry repair render, keeping long text, custom widths and image nodes aligned with their frames.
- In drag-first mode, right-button drag pans only; it no longer draws a selection rectangle or changes the active node selection, while stationary right-click still opens the menu.

## v0.9.13 interaction polish

- Marker sprites are clipped through SVG patterns so icons and text remain inside node bounds.
- Image tools appear on hover; the magnifier opens preview and the lighter blurred backdrop keeps the map visible.
- Selected relation lines use a clear blue accent with a small width increase.
- Structure closes on outside click, toolbar buttons regain hover feedback, and style panels are more compact.
- About is a top-bar entry between Settings and Diagnostics.
- New maps use `中心主题` and two `新节点` labels while the file remains `未命名导图`.
- Multi-selection survives right-click on any selected node.
- Hidden-tab rich-text measurement is stabilized to prevent blank pill-shaped nodes.

## v0.9.12 local assets

- 126 marker icons in eight groups, rendered from the fixed local sprite.
- 764 searchable clipart SVGs in thirteen categories, placed above node text.
- 28 layout thumbnails in seven visual groups, with persisted layout preset identity.
- Runtime paths are resolved from the actual SiYuan plugin base URL; catalogs are authoritative.
- The default AI artifact is a resource-excluded update package and intentionally omits fixed visual resources while keeping the ordinary versioned ZIP filename.


## v0.9.10

- Replaces per-row gradient guide fragments with one structured-outline guide overlay that paints each expanded parent segment exactly once.
- Aligns every vertical guide directly below the expanded triangle tip and keeps all segments at a uniform `1px` width.
- Extends each parent guide only through its visible subtree, preserving the four-color indent-rainbow cycle without duplicate overlap.
- Reveals the matching outline row when a canvas node becomes active, using outline-local scrolling rather than page-level `scrollIntoView()`.
- Keeps outline-to-canvas navigation centred through `GO_TARGET_NODE`, completing bidirectional visible-node synchronization.
- Adds real Chromium geometry, duplicate-line and bidirectional reveal regression coverage.

## v0.9.9

- Rebuilds outline indent-guide geometry from one shared set of row-start, indent, drag-gutter and marker-column variables.
- Removes the redundant guide left of the root and places the first guide exactly halfway between root and first-level marker columns.
- Places every deeper guide halfway between adjacent marker columns while retaining the four-color indent-rainbow cycle.
- Keeps marker, text and drag hit areas fixed; hover, active, expand/collapse and drag feedback no longer shift guide coordinates.
- Adds CSS-contract and real Chromium geometry regression coverage.

## v0.9.8

- Preserves unaffected solid parent-child edges while another subtree is being dragged and preview siblings make room.
- Replaces only the dragged subtree root's original incoming edge with the continuous green candidate-parent preview.
- Removes extra canvas rich-text editing borders, outlines and shadows while retaining the caret and native text selection.

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
