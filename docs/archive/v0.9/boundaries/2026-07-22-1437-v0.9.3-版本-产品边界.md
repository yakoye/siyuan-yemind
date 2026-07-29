# YeMind v0.9.3 product boundaries

v0.9.3 changes three presentation/editing subsystems: effective center-topic fill, pointer-owned node quick actions, and outline editing. It does not rename storage files or migrate the persisted map schema.

The continuous outline is a second editor for the same `MindMapTree`. It does not maintain a parallel document database. Whole-document edits use the upstream undoable `updateData()` transaction, retain stable UIDs where possible, and flow through the existing `data_change`, autosave, checkpoint and rendering paths.

Node-tree outline mode remains available for rich-text editing, drag operations and expand/collapse controls. Canvas and outline editing ownership remains exclusive.
