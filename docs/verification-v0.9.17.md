# YeMind v0.9.17 verification

## Completed automated gates

- Test entry domains: 15.
- Registered scenario modules: 191.
- Test declarations discovered by the TypeScript source scan: 577, with 0 skipped/todo declarations.
- TypeScript syntax scan: 335 files passed.
- TypeScript strict check: passed.
- Offline behavior entries: 7 passed.
- Offline production bundle: 261 modules; `node --check index.js` passed.
- Chromium regression scripts: 18 passed, including the new live-width, menu-state and stale-outline-selection scenario; page and console error counts were zero in every script.
- Resource-excluded archive: ZIP CRC and full extraction passed; no `assets/`, `node_modules/`, user map/settings/checkpoint data or nested ZIP files were included.
- Extracted package: TypeScript, structure, offline behavior, entry syntax, v0.9.16 image interaction and v0.9.17 interaction smoke passed.
- Extracted source rebuild produced a byte-identical `index.js`; root `index.css` matched `src/styles/index.css`.

## Network-dependent gates not completed

The configured npm gateway returned HTTP 503 while fetching `whatwg-url-14.2.0.tgz`. Therefore the following are explicitly not claimed as passed:

- `npm ci` in the source and extracted package.
- Formal Vitest execution.
- Formal Vite production build and Vite module count.

`npm test` reached the 15-domain/191-module structural check and then stopped because the Vitest executable was unavailable. `npm run build` stopped because the Vite executable was unavailable. The offline production builder and Chromium regressions are supplemental verification, not a false declaration that those formal commands passed.

## Manual focus

- Keep the pointer pressed while resizing node width and verify descendants and edges track continuously in a large real map.
- Open the single-node menu on normal, todo and outer-frame nodes.
- Enter edit through the menu and verify all text is selected.
- In split mode, leave a selection in one outline row, then click multiple different canvas nodes and verify no jump back occurs.
