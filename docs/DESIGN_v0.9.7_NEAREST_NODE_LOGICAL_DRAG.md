# YeMind v0.9.7 nearest-node right-logical drag design

## Goal

The `logicalStructure` reference layout uses a nearest-legal-node local model rather than global depth lanes or tiny edge hotspots. Nodes may have unrelated widths and heights, so every visible node owns an enlarged local target box derived from its actual bounds.

## Local cross semantics

For a candidate node:

- left side above the horizontal centre: insert before the node under its existing parent;
- left side below the horizontal centre: insert after the node under its existing parent;
- right 38% of the body and the outward right extension: make the node the new parent;
- Root has only child semantics because it has no sibling parent.

The dragged subtree and all descendants are excluded from target selection.

## Target selection and stability

All legal nodes near the pointer are scored by distance to their enlarged local box. Actual body/child-side hits outrank weak nearby candidates. When two enlarged boxes overlap, the current target is retained until the alternative wins beyond a hysteresis margin; entering another actual node body switches immediately.

## Continuous parent link

A YeMind-green dashed curve is present for the complete drag session:

- before a new candidate exists, it connects the original parent to the ghost;
- BEFORE/AFTER connects the target's existing parent;
- CHILD connects the target node itself;
- every pointer movement resolves the candidate synchronously, so the line does not wait for dwell or a later animation frame.

Parent and ghost bounds are both calculated in the `otherDraw` scene coordinate space. Hit testing remains in transformed pointer space.

## Single candidate ownership

The dashed link, room-making preview and final upstream MOVE/INSERT command all consume the same candidate object containing kind, parent, index and reference target. No renderer may infer a different parent independently.
