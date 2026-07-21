# YeMind v0.6.7 Verification

Date: 2026-07-21

## Release scope

- Whole-map custom background reuses the shared 52-color palette.
- HEX and RGB fields are editable, synchronized and applied only for valid colors.
- Color-panel input, paste and IME events remain isolated from nodes and shortcuts.
- YeMind results are inserted at the beginning of SiYuan's native search-result region when that region is available.
- Search results activate on pointer-down/mouse-down before host blur or result rebuilding can remove them.
- Comment timestamps, per-comment actions and footer actions are right-aligned.

## Automated verification

```text
Test files: 145 passed
Tests: 385 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 897
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 145 files / 385 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
Version consistency: 0.6.7
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

No dependency was added, removed or force-upgraded for this release.

## Focused regression coverage

- 52 shared color swatches;
- Reset Default and native More Colors;
- editable HEX/RGB conversion and live application;
- input-event isolation;
- native search-result-region placement;
- pointer-down search activation and duplicate suppression;
- delayed map-node focus after tab loading;
- comment timestamp, card action and footer alignment;
- all prior canvas rich-text, outline editing, fold/expand, deletion, drag, note, comment, image, summary and style regressions.

## Manual desktop acceptance

The current environment cannot launch the user's Windows SiYuan 3.7.2 UI. Real desktop acceptance should confirm:

1. The custom background palette opens above the editor and remains usable in narrow windows.
2. Search results appear in the upper native result area shown in the user's screenshot.
3. Pressing a result opens the corresponding YeMind map and then focuses the node when possible.
4. Comment timestamps and all card/footer actions align to the right in light and dark themes.
