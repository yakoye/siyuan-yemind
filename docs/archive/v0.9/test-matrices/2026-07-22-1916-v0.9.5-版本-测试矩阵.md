# YeMind v0.9.5 test coverage matrix

| Area | Permanent coverage |
|---|---|
| Shared drag intent | NONE/BEFORE/AFTER/CHILD, sibling/child stabilization, immediate neutral clearing |
| Target safety | dragged subtree exclusion, self/descendant/root rejection, unchanged-position no-op |
| Outline initiation | invisible 14px gutter, move cursor, 5px threshold, text-selection isolation |
| Outline preview | 5px leaf square, unchanged triangle, green depth guide, parent alignment, child dwell |
| Canvas geometry | pointer-only hit testing, neutral node gaps, sibling edge slots, layout child tails |
| Canvas preview | original/candidate dashed parent link, green insertion line, no ghost collision |
| Transactions | metadata/UID preservation, one-step undo, redo, Escape cancellation, no-op protection |
| Image actions | unchanged 25px boxes, visually matched trash/magnifier, structural drag isolation |
| Historical regressions | structured outline editing, theme refresh, root fill, quick actions, rich text, storage and checkpoints |
| Browser acceptance | real pointer sequences for outline/canvas neutral, BEFORE, CHILD, parent alignment and Escape |
