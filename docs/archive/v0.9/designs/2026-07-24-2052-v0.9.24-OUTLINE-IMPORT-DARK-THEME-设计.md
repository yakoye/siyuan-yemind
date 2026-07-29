# YeMind v0.9.24 — outline text import and appearance stability

## Outline context-menu contract

The outline menu is intentionally separate from the canvas node menu. It contains only line/structure operations in the user-defined order. “剪切（当前行）” copies and clears text only; it never removes the node or descendants. Structural removal is explicit through the two delete commands.

## Text import pipeline

1. Normalize CRLF and remove an outer Markdown code fence.
2. Detect or honor the selected parser mode.
3. Parse source lines into `{ depth, text, sourceLine }` records.
4. Merge supported continuation lines and ignore visual guide-only/blank rows.
5. Normalize the first node to depth zero and clamp illegal depth jumps.
6. Render a live read-only tree preview and diagnostics.
7. Clone the current map and build the complete result off-screen.
8. Apply the result through one editor tree transaction or do nothing on failure.

Supported modes are Unicode tree, Windows Tree, spaces/Tabs, Markdown list, numbered outline and plain multi-line text. Auto detection prioritizes explicit tree syntax before weaker indentation/plain heuristics.

## Placeholder contract

Each parser mode owns a short example in `OUTLINE_TREE_IMPORT_PLACEHOLDERS`. It is assigned to the textarea's `placeholder`, so it appears gray and cannot be edited or accidentally imported. Changing mode updates the hint immediately; existing source text is never overwritten.

## Outline Enter contract

- Non-empty row + Enter: create an empty sibling.
- Empty row + Enter: promote exactly one level.
- Direct child of the center topic + Enter: delete that empty row and focus the center topic.
- Shift+Enter: line break inside the same node.
- IME composition owns Enter until composition ends.

## Appearance transaction contract

Appearance changes are visual transactions, not user viewport changes:

- capture scale, translation and active selection;
- suppress persistence of internal `view_data_change` events;
- rerender appearance;
- restore the exact transform immediately and again on the next animation frame;
- restore selection;
- defer the full rerender when the canvas has no usable dimensions;
- run the pending refresh after the editor becomes visible.

This prevents a light/dark switch from accumulating horizontal map drift.

## Theme and Line dark controls

The toolbar controls use host surface/on-surface variables, dark `color-scheme`, visible hover/focus/open states and dark-aware native select options. This includes the control text, leading icon, dropdown arrow, select surface and option list—not only the surrounding toolbar.

## Non-goals

- Importing arbitrary free-form prose as inferred semantic hierarchy.
- Adding multiple map roots.
- Showing standalone node image/marker/clipart accessories in the outline in this release.
- Changing user-selected map theme or line colors merely because the SiYuan shell appearance changes.
