# YeMind v0.9.10 outline guides and bidirectional reveal

## Guide ownership

The structured outline owns one non-interactive absolute guide layer. Each expanded parent with visible descendants contributes exactly one `1px` guide element. Rows no longer paint repeated ancestor gradients.

## Geometry

- X: expanded triangle tip/centre.
- Start Y: immediately below the triangle tip.
- End Y: centre of the last visible descendant marker in the parent's visible subtree.
- Color: parent depth modulo the existing four-color indent-rainbow palette.

All coordinates are calculated in outline scroll-content coordinates. Hover, active state, editing and drag feedback do not alter the guide geometry.

## Bidirectional reveal

- Canvas `node_active` selects and reveals the matching outline row inside the outline's own scroll container.
- Outline activation calls `GO_TARGET_NODE`, presenting the matching canvas node near the canvas centre.
- Hidden canvas-only view does not attempt to scroll the hidden outline.
- Outline reveal never calls page-level `scrollIntoView()`.
