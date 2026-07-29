# YeMind v0.9.6 outline and right-logical drag design

## Separation of interaction models

Outline and canvas share tree legality and the final move command, but they do not share the same geometry or preview. The outline needs a precise insertion line because its rows expose depth explicitly. The canvas needs spatial motion and a candidate-parent relationship, so it uses live node displacement plus one dashed link and no insertion line.

## Unified outline

- The complete indentation cell between the active rainbow guide and the row marker starts structural drag; no visible handle is rendered.
- The marker remains dedicated to expand/collapse or leaf identity, and the editor remains dedicated to text selection.
- A pointer movement threshold prevents ordinary clicks from becoming drags.
- The row under the pointer stays locked through its adjacent half-gaps. Its upper half resolves BEFORE and its lower half resolves AFTER.
- Horizontal position snaps to visible parent, current or child depth. A candidate is retained through small pointer movement so the guide does not flicker.
- The 2px guide uses the YeMind accent green, starts with a green square and begins at the final depth.

## Outline keyboard semantics

- Enter splits the current node at the selection or creates the next sibling when the caret is at the end.
- Root Enter creates its first child rather than a second Root.
- Shift+Enter inserts a soft line break inside the current node.
- Removing the final visible character leaves one editable empty node. Backspace on that empty node performs the structural deletion and focuses the previous visible row.
- Browser placeholder markup is normalized before removal, so the previous row never receives an extra paragraph or `<br>`.

## Right-growing logical canvas

- Target resolution uses the pointer, never the dragged clone rectangle.
- Each target node exposes a sibling row containing an upper BEFORE half and lower AFTER half, plus a deliberate right-tail CHILD zone.
- Empty space between distant sibling rows remains neutral. Original position, invalid targets and neutral space are no-ops.
- A valid sibling target displays one green dashed link from the common parent to the dragged ghost.
- A valid child target displays one green dashed link from the target node to the dragged ghost.
- No canvas insertion line or Root fallback is rendered.
- Destination siblings or children are translated during preview so the pending location is visible. The preview is restored on candidate change, Escape or no-op release.
- Accepted moves preserve the existing node objects, complete subtree, UIDs and metadata and enter history as one command.

## Scope

The right-growing `logicalStructure` layout is the v0.9.6 reference interaction. Other layout families remain on their previous geometry adapters until they can be generalized without weakening this accepted behavior.
