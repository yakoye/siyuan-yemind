# YeMind v0.9.3 verification

Date: 2026-07-22

## Release scope

v0.9.3 fixes three connected editor behaviors:

1. a transparent center topic now resolves against the effective theme/project canvas background, so branch lines cannot show through its text area;
2. node add/collapse/expand actions are owned by pointer hover as well as selection, with a delayed node-to-button bridge;
3. split and outline views now default to one continuous text document that supports native multiline selection, copy, cut, paste, replacement and indentation-based tree import.

The row-based node outline remains as a synchronized secondary mode for rich text, drag and expand/collapse operations. Storage file names and the persisted map schema are unchanged.

## Editing architecture

The continuous outline is not a parallel database. It serializes the active `MindMapTree` to one native textarea and reconciles the edited document back into the same tree.

- One line represents one node.
- Spaces, tabs and non-breaking spaces are accepted as indentation.
- The pasted indentation width is inferred; impossible depth jumps are clamped to one level.
- Common copied escapes such as `\:` and `\;` are normalized.
- One zero-indent first line is the center topic; several real zero-indent lines are imported as first-level children under the existing center topic.
- Stable UIDs and non-text metadata are preserved by exact, text and structural-path reconciliation. A completely rewritten label at the same structural path retains notes, tags, images and local styles.
- The result is committed through one upstream undoable `updateData()` transaction. `setData()` is deliberately not used because it clears command history.
- Chinese IME composition remains an editor-local draft until `compositionend`; no partial pinyin/composition state is written to the map.

The exact 34-line PCIe table-of-contents sample supplied for this release is retained in `docs/examples/outline-indentation-import.txt` and is used by the offline and real-browser gates.

## Executed source gates

- Theme generator: passed.
- Theme generator determinism: three consecutive outputs were identical.
- Generated theme catalog SHA-256: `29162c1c1f5cd3f713d7d1c279666aea918b8a81b6dcf57b0463a852626d3ac7`.
- Theme catalog: 19 named sources, 22 public presets and 25 concrete appearances passed.
- Existing border, branch-cycle, serialization and local-style-priority contracts passed.
- Test structure: 15 feature domains and 166 registered scenario modules passed.
- Static regression declarations: 488 `it`/`test` declarations, including 3 parameterized declarations.
- Strict TypeScript (`tsc --noEmit`): passed.
- Independent syntax transpilation: 291 non-declaration TypeScript source/test files passed.
- JavaScript, MJS and Python syntax checks: passed.
- Version consistency: package, lockfile root, plugin manifest, runtime constant and release metadata all report `0.9.3`.

## Focused offline contracts

Three standalone contract bundles passed:

- theme catalog, border coverage, branch cycles, serialization protection and local-style priority;
- exact rainbow replacement, one complete appearance redraw, selection restoration and transaction ordering;
- the complete 34-line indentation import, five-level hierarchy, escaped-colon normalization, round trip and metadata preservation after a completely rewritten label.

The deterministic production bundle was regenerated from current v0.9.3 source plus the formally verified v0.9.0 dependency Source Map:

- bundled modules: 246;
- bundle SHA-256: `c779ff7cb82ed6312923de4eae76d26b1761788ee3704e325e5dd9b1550a3acc`;
- two consecutive bundle and manifest generations were byte-identical;
- `node --check index.js`: passed.

## Real Chromium interaction gates

The bundled plugin was loaded in system Chromium with a SiYuan-compatible lifecycle mock. The following passed with zero page errors and zero console errors:

- plugin export/bootstrap and repository initialization;
- editor, SVG canvas and existing 22-theme menu mount;
- prior light/dark, theme, border and rainbow-line immediate-refresh regressions;
- viewport transform preservation across appearance changes;
- transparent 晨曦 center topic rendered as `#FFFFFF`, matching its effective canvas background;
- an unclicked branch exposed both collapse (`−`) and add-child (`+`) actions on hover;
- the action host remained present after the pointer crossed the visual gap and waited beyond the close delay;
- split view opened in continuous-text mode;
- native selection covered several node lines in one selection;
- the supplied 34-line document produced 34 nodes, five first-level branches and the expected five-level hierarchy;
- copied `\:` punctuation was normalized;
- repository persistence and text/tree mode synchronization passed;
- a simulated Chinese IME composition did not update the repository during composition and applied only after `compositionend`.

## Dependency service limitation

A clean `npm ci --ignore-scripts` was attempted. The configured internal package gateway returned HTTP 503 for many tarballs and terminated on `whatwg-url-14.2.0.tgz`. The clean dependency installation therefore could not complete, so this environment did not have local Vitest or Vite executables.

This report does **not** claim a formal Vitest run or a formal Vite build. The permanent suite remains registered and structurally checked; changed behavior was covered by strict TypeScript, independent transpilation, standalone contracts, deterministic bundling and real Chromium interaction tests.

## Release archive policy

The release archive is flat and intended for direct extraction into `data/plugins/siyuan-yemind/`. It excludes:

- `node_modules/`;
- `.git/`, caches and temporary build directories;
- nested ZIP files;
- `maps.json`, `settings.json` and `checkpoints.json`.

The final archive is extracted to a new directory and the generator, version, structural, TypeScript, deterministic bundle, offline contract, syntax, plugin-load and Chromium interaction gates are repeated there before delivery.
