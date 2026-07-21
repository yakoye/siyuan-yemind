# YeMind v0.5.17 Verification Report

Date: 2026-07-18

## Scope

This release stabilizes split/full-outline editing and completes the approved note, color, menu, zen-mode and diagnostics changes:

- stable UID-keyed outline rows with one persistent active Quill editor;
- IME-safe input, non-destructive Backspace/Delete and boundary-aware navigation;
- a dedicated drag handle on every movable outline row, using existing upstream structure commands and history;
- editable bidirectional HEX/RGB color inputs with editor-event isolation and selection restoration;
- long-form node notes with pasted images, resizable editing dialogs and hover previews;
- comment hover previews and guaranteed plugin-owned note/comment icons;
- TODO menu semantics of Add TODO / Remove TODO, while the checkbox controls complete/incomplete state;
- zen capsule text `● 禅` and expanded text `● 退出禅模式`;
- UI terminology `模糊/取消模糊` and formula affordance `π`;
- problem-time diagnostic markers, reduced repeated view noise and manifest/runtime/build version consistency checks.

The release keeps YeMind's existing `simple-mind-map` structure, command/history owner, persistence format and checkpoint architecture. It does not import KMind's private document kernel.

## Official-source and Superpowers workflow

- The supplied official KMind Zen 0.34.0 package was researched before implementation.
- Official behavior and adaptation boundaries are recorded in `docs/official-source-outline-notes-analysis-v0.5.17.md` and `docs/OFFICIAL_FEATURE_PARITY_v0.5.17.md`.
- Design is recorded in `docs/superpowers/specs/2026-07-18-v0.5.17-outline-notes-color-diagnostics-design.md`.
- The executable plan is recorded in `docs/superpowers/plans/2026-07-18-v0.5.17-outline-notes-color-diagnostics.md`.
- New behavior was first expressed through failing regression tests, including sanitizer safety, drag focus timing, dialog resizing and outline boundary navigation.
- Focused tests were turned green before the full release chain was run.

## Focused automated coverage

- valid and invalid HEX/RGB parsing, bidirectional conversion and safe live application;
- keyboard, paste and composition event isolation inside color controls;
- opening toolbar popovers without losing the current rich-text selection;
- persistent active outline editor during data synchronization and autosave;
- empty outline text commits without structural deletion;
- Chinese IME composition without premature commit or structure commands;
- Backspace/Delete confined to text editing;
- ArrowUp/ArrowDown only leaving the editor at real text boundaries;
- row drag intent before/inside/after and upstream move-command routing;
- root, self, descendant and generalization drag rejection;
- note normalization, sanitization, image paste and dialog resize limits;
- count-free note/comment node decorations and hover-preview lifecycle;
- TODO add/remove menu semantics;
- zen capsule collapsed/expanded text;
- diagnostic marker windows, event coalescing and version mismatch detection;
- existing startup, save, checkpoints, rich text, clipboard, layouts, themes, image handling and context menus.

## Verification commands

```text
npm run check
npm run build
node --check index.js
npm test
npm audit --omit=dev --json
```

## Results

```text
Test files: 104 passed
Tests: 271 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 885
Built index.js syntax: passed
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing dependency chain. No bottom-layer dependency was force-upgraded for this editor interaction release.

## Data and runtime boundaries

- Plugin ID: `siyuan-yemind-zen`.
- Display name: `YeMind`.
- Version: `0.5.17` in package metadata, plugin metadata and runtime constants.
- Existing map, checkpoint and settings file names are unchanged.
- Outline drag operations remain upstream command/history operations.
- The underlying cloze data format remains unchanged even though the UI now says `模糊/取消模糊`.
- Notes use a dedicated `yemindNote` field and do not replace the existing comment timeline.
- Note/comment preview HTML is sanitized before display; comments are escaped.

## Package verification gates

The release archive must exclude `node_modules/`, temporary `dist/`, `.git/`, caches and prior archives while retaining built runtime files, complete TypeScript source, tests, Superpowers skills, architecture, design, implementation plan, official-source research, feature matrix, changelog and verification documentation. The final archive is checked with `unzip -t`, fully extracted, and the extracted `index.js` is checked again with Node.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should verify:

1. Type and delete long Chinese/English text continuously in split and full-outline views without focus loss or node deletion.
2. Drag every non-root outline row before, inside and after another row; confirm map synchronization and undo/redo.
3. Enter HEX/RGB values while a partial rich-text range is selected; confirm only the selected text formatting changes.
4. Create long notes, paste images, resize the note dialog and test note/comment hover transfer into the preview.
5. Verify TODO add/remove wording, checkbox completion behavior, note/comment menu icons, `● 禅` expansion, `模糊/取消模糊` and `π`.
6. Mark a reproduced problem in diagnostics and confirm the exported report contains the surrounding focus/editor/structure event window and matching versions.
7. Save, reopen and restore checkpoints after outline edits, drags, notes, comments and formatting changes.
