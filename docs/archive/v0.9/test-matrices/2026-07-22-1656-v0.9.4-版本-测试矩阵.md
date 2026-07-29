# YeMind v0.9.4 test coverage matrix

| Domain | v0.9.4 coverage |
|---|---|
| Unified surface | No text/node switch, no textarea, one contenteditable structured root |
| Projection | Complete tree flattening, collapsed descendants retained logically, UID/depth/parent metadata |
| Rebuild | Stable UID reuse, notes/tags/images/local styles preserved, illegal depth normalization |
| Selection | Current-node first Ctrl/Cmd+A, full outline second, cross-node direct promotion, stale whole-range reset |
| Clipboard | Single-node and cross-node copy, indentation output, rich/plain HTML, hidden descendants, selection replacement |
| Paste | Inline replacement, multiline hierarchy, existing child preservation, full-outline replacement, punctuation unescape |
| Transactions | One `updateData()` tree apply, rejected-apply rollback, no `setData()` history reset |
| Rich content | Safe HTML sanitation, meaningful formatting detection, boundary fragment preservation |
| IME | No reconciliation during composition; commit after compositionend |
| Readonly | Focusable outline, staged select-all/copy allowed, paste/undo/redo mutation blocked |
| Keyboard | Enter, Shift+Enter, Tab/Shift+Tab, delete/merge and map undo/redo routing |
| Markers | Equal 7 px pure-black triangle and square |
| Guides | indent-rainbow retained across depths |
| Flat states | `#ececec` hover, `#deeae6` active, no border/outline/shadow/left accent |
| Drag | Dedicated gutter, before/inside/after intent, parent-depth aligned insertion line |
| Toolbar | Hidden while selecting, shown only after selection completes |
| Performance | 601-node structured paste browser regression |
| Historical regressions | Theme/root fill, rainbow redraw, canvas hover quick actions, repository persistence |
| Packaging | Flat ZIP, no user data or dependency/temp directories, clean extraction and deterministic rebuild |
