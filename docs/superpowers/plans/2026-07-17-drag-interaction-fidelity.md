# Drag Interaction Fidelity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Hide the dragged node's old incoming connection and replace the point-based delayed preview target with KMind Zen's rectangle/tail/lane intent model while preserving upstream drop commands.

**Architecture:** A pure `officialDragIntent` geometry module converts clone and node rectangles into the existing `DragCandidate` shape. `YeMindDrag` owns only animation-frame sampling, stability, incoming-line visibility, guide rendering, and the fallback to upstream detection for unsupported layouts.

**Tech Stack:** TypeScript, Vitest, SVG.js through `simple-mind-map`, Vite.

---

### Task 1: Reproduce old-line and target-detection failures

**Files:**
- Create: `tests/officialDragIntent.test.ts`
- Modify: `tests/yeMindDrag.test.ts`

- [x] **Step 1: Write failing child-tail detection test**

Create a logical-right target node at `x=100..180`, then place an 80 px drag clone at `x=190` with vertical overlap. Assert the result is a child candidate for that target even though the pointer need not be inside the target node.

- [x] **Step 2: Write failing sibling-lane test**

Create two children under one parent and place the clone between them inside the official 44 px sibling lane. Assert the result resolves the same parent and the correct `prevNode`/`nextNode` insertion pair.

- [x] **Step 3: Write failing incoming-line snapshot test**

Create parent `_lines` with visible and hidden fake SVG lines. Assert collection hides the dragged node's incoming line and restoration preserves each line's original visibility.

- [x] **Step 4: Run focused tests and confirm RED**

Run:

```bash
npx vitest run tests/officialDragIntent.test.ts tests/yeMindDrag.test.ts --pool=forks --poolOptions.forks.singleFork=true
```

Expected: failure because official geometry and incoming-line lifecycle exports do not exist.

### Task 2: Implement official-style pure geometry

**Files:**
- Create: `src/core/officialDragIntent.ts`
- Modify: `src/core/YeMindDrag.ts`
- Test: `tests/officialDragIntent.test.ts`

- [x] **Step 1: Implement rectangle helpers**

Add expansion, intersection-area, union, center-point, layout-growth and sibling-axis helpers.

- [x] **Step 2: Implement child intent**

Use 8/22 px target padding and an 80 px growth-direction tail. Keep the highest overlap score and report `fromTail` and `centerInsideTarget`.

- [x] **Step 3: Implement sibling intent**

Group candidates by parent, apply 44/72 px lane and end padding, and calculate insertion index from the clone center.

- [x] **Step 4: Implement official precedence**

Return child-tail first, then sibling when the clone center is outside a child target, then child, then sibling, then none.

- [x] **Step 5: Run focused tests and confirm GREEN**

Run the focused Vitest command from Task 1. Expected: all focused geometry tests pass.

### Task 3: Integrate lifecycle and continuous settling

**Files:**
- Modify: `src/core/YeMindDrag.ts`
- Modify: `tests/yeMindDrag.test.ts`

- [x] **Step 1: Add incoming-line snapshots**

Hide each dragged top-level node's incoming parent line immediately after clone creation and restore visibility in `finally` after native mouseup, plus plugin remove/destroy cleanup.

- [x] **Step 2: Select detector by layout**

Use official rectangle geometry for supported layouts and retain `Drag.prototype.checkOverlapNode()` only as a fallback for specialized layouts.

- [x] **Step 3: Clear stale upstream placeholder visuals**

When official geometry owns candidate detection, zero the upstream placeholder and hide/remove its point-based lines so stale feedback cannot conflict with the Bézier parent guide.

- [x] **Step 4: Continue frames while pending**

If the stability state still has a pending candidate, schedule another animation frame even without another mousemove.

- [x] **Step 5: Run focused lifecycle tests**

Run:

```bash
npx vitest run tests/officialDragIntent.test.ts tests/yeMindDrag.test.ts tests/nativeDragLifecycle.test.ts --pool=forks --poolOptions.forks.singleFork=true
```

Expected: all focused tests pass.

### Task 4: Version, documentation, and release verification

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `plugin.json`
- Modify: `AGENTS.md`
- Modify: `CHANGELOG.md`
- Modify: `README.md`
- Modify: `README_zh_CN.md`
- Create: `docs/verification-v0.5.13.md`

- [x] **Step 1: Set version to 0.5.13**

Update package and plugin versions without changing plugin ID or storage paths.

- [x] **Step 2: Document the root cause and official mapping**

Record incoming-line ownership, official rectangle/tail/lane constants, continuous pending settling, and the retained upstream final commands.

- [x] **Step 3: Run the completion gate**

```bash
npm test
npm run check
npm run build
node --check index.js
npm audit --json
```

Expected: zero test failures, TypeScript/build exit 0, valid built entry, no high or critical audit findings.

- [x] **Step 4: Package and validate ZIP**

Create `siyuan-yemind-zen-v0.5.13.zip`, run `unzip -t`, extract it, and run `node --check` on the extracted `index.js`.
