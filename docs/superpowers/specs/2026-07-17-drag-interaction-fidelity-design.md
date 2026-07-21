# YeMind Drag Interaction Fidelity Design

## Goal

Fix the two v0.5.12 runtime regressions reported from SiYuan 3.7.2:

1. the original parent-to-node connection remains visible while the node clone is being dragged;
2. the target-parent guide changes too late or never changes when the drag clone is already close to another node.

## Evidence and root cause

The first screenshot shows the source node faded at its original position while the solid incoming connection from its old parent remains visible. `simple-mind-map`'s `Drag.createCloneNode()` calls `node.hideChildren()`, but that only hides the dragged node's outgoing lines. The incoming line is owned by `node.parent._lines[parent.children.indexOf(node)]`, so it remains visible.

The second screenshot shows the drag clone inside the visual child-entry tail of the upper node, while v0.5.12 still displays the original-parent guide. v0.5.12 samples `Drag.prototype.checkOverlapNode()`. That upstream routine uses the pointer point plus one-quarter node hit zones; it does not use the drag clone rectangle, the 80 px child tail, or the 44/72 px sibling lanes used by KMind Zen 0.33.0.

## Reference behavior from KMind Zen 0.33.0

The official bundle resolves drag intent from the complete drag rectangle rather than the raw pointer:

- child target padding: 8 px entering, 22 px while already active;
- child tail: 80 px in the target node's growth direction;
- sibling lane padding: 44 px entering, 72 px while active;
- sibling end padding: 44 px entering, 72 px while active;
- child-tail intent wins over sibling intent;
- sibling intent wins when the clone center is not inside a child target;
- intent changes require 60 ms and three matching frames;
- pointer events are coalesced with `requestAnimationFrame`;
- the visual guide uses the stable intent, while final mutation remains a native move/insert command.

The official renderer does not draw the old structural connection as a live connection after detachment. YeMind will hide the incoming source connection throughout the drag session and restore its SVG visibility only after the native drop lifecycle completes.

## Architecture

### Official-style geometric intent adapter

Add a pure geometry module that receives:

- the clone rectangle;
- candidate node rectangles;
- current stable candidate;
- current map layout.

It returns one of the existing YeMind candidate forms:

- child: `overlapNode`;
- sibling: `prevNode` / `nextNode` under a resolved parent and insertion index;
- none.

The adapter decides only the preview target. It does not mutate the tree. Drop execution remains upstream:

- `MOVE_NODE_TO`;
- `INSERT_BEFORE`;
- `INSERT_AFTER`.

Unsupported or highly specialized layouts retain the native upstream point-based detector as a fallback.

### Incoming-line visibility snapshot

At drag-clone creation:

- locate every dragged top-level node's incoming line in its parent;
- record whether that SVG line was visible;
- hide the line.

At mouseup, cancellation, plugin removal, or destruction:

- restore only lines that were visible before dragging;
- leave previously hidden lines hidden.

### Stable-frame settling

v0.5.12 advances the 60 ms / three-frame stabilizer only when another mousemove schedules a frame. v0.5.13 keeps requesting frames while a candidate is pending, so a pointer that pauses near a target still settles after the official stability window.

## Scope

This version changes only structured drag detection and visual lifecycle. It does not add free drag, custom coordinates, another history stack, or another persistence format.
