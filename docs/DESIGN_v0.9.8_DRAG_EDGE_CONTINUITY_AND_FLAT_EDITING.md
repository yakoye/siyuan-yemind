# YeMind v0.9.8 drag-edge continuity and flat canvas editing design

## Problem statement

The v0.9.7 right-logical drag target and green candidate-parent guide were responsive, but the room-making preview hid the incoming lines of every sibling subtree moved out of the way. A drag therefore removed unrelated Root-to-child or parent-to-child solid edges. Canvas rich-text editing also exposed the browser/Quill focus outline on top of the node selection shell, producing several nested frames.

## Edge-level preview ownership

During one drag session the edge presentation is divided into three categories:

1. **Dragged subtree root incoming edge** — hidden once at drag start and represented by the continuously visible green dashed candidate-parent guide.
2. **Unaffected ordinary edges** — never hidden or restyled.
3. **Incoming edges of room-making siblings** — their original paths are temporarily hidden and replaced by preview overlays whose parent endpoint stays fixed while the child endpoint uses the shifted preview position.

Internal edges inside a shifted subtree continue to move with the subtree SVG transform because both endpoints move by the same amount.

## Temporary incoming-edge overlays

`dragPreviewEdges.ts` groups shifted subtree roots by parent. For each parent it:

- creates temporary paths through the active layout renderer and the parent's normal `styleLine()` path;
- temporarily offsets only the target child `top` values while computing those paths;
- immediately restores logical node geometry;
- removes unused temporary paths;
- hides only the corresponding original incoming lines;
- records the original visibility state and overlay handle for exact cleanup.

Candidate changes and drag cancellation remove every overlay and restore each original line to its previous visibility. No preview path is serialized or added to command history.

## Canvas text editing presentation

The canvas editor remains an overlay required by Quill, but it is visually neutral:

- no additional border;
- no browser `outline`;
- no `box-shadow`;
- transparent inner container/editor backgrounds;
- node-computed text color and safe node background retained;
- caret and native selection retained.

The node shell remains responsible for theme and selection appearance, so double-click editing does not add another rounded rectangle or focus frame.

## Non-goals

- No persisted map/settings/checkpoint schema change.
- No change to nearest-node target resolution or green guide semantics.
- No change to outline editing or drag semantics.
- No attempt to generalize right-logical room-making to every layout family in this release.
