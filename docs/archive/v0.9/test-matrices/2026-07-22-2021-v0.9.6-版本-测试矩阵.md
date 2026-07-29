# YeMind v0.9.6 test coverage matrix

| Area | Permanent coverage |
|---|---|
| Outline drag source | complete indentation-cell hit area, `move` cursor, 5px threshold, marker/text isolation |
| Outline drop stability | whole-row upper/lower BEFORE/AFTER zones, row-gap locking, parent/same/child depth snapping, Escape cleanup |
| Outline keyboard editing | Enter sibling creation/split, Root child creation, Shift+Enter soft break, selection replacement |
| Empty-node deletion | final-character leaves empty row, second Backspace removes it, previous node receives no `<br>` or empty paragraph |
| Selection toolbar | inherited font displays `默认字体`; unknown stacks normalize safely; selection timing remains unchanged |
| Right-logical neutral behavior | real neutral corridors, unchanged-position no-op, no stale target, no Root fallback |
| Right-logical sibling behavior | target upper/lower zones resolve BEFORE/AFTER, common-parent dashed preview, exact sibling index |
| Right-logical child behavior | explicit right-tail zone, target-parent dashed preview, child insertion and metadata preservation |
| Canvas preview | no insertion line, one green dashed candidate-parent link, live destination-node displacement, cleanup/cancel |
| Drag safety | subtree exclusion, self/descendant/Root-invalid rejection, one-step undo, Escape cancellation |
| Historical regressions | themes, root fill, quick actions, images, structured selection/paste, storage, checkpoints and diagnostics |
| Browser acceptance | real pointer/keyboard sequences for outline Enter/delete/drag and logical neutral/before/after/child/cancel |
