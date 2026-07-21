# YeMind v0.6.9 Verification

Date: 2026-07-21

## Scope

- Exact numeric and Chinese leaf matches retain outline preview when SiYuan has zero native results.
- Hidden or removed preview hosts are restored after host DOM rebuilds.
- Enter/double-click closes global search before opening and focusing the map node.
- Alt+Enter/Alt+click preserve right-side opening.
- Target focus waits for rendering, then briefly highlights the node.

## Source workspace results

- Test files: 148 passed
- Tests: 402 passed
- TypeScript: passed
- Production build: passed
- Vite modules: 898
- Built entry syntax: passed
- Production dependency audit: 1 low, 2 moderate, 0 high, 0 critical

## Release package checks

The final ZIP is additionally checked for CRC integrity, forbidden directories, version consistency, complete extraction, clean dependency installation, full tests, TypeScript, production build and entry syntax.

## Extracted release verification

- ZIP CRC: passed
- Clean `npm ci`: passed
- Extracted tests: 148 files / 402 tests passed
- Extracted TypeScript: passed
- Extracted production build: passed
- Extracted entry syntax: passed
- Package/plugin/runtime version: 0.6.9
- Forbidden directories and nested ZIP files: none
