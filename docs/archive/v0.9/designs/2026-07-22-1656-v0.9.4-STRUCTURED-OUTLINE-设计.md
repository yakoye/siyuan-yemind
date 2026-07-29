# YeMind v0.9.4 unified structured outline design

## Goal

The outline must look and behave like one tree while also supporting the continuous text interactions users expect from a document editor. v0.9.4 therefore removes the user-facing text/node mode split instead of synchronizing two parallel editors.

## Reference现场

The supplied `siyuan-kmind-zen(5).zip` and screenshots were used as behavioral references for:

- one continuous editable document containing semantic outline rows;
- non-editable expand/leaf controls inside the same document;
- native selection that can cross node boundaries;
- black branch/leaf markers;
- depth guides and explicit drag insertion feedback;
- selection-complete formatting controls.

YeMind does not call or copy compressed private KMind Zen modules. The implementation uses YeMind-owned TypeScript, current map repositories and public browser selection/contenteditable behavior.

## Data flow

```text
MindMapTree (authoritative)
    ↓ projection by stable UID
StructuredOutlineBlock[]
    ↓ incremental DOM reconciliation
one contenteditable outline root
    ↓ selection/edit/drag transaction
StructuredOutlineBlock[]
    ↓ buildTreeFromStructuredOutline()
MindMapTree
    ↓ one upstream updateData() command
canvas + repository + undo history
```

The outline DOM is an editing projection. It is not separately persisted.

## Row model

Each top-level DOM row stores:

- stable node UID;
- logical depth and parent UID;
- hidden/collapsed state;
- branch/leaf status;
- editable node content;
- a dedicated non-editable drag gutter;
- a non-editable expand triangle or leaf square.

Every visible row is a direct child of one contenteditable root, so the browser can create a single native range across rows. Collapsed descendants remain in the logical projection with `display:none`; ordinary mouse selection follows visible content, while whole-outline copy serializes the complete tree.

## Selection semantics

### Ctrl/Cmd+A

1. With a caret or partial selection inside one node, select that node's full content.
2. When that node is already fully selected, select the complete outline.
3. When the current range spans more than one node, select the complete outline immediately.
4. Selection state is range-based, not time-based. Moving the caret or changing the range clears the previous whole-outline state.

The second stage visually covers visible rows, while copy/paste operations use the complete logical tree, including collapsed descendants.

### Copy and cut

- A single-node range copies only the selected rich fragment.
- A cross-node range emits indentation-aware `text/plain` and safe `text/html`.
- Whole-outline copy includes collapsed descendants.
- Internal UIDs and storage identifiers are not exposed in external clipboard formats.
- Readonly mode permits selection and copy; cut behaves as copy and does not mutate data.

### Paste

- Paste always replaces the live selection.
- Single-line paste inside one node is an inline replacement and preserves the node UID and metadata.
- Multiline paste parses indentation into hierarchy.
- Cross-node replacement preserves unselected prefix/suffix text, reuses boundary node identities where possible and removes only fully covered nodes.
- Replacing one current node with multiline content keeps that node's existing child subtree unless the selection explicitly covered it.
- `Ctrl/Cmd+Shift+V` forces plain text.
- Unsafe external HTML is sanitized.
- One paste becomes one undoable tree transaction.
- Rejected or failed apply rolls the outline projection back atomically.

## Editing and keyboard routing

- `Enter`: create the next structured line/node.
- `Shift+Enter`: insert a hard break inside the current node.
- `Tab` / `Shift+Tab`: indent or outdent the current range's involved nodes.
- `Backspace` / `Delete`: normal text deletion first; row merge/structured deletion only at boundaries.
- IME composition remains local until `compositionend`.
- Undo/redo is delegated to the map command history, not a parallel browser history.

## Drag model

Text is never a node drag handle. Structural drag begins only from the dedicated left gutter.

Drop intent is one of:

- `before`: same/parent-level insertion before the target;
- `inside`: child insertion into the target;
- `after`: same/parent-level insertion after the target.

The indicator uses the resolved target depth rather than the pointer's raw x-coordinate, so users can see the exact hierarchy that will result before releasing the pointer.

## Visual contract

- Branch: 7 × 7 px pure black triangle.
- Leaf: 7 × 7 px pure black square.
- Indentation: retained indent-rainbow guide lines.
- Default row: transparent.
- Hover row: `#ececec`.
- Active/editing row: `#deeae6` plus YeMind green text.
- No row/input border, outline, inset shadow or left accent bar.
- Rich-format toolbar remains hidden while pointer selection is in progress and appears after selection completes.

## Synchronization rules

- Stable UID is the primary identity key.
- DOM reconciliation protects rows participating in the live selection.
- External canvas updates patch rows incrementally where possible.
- Current selection and caret are restored by UID/offset bookmarks.
- A structural apply updates `current.data` only after the engine accepts the transaction.
- Rejected applies restore the last committed tree projection.

## Non-goals

- No second text document is persisted.
- No direct dependency on KMind Zen compressed internals.
- No use of `setData()` for outline commits because it clears history.
- No pointer-drag initiation from editable text.
