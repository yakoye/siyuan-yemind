# Exact Source Icon Isolation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [x]`) syntax for tracking.

**Goal:** Ship YeMind v0.9.22 with the user-provided `图标-svg.txt` artwork rendered exactly as previewed, without SiYuan host CSS filling stroke-only paths into black blobs.

**Architecture:** Keep every supplied Base64 SVG data URI byte-for-byte and render it through an `<img>` boundary. The image boundary prevents host selectors such as `svg path { fill: ... !important; }` from entering the SVG document, while existing YeMind classes continue to control only the outer 18×18 layout box. Add hash-based regression coverage so later refactors cannot silently rewrite the supplied artwork.

**Tech Stack:** TypeScript, Vitest, Node.js offline smoke entries, Python/Playwright Chromium smoke, Vite-built SiYuan plugin bundle, ZIP release packaging.

---

### Task 1: Lock the reported defect into failing tests

**Files:**
- Create: `tests/suites/ui-shell/v0922ExactSourceIconIsolation.suite.ts`
- Create: `tests/offline/sourceIconIsolationV0922SmokeEntry.ts`
- Modify: `tests/specs/ui-shell.test.ts`
- Modify: `tests/suite-manifest.json`
- Modify: `scripts/run-offline-smokes.mjs`

- [x] **Step 1: Write the failing Vitest scenario**

Assert that each supplied icon is an `<img>` with a Base64 SVG `src`, no inline SVG geometry, the expected YeMind class, and the exact SHA-256 hash from `图标-svg.txt`.

- [x] **Step 2: Write the dependency-free offline smoke**

Compile and execute the same public icon functions using global TypeScript. Require `<img>`, `draggable="false"`, `aria-hidden="true"`, exact source hashes, and no nested `<path>` or `currentColor` rewrite.

- [x] **Step 3: Run the offline smoke and record RED**

Run: `node scripts/run-offline-smokes.mjs`

Expected: FAIL because v0.9.21 returns inline `<svg>` markup rather than an isolated `<img>`.

### Task 2: Replace inline geometry rewriting with exact data-URI rendering

**Files:**
- Modify: `src/editor/suppliedIcons.ts`
- Modify: `src/styles/index.css`
- Modify: `tests/suites/ui-shell/v0919IconDialogsHistory.suite.ts`
- Modify: `tests/offline/uiPolishV0919SmokeEntry.ts`

- [x] **Step 1: Store exact source data URIs**

Map all 14 existing `SuppliedIconName` values to their exact Base64 data URIs from `图标-svg.txt`, retaining source labels and existing semantic classes/slugs.

- [x] **Step 2: Render an isolated image element**

Return `<img class="... ymz-operation-icon ..." src="data:image/svg+xml;base64,..." alt="" aria-hidden="true" draggable="false">` from `suppliedIcon()`.

- [x] **Step 3: Restrict CSS to outer-box presentation**

Apply 18×18 sizing, `object-fit: contain`, pointer isolation and menu alignment to both native SVG and supplied `<img>` nodes. Do not recolor or rewrite the embedded SVG document.

- [x] **Step 4: Update superseded v0.9.21 assertions**

Replace the old `currentColor`/nested-SVG expectations with exact-source image-boundary expectations.

- [x] **Step 5: Run the offline smoke and record GREEN**

Run: `node scripts/run-offline-smokes.mjs`

Expected: all offline entries pass, including `sourceIconIsolationV0922SmokeEntry`.

### Task 3: Synchronize the distributable bundle and browser regression

**Files:**
- Modify: `index.js`
- Modify: `index.css`
- Modify: `scripts/smoke-v0921-source-icons-rich-toolbar.py`
- Create: `scripts/smoke-v0922-hostile-icon-css.py`

- [x] **Step 1: Synchronize the prebuilt JavaScript module**

Replace bundled module 36 with the same exact data-URI map and `<img>` renderer used by TypeScript source.

- [x] **Step 2: Synchronize distributable CSS**

Copy the verified source stylesheet to `index.css`.

- [x] **Step 3: Update the existing Chromium smoke**

Inspect toolbar and context-menu icons as `<img>` nodes and preserve the double-click rich-text toolbar regression.

- [x] **Step 4: Add hostile-host-CSS Chromium coverage**

Inject aggressive host rules targeting `svg`, `svg path`, and menu SVG descendants. Verify supplied icons remain image elements with loaded natural dimensions and exact source URIs.

- [x] **Step 5: Run both Chromium smokes**

Run:
- `python scripts/smoke-v0921-source-icons-rich-toolbar.py`
- `python scripts/smoke-v0922-hostile-icon-css.py`

Expected: both exit 0 with no page or console errors.

### Task 4: Version, documentation and release metadata

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `plugin.json`
- Modify: `src/plugin/constants.ts`
- Modify: `src/releaseInfo.ts`
- Modify: `README.md`
- Modify: `README_zh_CN.md`
- Modify: `CHANGELOG.md`
- Modify: `DEVELOPMENT_PLAN.md`
- Modify: `FEATURE_MATRIX.md`
- Modify: `MIGRATION_STATUS.md`
- Modify: `OVERLAY_PACKAGE_NOTICE.md`
- Modify: `AGENTS.md`
- Create: `docs/verification-v0.9.22.md`
- Create: `docs/offline-bundle-manifest-v0.9.22.json`

- [x] **Step 1: Set every runtime and manifest version to 0.9.22**
- [x] **Step 2: Document root cause, exact-source image isolation, test coverage and migration safety**
- [x] **Step 3: Generate the v0.9.22 offline bundle manifest using the established script**

### Task 5: Full verification and deterministic release package

**Files:**
- Create: `/mnt/data/siyuan-yemind-v0.9.22.zip`

- [x] **Step 1: Run source structure and syntax checks**

Run:
- `node scripts/check-test-structure.mjs`
- `node scripts/check-typescript-syntax.mjs`
- `node scripts/run-offline-smokes.mjs`
- `node --check index.js`

- [x] **Step 2: Attempt dependency-backed validation**

Run `npm test`, `npm run check`, and `npm run build` only when dependencies are available. Report unavailable dependency checks explicitly rather than claiming success.

- [x] **Step 3: Run browser regressions**

Run the v0.9.21 rich-toolbar smoke, v0.9.22 hostile-CSS smoke, and established browser regressions that do not require missing dependencies.

- [x] **Step 4: Package flat release ZIP**

Exclude `.git`, `node_modules`, `dist`, temporary files, nested ZIPs and user data files (`maps.json`, `settings.json`, `checkpoints.json`).

- [x] **Step 5: Validate ZIP CRC, flat root and full extraction**

Use Python `zipfile.testzip()`, inspect the archive root, extract to a fresh directory, and rerun dependency-free checks against the extracted package.

- [x] **Step 6: Record actual evidence**

Write exact commands, exit codes, counts and manual SiYuan-only checks into `docs/verification-v0.9.22.md`.
