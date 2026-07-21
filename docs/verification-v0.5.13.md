# YeMind Zen v0.5.13 Verification Report

Date: 2026-07-17

## Scope

v0.5.13 fixes two drag regressions reported from the real Windows SiYuan 3.7.2 runtime:

1. the original parent-to-dragged-node line remained visible while the node ghost was moving;
2. target-parent preview lagged behind the visible ghost because candidate detection still depended on upstream pointer/quadrant hit zones.

The release keeps the existing map format, repositories, native history, layout engine, and final `MOVE_NODE_TO`, `INSERT_BEFORE`, and `INSERT_AFTER` mutations.

## Root-cause verification

- The incoming parent line is owned by `draggedNode.parent._lines[childIndex]`; upstream `hideChildren()` only hides the dragged node's outgoing lines and descendants.
- The KMind Zen 0.33.0 production bundle evaluates the full dragged rectangle, not only the pointer position.
- Verified official intent constants were adapted: 80 px child tail, 8/22 px child enter/leave padding, and 44/72 px sibling lane/end padding.
- Candidate precedence was adapted as child tail → sibling lane → child body → sibling fallback.
- A pending target continues to receive animation frames until the 60 ms / three matching-frame stability threshold is satisfied, even if the pointer stops moving.
- Mixed layouts resolve guide orientation from the actual target parent; Timeline2 top branches map visual insertion order back to native child order.
- Fishbone layouts retain the installed upstream detector rather than using an unverified approximation.

See `docs/official-source-drag-analysis-v0.5.13.md` for the detailed official-source mapping.

## Focused regression coverage

Focused tests cover:

- hiding and restoring incoming lines while preserving pre-existing hidden state;
- the user screenshot equivalent where the ghost enters the upper node's child tail;
- child-tail and sibling-lane candidate precedence;
- active-target hysteresis padding;
- logical right/left, mind-map branches, organization, catalog, timeline, Timeline2, and vertical-timeline growth directions;
- Timeline2 upper-branch visual-to-native insertion conversion;
- 60 ms / three-frame stabilization and continuous pending settling;
- upstream fallback for fishbone layouts;
- preservation of upstream final drag commands.

## Fresh completion gate

```text
Test files: 87 passed
Tests: 225 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 874
Built index.js syntax: passed
```

Build output:

```text
index.css: 54.52 kB (gzip 9.39 kB)
index.js: 2,153.65 kB (gzip 470.06 kB)
source map: 4,089.04 kB
```

Commands executed:

```bash
npm test
npm run check
npm run build
node --check index.js
npm audit --json
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

These are existing upstream dependency findings. No bottom-layer package was force-upgraded for this drag-fidelity release.

## Package checks

The release archive is created with the top-level `siyuan-yemind-zen/` directory, excluding `node_modules`, `dist`, and temporary logs. The final archive is checked with `unzip -t`, extracted into a clean directory, and the extracted `index.js` is checked again with Node.

## Remaining manual verification

The current environment cannot launch and operate the user's Windows SiYuan 3.7.2 desktop UI. After installing v0.5.13, verify:

1. the original solid incoming line disappears for the whole drag session and does not flash before drop completion;
2. moving the ghost into an upper or lower node's child tail switches the guide after the stability window, including when the pointer stops;
3. sibling insertion, cross-parent movement, multi-selection drag, zoomed views, quick release, undo/redo, save, and reopen remain correct;
4. logical right/left, mind map, organization, catalog, timeline, Timeline2, vertical timeline, and fishbone layouts do not regress;
5. Timeline2 upper branches insert in the same order shown by the visual preview.
