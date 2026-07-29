# YeMind v0.9.6 product boundaries

v0.9.6 changes unified-outline keyboard routing, empty-node deletion, outline drag initiation/preview stability, selection-toolbar font presentation and the drag interaction for the right-growing `logicalStructure` layout. It does not change map, settings or checkpoint schemas.

The persisted `MindMapTree` remains authoritative. Outline edits continue through the existing undoable tree-update path, and canvas moves continue through `simple-mind-map` commands. No parallel outline document or drag-only storage is introduced.

The canvas redesign is intentionally specialized first for right-growing logical structures. That layout uses pointer-only sibling rows, an explicit node-tail child target, live destination displacement and one green dashed candidate-parent link. It deliberately renders no canvas insertion line and never falls back to Root when no valid candidate exists. Other layout families retain their existing adapter until this interaction is accepted as the reference behavior.

Release archives contain code, tests and documentation only. User maps, settings and checkpoints are excluded.
