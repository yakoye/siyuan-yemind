# YeMind Zen v0.5.3 Verification

## Scope

This release only adds same-map node subtree copy, cut and paste through the native `simple-mind-map` renderer, commands and in-memory clipboard path.

## Upstream contract reviewed

- `Render.copy` and `copyNode` select only top ancestors and clone complete subtrees.
- `Render.cut` delegates to `CUT_NODE`; root nodes are filtered by the upstream implementation.
- `Render.paste` uses `beingCopyData` when `disabledClipboard` is enabled.
- `PASTE_NODE` delegates to `INSERT_MULTI_CHILD_NODE` for insertion, IDs, activation and rendering.
- Native `KeyCommand` owns Ctrl/Cmd+C/X/V and suspends canvas shortcuts while node text is being edited.

## Regression coverage added

- YeMind command adapter delegates directly to renderer copy, cut and paste.
- Mind-map creation enables the upstream permission-free in-memory clipboard path.
- YeMind Editor does not register a second clipboard shortcut dispatcher.
- Node context menu exposes only same-map copy, cut and paste actions.
- Upstream top-ancestor filtering prevents duplicated descendant subtrees.
- Upstream subtree cloning removes old IDs and active state while retaining descendants.

## Fresh verification results

- `npm test`: 34 test files passed, 77 tests passed.
- `npm run check`: TypeScript completed with no errors.
- `npm run build`: Vite built 839 modules successfully.
- `node --check index.js`: completed successfully.
- Post-build `buildOutput` and `pluginIdentity` tests: 2 test files passed, 2 tests passed.
- Packaged ZIP: all entries are under `siyuan-yemind-zen/`; plugin ID, display name and version were checked; `unzip -t` and extracted `node --check` completed successfully.
