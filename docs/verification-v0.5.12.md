# YeMind v0.5.12 Verification Report

Date: 2026-07-17

## Scope

v0.5.12 ports the verified interaction mechanisms from the user-provided KMind Zen 0.33.0 public production bundle into the existing YeMind architecture:

1. commit-before-structure outline transactions and precise focus restoration;
2. IME-safe keyboard editing, indent/outdent and collapse/expand;
3. adjustable and persisted split ratio;
4. animation-frame drag sampling, 60 ms/3-frame target stability and cubic parent guides.

The release does not import KMind Zen's private document model, editor state, persistence, history or layout engine. It keeps YeMind's plugin ID, storage names, map schema, diagnostics isolation, checkpoint storage and `simple-mind-map` structural ownership unchanged.

## Official source evidence reviewed

The reviewed package identifies itself as KMind Zen 0.33.0 and contains its complete production `index.js` runtime.

The formatted bundle shows:

- outline key handling around lines 149003–149175;
- `event.isComposing` protection;
- Shift+Enter hard break, Enter commit/create/focus, Tab/Shift+Tab indentation, empty deletion and caret-boundary collapse/expand;
- drag intent stability constants of 60 ms and 3 frames around lines 136508–136543;
- animation-frame pending-move coalescing around lines 138524–138610;
- horizontal/vertical cubic parent-guide geometry and original-parent style around lines 105218–105275.

See `docs/official-source-analysis-v0.5.12.md` for the full mapping.

## Implemented outline behavior

- Text changes commit through upstream `SET_NODE_TEXT`.
- Text commits suppress a full outline DOM rebuild for that data-change cycle.
- Structural operations are serialized with a structure transaction guard.
- Focus restores by node UID and start/end/select-all/exact range placement.
- IME composition does not trigger structure shortcuts.
- Enter inserts a sibling; root Enter inserts a child.
- Shift+Enter inserts a newline inside the current node.
- Tab indents under the previous sibling; Shift+Tab moves one level up.
- Empty Backspace/Delete removes a non-root node and focuses an adjacent visible row.
- ArrowUp/ArrowDown commit and navigate visible rows.
- ArrowLeft/ArrowRight collapse or expand childful nodes only at the relevant caret boundary.
- Collapsed descendants are omitted from the visible outline.
- Read-only mode keeps navigation but blocks mutation.

## Implemented split behavior

- Divider is located between the canvas and the right-side outline.
- Ratio defaults to 42% and is clamped to 25%–70%.
- Pointer updates are animation-frame coalesced.
- ArrowLeft/ArrowRight adjust the ratio; double-click and Home restore the default.
- Ratio persists in `settings.json` through the existing SettingsStore.
- Canvas resize uses the existing non-zero-size safe-resize contract.

## Implemented drag behavior

- `YeMindDrag` still extends the installed upstream `Drag` plugin.
- The raw candidate is still calculated by upstream `checkOverlapNode`.
- The fixed upstream 300 ms overlap throttle is replaced with animation-frame scheduling.
- A candidate must remain for at least 60 ms and three matching frames before becoming stable.
- A stable child target or sibling parent is connected to the ghost with a green `6 6` cubic guide.
- Without a stable new target, a red `3 6` cubic guide continues to point to the original parent.
- Horizontal and vertical layouts use separate endpoint/control-point geometry.
- Final drop remains upstream-owned through `MOVE_NODE_TO`, `INSERT_BEFORE` and `INSERT_AFTER`.

## Automated verification

```text
Test files: 86 passed
Tests: 212 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 873
Built index.js syntax: passed
ZIP integrity: passed
Extracted index.js syntax: passed
```

Focused coverage includes:

- IME and full outline keyboard action resolution;
- collapsed descendant filtering and editable/read-only markup;
- native indent, outdent and expansion command bridges;
- split divider order, accessibility and ratio normalization;
- settings persistence/clamping for the split ratio;
- 60 ms/3-frame drag target stabilization;
- pending reset when candidates change;
- horizontal/vertical cubic paths;
- distance-dependent original-parent line style;
- existing startup, persistence, diagnostics, checkpoints, safe resize, todo, clipboard, selection, rich text, relation and outer-frame regressions.

## Package identity

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind
Version: 0.5.12
Archive file entries: 328
Archive regular files: 287
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in Quill and the installed upstream dependency chain. This interaction release does not force-upgrade the bottom-layer mind-map/editor packages without a separate compatibility plan.

## Remaining manual verification

The current environment cannot launch and click the user's Windows SiYuan 3.7.2 desktop UI. After installing v0.5.12, verify:

1. Restart twice and confirm existing maps appear without creating a new map.
2. Edit Chinese text with an IME and press Enter while choosing candidates; no node should be created accidentally.
3. Test Enter, root Enter, Shift+Enter, Tab, Shift+Tab, empty Backspace/Delete, ArrowUp/Down and ArrowLeft/Right repeatedly.
4. Confirm focus and caret position remain on the expected node after every structure change.
5. Drag the split divider, use keyboard adjustment, double-click reset, restart and confirm the ratio persists.
6. Drag nodes slowly and quickly across target boundaries; the cubic parent guide should follow smoothly without flickering.
7. Test horizontal and vertical/organization layouts.
8. Confirm final child/sibling structure, undo/redo, autosave and reopen behavior remain correct.
9. Export a diagnostics archive if any startup, editor-mount, resize or save issue remains.
