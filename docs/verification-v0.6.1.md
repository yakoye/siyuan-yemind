# YeMind v0.6.1 Verification Report

Date: 2026-07-20

## Release scope

v0.6.1 fixes the split/full-outline text-selection conflict and consolidates duplicate editor controls:

- An active outline Quill editor and its complete host own mouse/pointer selection; drag-selecting text cannot arm whole-row structure dragging.
- Non-editing rows retain the existing whole-row hierarchy drag behavior and deliberate long-press protection for labels.
- The top toolbar removes Add Child, Add Sibling, Checkpoints, Undo and Redo; Search remains at the top.
- Line Style and Node Style are explicit icon-and-text top controls.
- The left Reset View entry becomes History and opens the existing checkpoint/history function; left Fit is removed while Undo/Redo remain.
- Bottom Search is removed and bottom Fit remains.
- Note and Comment close controls live inside the top-right of their own content surfaces.
- The YeMind brand and current-map title use the exact plugin icon green (`#176b50`) rather than the previous dark background.

## Root cause: outline selection versus structure drag

The whole-row pointer controller armed a drag session for any pointer down inside `[data-outline-editor]`. When Quill was active, movement used for native text selection could therefore cross the long-press and distance threshold and be converted into a structure drag.

The fix establishes an explicit ownership rule:

- `.ql-editor`, every contenteditable descendant and the active `.is-editing` host are text-selection targets;
- those targets return before a structure-drag session is created;
- active-editor rows use `touch-action: auto` and `user-select: text`;
- structure drag remains available only outside editing mode.

## Automated verification

```text
Test files: 126 passed
Tests: 335 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 890
Built index.js syntax: passed
```

### v0.6.1 focused coverage

- Active Quill/contenteditable surfaces are classified as text-selection targets.
- An active editor can never start structure dragging, even after long movement.
- A non-editing label still starts deliberate long-press structure dragging.
- Top toolbar contains only the requested project actions and no Add Child/Add Sibling/Checkpoints/Undo/Redo.
- History exists only on the left rail; left Fit and Reset are absent; bottom Fit remains and bottom Search is absent.
- Note and Comment use content-local close controls and hide the SiYuan host close header.
- Brand and current-map title use the plugin icon green.

### Accumulated user-feedback regression coverage

The complete suite also keeps explicit tests for:

- Root and ordinary branch collapse/expand;
- hidden-count and outline-triangle expansion from persisted children;
- selected/unselected `+ / −` quick-action rules;
- canvas and outline Delete/Backspace editing isolation and empty-row structural deletion;
- right-button canvas panning, grabbing state and context-menu suppression;
- real SVG double-click, partial canvas text selection and range-only Bold/Underline;
- stable outline Quill DOM, IME, automatic save and keyed patching;
- outline hierarchy dragging and invalid target rejection;
- colors, notes, comments, node images, node styles, summaries, themes, layouts, checkpoints and persistence.

## Dependency audit

No dependencies changed in v0.6.1. The online npm audit endpoint returned HTTP 400 in the build environment, so a fresh online vulnerability count could not be verified. `npm audit --omit=dev --offline` completed and reported zero cached findings; this is recorded as an offline result rather than a substitute for a current online audit.

## Release-package verification

```text
ZIP entries: 394
Regular files: 394
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 126 files / 335 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted Vite modules: 890
Extracted index.js syntax: passed
Manifest/package/runtime version identity: 0.6.1
Forbidden node_modules/dist/.git entries: 0
```

## Manual Windows SiYuan acceptance

The automated environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Install the package and verify:

1. In split and full-outline view, enter an existing row and drag-select several characters in both directions; the row must not move.
2. Apply Bold, Underline, colors and links to the selected outline range and continue typing without losing the editor.
3. Exit editing, then hold and drag the same row to verify hierarchy dragging still works.
4. Confirm the top, left and bottom controls appear exactly once in their requested locations.
5. Open Note and Comment and confirm the close button sits inside the upper-right corner of each content panel.
6. Recheck Root/branch folding, count/triangle expansion, Delete/Backspace editing, right-button canvas panning and canvas partial rich-text selection.
