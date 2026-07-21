# YeMind Zen v0.2.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the transitional runtime with a fully source-built `simple-mind-map` editor and ship it as the `siyuan-yemind-zen` SiYuan plugin.

**Architecture:** A versioned map repository persists local maps through the SiYuan plugin data API. A custom Dock manages maps, a custom tab hosts `YeMindEditor`, and a command adapter translates UI actions into `simple-mind-map` native commands. Vite emits the root installable bundle from `src/` only.

**Tech Stack:** TypeScript, Vite, Vitest, jsdom, SiYuan Plugin API, `simple-mind-map` 0.14.x.

---

### Task 1: Rename package identity and establish test tooling

**Files:**
- Modify: `plugin.json`
- Modify: `package.json`
- Modify: `vite.config.ts`
- Create: `vitest.config.ts`
- Create: `tests/setup.ts`

- [ ] **Step 1: Write a failing identity test**

Create `tests/pluginIdentity.test.ts` that loads `plugin.json` and asserts `name === "siyuan-yemind-zen"`, `displayName.zh_CN === "YeMind Zen"`, and `version === "0.2.0"`.

- [ ] **Step 2: Run the test and verify RED**

Run: `npm test -- tests/pluginIdentity.test.ts`
Expected: FAIL because v0.1.0 still uses the old plugin ID and version.

- [ ] **Step 3: Apply minimal identity/build changes**

Update package and plugin metadata, add Vitest scripts, and configure CSS output as `index.css`.

- [ ] **Step 4: Run the test and verify GREEN**

Run: `npm test -- tests/pluginIdentity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugin.json package.json package-lock.json vite.config.ts vitest.config.ts tests
 git commit -m "chore: rename plugin to siyuan-yemind-zen"
```

### Task 2: Build the versioned map repository

**Files:**
- Create: `src/model/types.ts`
- Create: `src/model/defaultMap.ts`
- Create: `src/model/MapRepository.ts`
- Test: `tests/mapRepository.test.ts`

- [ ] **Step 1: Write failing repository tests**

Tests cover default map shape, load normalization, create, rename, delete-final-map, active-map tracking and immutable snapshots.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/mapRepository.test.ts`
Expected: FAIL because repository modules do not exist.

- [ ] **Step 3: Implement the minimum repository**

Use injected async `load`/`save` functions so tests do not mock the SiYuan plugin. Persist schema version `1` and never force-create a map after deletion.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/mapRepository.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/model tests/mapRepository.test.ts
 git commit -m "feat: add persistent map repository"
```

### Task 3: Add the simple-mind-map command adapter

**Files:**
- Modify: `src/core/createMindMap.ts`
- Replace: `src/core/commands.ts`
- Create: `src/core/registerPlugins.ts`
- Test: `tests/commands.test.ts`

- [ ] **Step 1: Write failing command tests**

Use a fake object with `execCommand` and `view` spies. Verify child, sibling, delete, undo, redo, fit, zoom and edit commands issue the native command names used by `simple-mind-map`.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/commands.test.ts`
Expected: FAIL because the adapter is missing.

- [ ] **Step 3: Implement the minimum adapter and plugin registration**

Register `Drag`, `Select`, `RichText`, `MiniMap`, `Search` and `Export` once. Configure the editor for native drag, quick child creation, rich text and keyboard behavior.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/commands.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core tests/commands.test.ts
 git commit -m "feat: integrate simple-mind-map command core"
```

### Task 4: Implement the source-built editor view

**Files:**
- Create: `src/editor/YeMindEditor.ts`
- Create: `src/editor/editorTemplate.ts`
- Create: `src/editor/editorStats.ts`
- Create: `src/ui/contextMenu.ts`
- Create: `src/styles/index.css`
- Test: `tests/editorStats.test.ts`

- [ ] **Step 1: Write failing stats tests**

Verify root, node and word counts for nested trees and HTML-rich node text.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/editorStats.test.ts`
Expected: FAIL because the stats module does not exist.

- [ ] **Step 3: Implement the editor and minimum UI**

Create the map instance, wire data persistence, active-node state, native context menu, toolbar commands, debounced save, resize and destroy. Use only functioning v0.2.0 controls.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/editorStats.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/editor src/ui/contextMenu.ts src/styles tests/editorStats.test.ts
 git commit -m "feat: add source-built YeMind editor"
```

### Task 5: Implement Dock, tabs and plugin lifecycle

**Files:**
- Replace: `src/plugin/dock.ts`
- Replace: `src/plugin/tabs.ts`
- Replace: `src/plugin/YeMindZenPlugin.ts`
- Modify: `src/index.ts`
- Create: `src/plugin/tabMatcher.ts`
- Test: `tests/tabMatcher.test.ts`

- [ ] **Step 1: Write failing tab-matcher tests**

Verify existing tabs are matched by `data.mapId`, missing tabs return `undefined`, and unrelated custom tabs are ignored.

- [ ] **Step 2: Run tests and verify RED**

Run: `npm test -- tests/tabMatcher.test.ts`
Expected: FAIL because the matcher does not exist.

- [ ] **Step 3: Implement plugin integration**

Register icons, custom tab, left-bottom Dock, top-bar menu and commands. Dock actions include open, copy link, rename and delete confirmation. Focus existing map tabs before opening new ones.

- [ ] **Step 4: Run tests and verify GREEN**

Run: `npm test -- tests/tabMatcher.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/plugin src/index.ts tests/tabMatcher.test.ts
 git commit -m "feat: add YeMind Dock and stable map tabs"
```

### Task 6: Remove transitional runtime and build the installable package

**Files:**
- Delete/replace generated: `index.js`
- Replace generated: `index.css`
- Modify: `README.md`
- Modify: `README_zh_CN.md`
- Modify: `CHANGELOG.md`
- Modify: `MIGRATION_STATUS.md`
- Modify: `ARCHITECTURE.md`
- Modify: `THIRD_PARTY_NOTICES.md`

- [ ] **Step 1: Add a failing build-output check**

Create `tests/buildOutput.test.ts` asserting `src/index.ts` has no fallback wording and metadata contains no old `yemind-zen` plugin ID.

- [ ] **Step 2: Run test and verify RED**

Run: `npm test -- tests/buildOutput.test.ts`
Expected: FAIL because transitional wording and identity remain.

- [ ] **Step 3: Remove fallback references and update docs**

Document that v0.2.0 is fully source-built. Run Vite to regenerate root `index.js`, `index.css` and source map.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run check
npm run build
```

Expected: all tests PASS, TypeScript exits 0, Vite exits 0.

- [ ] **Step 5: Commit**

```bash
git add .
 git commit -m "release: build YeMind Zen v0.2.0 source runtime"
```
