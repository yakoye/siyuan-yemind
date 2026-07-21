# YeMind v0.6.8 Verification

Date: 2026-07-21

## Release scope

- Remove the detached YeMind search card from the search-input container.
- Insert YeMind node matches into SiYuan's native `#searchList` as individual result rows.
- Show matched node content on the left and map/node path metadata on the right.
- Render a bounded, read-only outline context in `#searchPreview` while preserving the native Protyle preview underneath.
- Support single-click preview, double-click/Enter open, Alt+click/Alt+Enter right-side open, ArrowUp/ArrowDown and PageUp/PageDown navigation.
- Restore YeMind result rows and preview after SiYuan rebuilds the global-search DOM, without duplicate insertion.
- Fall back to opening the corresponding map when exact node focus cannot complete.
- Remove all user-provided real search HTML/content from the packaged fixtures and retain only a sanitized structural fixture.

## Automated verification

```text
Test files: 146 passed
Tests: 395 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 897
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 146 files / 395 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
Version consistency: 0.6.8
Forbidden directories in ZIP: 0
Nested ZIP files: 0
User-provided private fixture content: 0
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing `simple-mind-map` dependency chain (`quill` and `uuid`). The available automatic fixes require force-installing breaking or older dependency versions, so no dependency was force-changed in this interaction-focused release.

## Focused regression coverage

- Native `#searchList` mounting and absence from the search header;
- result text, highlighted query and path metadata;
- single-click preview versus double-click open;
- Enter and Alt-open intent;
- native preview restoration;
- stale-row cleanup when the query changes;
- ArrowUp/ArrowDown navigation and handoff to native results;
- recovery after host result-list rebuilding, without duplicates;
- right-side `openTab` propagation;
- bounded outline preview generation;
- all prior folding, Root expansion, Delete/Backspace isolation, right-button canvas panning, outline drag/edit, rich-text selection, notes, comments, images, summaries, colors and styles.

## Manual desktop acceptance

The current environment cannot launch the user's Windows SiYuan 3.7.2 UI. Real desktop acceptance should confirm:

1. YeMind rows appear inside the native result list and never cover the search input.
2. A single click selects a YeMind row and changes the preview without closing global search.
3. The preview displays an outline centered on the matched node and restores the native document preview when selecting a normal SiYuan result.
4. Arrow keys move through YeMind rows and continue into native rows.
5. Enter/double-click opens the map, while Alt+Enter/Alt+click opens it on the right.
6. Repeated searches, filters and host rerenders do not duplicate YeMind rows or leave stale previews.
