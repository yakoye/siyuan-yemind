# YeMind v0.9.7 verification

## Scope

v0.9.7 rebuilds right-growing `logicalStructure` canvas dragging around the nearest legal node and an enlarged per-node local target box. The left upper/lower local regions mean sibling BEFORE/AFTER; the right body/tail means CHILD. One green dashed link is visible for the complete drag session and switches in the same pointer frame from the original parent fallback to the current candidate parent.

The release does not change persisted map, settings or checkpoint schemas. Other layout families keep their existing geometry adapters.

## Executed source checks

- Theme generator: 19 source themes, 25 light/dark appearances and 22 public presets.
- Test structure: 15 domains / 172 scenario modules.
- Registered test declarations: 512.
- TypeScript syntax: 302 source/test files passed independent transpilation.
- Strict TypeScript: passed with `tsc --noEmit`.
- Offline contracts: theme, appearance transaction, outline import, structured outline and drag intent all passed.
- Offline bundle: 246 reachable modules.
- `node --check index.js`: passed.
- Consecutive offline bundle builds produced byte-identical `index.js` and manifest files.

## v0.9.7 drag coverage

Permanent unit and offline coverage verifies:

- unequal short, wide and tall nodes use their own enlarged local target boxes;
- local left-upper, left-lower and right-side regions resolve BEFORE, AFTER and CHILD;
- current nearest target is retained near overlapping boundaries until another target wins beyond hysteresis;
- entering a new actual body/child side switches immediately;
- source nodes and descendants are excluded;
- unchanged source slots remain no-ops;
- candidate parent, index and reference target remain one atomic object.

Real Chromium pointer regression verifies:

- the green dashed parent link exists from the first active drag frame;
- open-space dragging keeps the line connected to the original parent;
- moving into a sibling quadrant connects to the target's existing parent;
- moving into the target's right side connects to the target node itself in the same pointer interaction;
- moving back to another sibling quadrant reconnects to the common parent without hiding the line;
- no logical-canvas insertion line is rendered;
- room-making preview follows the same candidate;
- CHILD and sibling releases commit the previewed structure;
- metadata survives the move and one undo restores the original tree;
- Escape cancels while the continuous guide remains visible;
- page errors and console errors were both zero.

## Historical regression

Executed Chromium regression also covered:

- plugin bootstrap, repository initialization and editor/SVG mounting;
- 22 theme options and 3/10/9 theme groups;
- theme, rainbow and dark-mode immediate refresh;
- transparent Root background resolution;
- hover-owned node add/collapse actions;
- unified structured outline, staged `Ctrl/Cmd+A`, cross-node selection and clipboard replacement;
- 34-node PCIe outline import and 601-node bulk paste;
- outline Enter splitting, soft breaks, two-stage empty-node deletion and stable green insertion guides;
- inherited-font “默认字体” presentation;
- image preview/delete/resize visual sizing and structural-drag isolation.

## Deterministic artifacts

- `index.js` SHA-256: `d224cee9c23bbc2322b5a0ac04426adffcba9242bbb6291688646e2bf89c5b0b`
- `docs/offline-bundle-manifest-v0.9.7.json` SHA-256: `1bbb5e1c96e42acee2a0004cdd95339ebbe4444222b5d783302c0229d6798a8d`

## Formal dependency limitation

A clean `npm ci --ignore-scripts` was attempted. The internal npm gateway returned HTTP 503 for `whatwg-url-14.2.0.tgz` while Vitest, Vite, TypeScript and related packages were still being unpacked. npm exited with code 1 and removed the incomplete install. Therefore this report does not claim a formal Vitest run or a fresh Vite production build. Strict TypeScript, offline contracts, deterministic source bundling and real Chromium interaction checks were executed instead.

## Package gate

The release archive passed CRC testing and clean extraction. The extracted directory repeated theme generation, 15-domain/172-module structure validation, 302-file syntax checking, strict TypeScript (using the system Node type definitions), all five offline contracts, deterministic 246-module rebuilding, bundle/manifest byte comparison, plugin/editor/theme/outline/image regressions and the v0.9.7 continuous-parent-link Chromium drag regression. The extracted rebuild matched the packaged and source `index.js` byte-for-byte. The archive contains no `node_modules`, Git data, nested ZIP, map/settings/checkpoint data or temporary test output.
