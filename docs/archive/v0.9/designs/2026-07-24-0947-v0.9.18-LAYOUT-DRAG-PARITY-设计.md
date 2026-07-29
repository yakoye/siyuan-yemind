# YeMind v0.9.18 design: split reveal and layout drag parity

## 1. Split reveal ownership

`setViewMode()` schedules one animation-frame callback after the split/outline pane becomes visible. The callback reads the first active canvas node UID and calls the existing outline activation path with outline-local reveal enabled. It does not emit a new canvas activation or claim outline edit ownership.

## 2. Right logical as the reference path

The existing `logicalStructure` resolver remains unchanged and is still invoked directly. Its nearest legal local target, enlarged hit region, child-side/sibling-side split, sticky-target hysteresis, one green candidate-parent line and room preview define the expected interaction.

## 3. Direction normalization

Each supported layout reports the direction in which children grow: left, right, top or bottom. Candidate node rectangles and the pointer are mirrored or rotated into the right-growing reference frame. The resolved candidate continues to reference the original node objects, so the ordinary mutation and history commands remain valid.

Mind-map branches are grouped by their own left/right direction. Timeline, organization, tree and fishbone variants resolve their sibling axis separately from their child-growth direction.

## 4. One preview model

Every adapted layout commits the immediate pointer candidate and draws one candidate-parent guide. The room preview orders visual siblings on either the X or Y axis, shifts only following sibling subtrees, and creates temporary incoming-edge overlays with both `deltaX` and `deltaY` support. Legacy origin and insertion-line previews are hidden for these layouts.

## 5. Right fishbone

The engine package does not provide `rightFishbone` layout constructors. YeMind registers a dedicated subclass before creating the map. It runs the verified fishbone layout and then mirrors node geometry around the root centre. Inherited line and generalization paths are calculated with original coordinates and mirrored at output, preserving readable node content while producing a true left/right structural mirror.

## 6. Gallery coverage

Tree-table and “other” thumbnails already map to official engine layouts such as `catalogOrganization`, `logicalStructure`, `logicalStructureLeft` and `mindMap`. The drag-parity contract verifies that every gallery preset maps to an adapted engine layout.
