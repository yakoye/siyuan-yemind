# Layout Drag Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make split-mode opening reveal the current outline node and extend the proven right-logical drag interaction across mirrored, bidirectional, tree, timeline, organization, and fishbone layouts without changing the working right-logical behavior.

**Architecture:** Preserve the existing `logicalStructure` reference path unchanged. Add directional layout profiles that normalize every other supported layout into the same local drag coordinate model, then reuse one room-making preview along each layout's visual sibling axis. Register a dedicated mirrored fishbone layout because upstream exposes right-fishbone constants but does not register a renderer for them.

**Tech Stack:** TypeScript, simple-mind-map 0.14.0-fix.3, SVG.js, Vitest source/unit tests, offline TypeScript bundle and Chromium smoke scripts.

---

### Task 1: Split opening reveal

**Files:**
- Modify: `src/editor/YeMindEditor.ts`
- Test: `tests/suites/outline-split/v0918SplitRevealCurrentSelection.suite.ts`

- [ ] Add a failing source regression asserting that entering split mode schedules an outline reveal for the current primary UID.
- [ ] Implement a next-frame `revealCurrentOutlineSelection()` call after the split pane becomes visible.
- [ ] Verify opening split does not claim outline edit ownership or move canvas selection.

### Task 2: Directional drag geometry

**Files:**
- Modify: `src/core/officialDragIntent.ts`
- Test: `tests/suites/drag-interactions/v0918LayoutDragParity.suite.ts`
- Modify: `tests/offline/dragIntentSmokeEntry.ts`

- [ ] Add failing tests for mirrored left logical zones, mind-map branch zones, horizontal sibling axes, timelines, and fishbone directions.
- [ ] Export layout profile helpers for growth direction, sibling axis, visual ordering, and preview shift direction.
- [ ] Add a directional local candidate resolver while keeping `resolveRightLogicalCandidate()` unchanged.
- [ ] Include fishbone layouts in official geometry and suppress stale upstream placeholders.

### Task 3: Generalized live room preview

**Files:**
- Modify: `src/core/YeMindDrag.ts`
- Modify: `src/core/dragPreviewEdges.ts`
- Test: `tests/suites/drag-interactions/v0918LayoutDragParity.suite.ts`

- [ ] Add source tests that only the reference right layout keeps its original code path while all supported layouts use immediate candidate resolution.
- [ ] Generalize room-making preview from vertical/downward shifts to horizontal or reversed visual shifts.
- [ ] Use a single green dashed parent guide for adapted layouts and hide origin/deletion/insertion lines.
- [ ] Preserve source incoming-line hiding, Escape cancellation, native move commands, and history behavior.

### Task 4: Right fishbone mirror

**Files:**
- Create: `src/core/RightFishbone.ts`
- Modify: `src/core/registerLayouts.ts`
- Modify: `src/core/createMindMap.ts`
- Test: `tests/suites/drag-interactions/v0918LayoutDragParity.suite.ts`

- [ ] Add a failing source/runtime contract showing `rightFishbone` and `rightFishbone2` are registered before MindMap construction.
- [ ] Subclass upstream Fishbone, treat both right variants as corresponding fishbone modes, and mirror final geometry around the root center.
- [ ] Mirror line/generalization paths and fish-tail geometry while retaining readable node content and stable hit rectangles.
- [ ] Verify right fishbone is the geometric mirror of left fishbone rather than a logical-structure fallback.

### Task 5: Release metadata and full verification

**Files:**
- Modify: `package.json`, `plugin.json`, `src/releaseInfo.ts`, `AGENTS.md`, `CHANGELOG.md`
- Modify: `tests/specs/drag-interactions.test.ts`, `tests/specs/outline-split.test.ts`, `tests/suite-manifest.json`
- Create: `scripts/smoke-v0918-layout-drag-parity.py`
- Modify: `scripts/build-offline-bundle.mjs`

- [ ] Bump to v0.9.18 and document split reveal, layout drag parity, and right-fishbone correction.
- [ ] Run test structure, new scenario tests where dependencies permit, TypeScript syntax/check, offline tests, offline build, `node --check`, and Chromium smokes.
- [ ] Package as `siyuan-yemind-v0.9.18.zip` without `assets`, user data, `node_modules`, or nested ZIPs.
- [ ] Re-extract and repeat all available verification, reporting unavailable npm/Vitest/Vite checks honestly.
