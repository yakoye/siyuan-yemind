# YeMind Zen v0.5.11 Verification Report

Date: 2026-07-17

## Scope

v0.5.11 fixes two user-reported runtime areas:

1. Existing maps remain invisible after restart until a new map is created.
2. Split and full outline views are read-only and cannot directly edit node text or structure.

The release keeps the plugin ID, persistent storage names, map schema, native history, structured drag, diagnostics isolation, checkpoints, todo semantics, and zero-size canvas protections unchanged.

## Diagnostic evidence

The `yemind-diagnostics-20260717-130840.zip` archive was exported from SiYuan 3.7.2 on Windows with plugin v0.5.10.

- The session recorded `plugin/onload`.
- It did not record `bootstrap-started`, `bootstrap-completed`, or `bootstrap-failed`.
- The self-check saw zero maps because the real repository had not been loaded.
- After creating a map, the final summary contained four maps: the three existing maps plus the newly created one.

This proves that existing map data was still present. A synchronous host-surface registration stopped `onload()` before bootstrap, and map creation later triggered `MapRepository.ensureLoaded()`. The old diagnostics did not record each registration step, so the exact failing host API cannot be identified from that archive alone.

## Implemented startup fix

- Added `initializePluginStartup` as a small startup coordinator.
- The real repository, settings, and checkpoint bootstrap starts before Tab, Dock, Settings, command, and plugin-URL registration.
- `whenReady()` immediately points to the real bootstrap Promise.
- Each registration step is isolated so one synchronous host API failure cannot leave the repository unloaded.
- Added per-step `registration-started`, `registration-completed`, and failure diagnostics.
- Kept existing Dock readiness and restored-tab non-zero-size waiting.

## Implemented editable outline

- Split and full outline modes share one editable outline implementation.
- Split view places the outline after the canvas, so it appears on the right.
- Full outline fills the workspace without resizing the hidden canvas.
- Every visible row uses an auto-growing text editor with hierarchy metadata.
- Text commits on blur or navigation.
- Enter creates a sibling; Enter on the root creates a child.
- Tab creates a child; Shift+Tab does not accidentally create one.
- Empty Backspace/Delete removes a non-root node and focuses the previous visible row.
- ArrowUp/ArrowDown move between visible outline rows.
- Escape restores the original text and cancels the edit.
- Read-only mode preserves selection/navigation while blocking mutations.

## Upstream ownership

Outline mutations delegate to installed `simple-mind-map` 0.14.0-fix.3 native commands:

```text
SET_NODE_TEXT
INSERT_NODE
INSERT_CHILD_NODE
REMOVE_NODE
GO_TARGET_NODE
```

The implementation does not directly splice `MindMapTree.children`, create a second undo stack, or duplicate upstream deletion/layout behavior.

## Automated verification

```text
Test files: 85 passed
Tests: 204 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 872
Built index.js syntax: passed
ZIP integrity: passed
Extracted index.js syntax: passed
```

Focused new coverage includes:

- bootstrap starts before all host-surface registrations
- the real readiness Promise is published before a synchronous Dock/Tab registration can call `whenReady()`
- a failed registration is isolated and later registrations continue
- editable and read-only outline markup
- Enter, Tab, Shift+Tab, Backspace/Delete, ArrowUp/Down, and Escape action resolution
- explicit UID native command targets for text, sibling, child, and remove operations
- root/read-only mutation guards
- outline placement after the canvas for right-side split view

The full suite also re-ran persistence, diagnostics, checkpoints, restored tabs, safe resize, todo, structured drag, clipboard, selection, rich text, relation, outer frame, search, settings, and lifecycle regressions.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

These remain existing upstream dependency findings. No bottom-layer package was force-upgraded in this release.

## Remaining manual verification

The current environment cannot launch and click the user's Windows SiYuan 3.7.2 desktop UI. After installing v0.5.11, verify:

1. Restart SiYuan and confirm all existing maps appear without creating a new map.
2. Confirm restored existing-map tabs no longer show “导图不存在”.
3. Restart a second time and confirm the list is still present.
4. Export diagnostics and confirm `bootstrap-started`, `bootstrap-completed`, and per-registration events exist.
5. In split view, confirm the outline is on the right and text edits persist to the map.
6. In full outline, test Enter sibling, root Enter child, Tab child, empty Backspace/Delete, ArrowUp/Down, and Escape.
7. Switch outline → split → map and confirm no zero-size canvas error.
8. Reopen the edited map and confirm text and structure persistence.
