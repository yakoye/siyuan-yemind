# YeMind Zen v0.5.19 Verification Report

Date: 2026-07-18

## Release scope

v0.5.19 fixes the four regressions reported after v0.5.18:

- An empty non-Root outline row can be removed with Backspace or Delete, including its matching map node.
- Outline collapse/expand is repeatable and no longer writes the canvas node `expand` field.
- The outline displays subtle repeating hierarchy guides similar to VS Code indent-rainbow.
- Canvas Backspace/Delete filters Root nodes before the upstream command, avoiding the “cannot delete all Root nodes” dialog.

## Root-cause evidence

1. `resolveOutlineKeyAction()` treated an empty editor as normal text editing, so no explicit structural-delete transaction existed.
2. Outline disclosure read and wrote `node.data.expand`; clicking an outline triangle therefore collapsed the canvas and made outline reconciliation depend on canvas rendering state.
3. Delete commands could still enter the upstream shortcut path with Root in the active selection, where KMind's Root-count guard displayed the error dialog.
4. Outline depth was represented only by left padding, which made larger trees difficult to scan.

## TDD and focused regression

The first v0.5.19 focused run produced the expected failures for missing `delete-empty`, local collapsed UID state, Root-safe shortcut resolution and indent guides. Implementation was then completed in small steps and the focused suites turned green before the full regression run.

Focused coverage includes:

- empty non-Root Backspace/Delete and Root/composition/modifier guards;
- map `expand:false` not hiding outline descendants;
- local Root and branch collapse/expand round trips;
- stale collapsed UID pruning;
- capture-phase keyboard interception;
- `allow/block/safe-delete` upstream shortcut decisions;
- mixed Root + ordinary-node deletion filtering;
- four-level non-interactive indent guides.

## Direct workspace verification

```text
Test files: 111 passed
Tests: 294 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 885
Built index.js syntax: passed
Package version: 0.5.19
Plugin version: 0.5.19
Runtime version: 0.5.19
```

## Extracted-package verification

The source archive was fully extracted into a clean directory and checked independently:

```text
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted index.js syntax: passed
Extracted npm ci: passed
Extracted test files: 111 passed
Extracted tests: 294 passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted Vite modules transformed: 885
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing Quill/simple-mind-map/uuid dependency chain. The suggested automated fixes downgrade or replace the selected mind-map dependency and are therefore not applied in this interaction-stability release.

## Package contents

The archive retains complete TypeScript source, tests, Superpowers skills, design and implementation plans, architecture, changelog, feature matrix, migration status, official parity notes and verification documentation. It excludes `node_modules/`, temporary `dist/`, `.git/` and prior ZIP archives.

Expected final archive inventory after adding this report:

```text
ZIP entries: 395
Regular files: 355
```

## Remaining Windows SiYuan acceptance

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Installation should still verify:

1. Create a blank non-Root outline row and press Backspace/Delete; the row and canvas node should disappear and focus should move to a neighboring row.
2. Repeatedly collapse and expand Root and nested branches; the outline should change while the canvas remains unchanged.
3. Select only Root, then a mixed Root + child selection, and press Delete/Backspace; no KMind Root error dialog should appear and only ordinary nodes should be removed.
4. Check the hierarchy guides in light/dark themes and confirm they do not interfere with text selection, row dragging, disclosure buttons or hover states.
5. Recheck undo/redo, autosave, reopen, checkpoints and Chinese IME around empty-node deletion.
