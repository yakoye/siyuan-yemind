# YeMind Zen Inline Links, Code Blocks and Settings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistent inline hyperlinks, a complete language-aware code-block editor, and expanded live settings to YeMind Zen v0.4.0.

**Architecture:** Extend the existing `simple-mind-map` RichText plugin with a YeMind-specific subclass that enables Quill link/code formats. Keep Quill manipulation behind command/helper modules, use small SiYuan dialogs for editing, and make `SettingsStore` the single live configuration source.

**Tech Stack:** TypeScript, Vite, Vitest, SiYuan Plugin API, simple-mind-map, Quill 2.

---

### Task 1: Extend settings state and migration

**Files:**
- Modify: `src/settings/SettingsStore.ts`
- Modify: `src/settings/settings.ts`
- Test: `tests/settingsStore.test.ts`

- [ ] Add failing tests for all new setting defaults, invalid-value normalization and persistence.
- [ ] Run `npm test -- tests/settingsStore.test.ts` and confirm failures are caused by missing fields.
- [ ] Add typed settings for autosave, rich toolbar, links, code blocks, cloze and node badges.
- [ ] Add corresponding SiYuan setting controls.
- [ ] Re-run the focused test and confirm it passes.

### Task 2: Add inline-link helpers and command API

**Files:**
- Create: `src/editor/inlineLink.ts`
- Modify: `src/core/commands.ts`
- Test: `tests/inlineLink.test.ts`
- Test: `tests/richTextCommands.test.ts`

- [ ] Add failing tests for protocol normalization, bare-domain HTTPS completion, selected-link reading, applying and removing link format.
- [ ] Run focused tests and confirm expected failures.
- [ ] Implement pure link helpers and command-adapter methods.
- [ ] Re-run focused tests and confirm they pass.

### Task 3: Add Quill code-block support

**Files:**
- Create: `src/editor/YeMindRichText.ts`
- Create: `src/editor/codeBlock.ts`
- Modify: `src/core/registerPlugins.ts`
- Modify: `src/types/simple-mind-map-plugins.d.ts`
- Test: `tests/codeBlock.test.ts`
- Test: `tests/registerPlugins.test.ts`

- [ ] Add failing tests for code-block range discovery, insertion/replacement, format removal and YeMind RichText registration.
- [ ] Run focused tests and confirm expected failures.
- [ ] Extend Quill formats with link, inline code and language-aware code block.
- [ ] Implement code-block operations behind typed helpers.
- [ ] Re-run focused tests and confirm they pass.

### Task 4: Build inline-link and code-block dialogs

**Files:**
- Create: `src/ui/richTextDialogs.ts`
- Modify: `src/editor/RichTextToolbar.ts`
- Modify: `src/editor/YeMindEditor.ts`
- Modify: `src/ui/contextMenu.ts`
- Modify: `src/ui/nodeContentMenu.ts`
- Test: `tests/richTextToolbar.test.ts`
- Test: `tests/contextMenuContent.test.ts`

- [ ] Add failing tests for toolbar entries and callback dispatch.
- [ ] Run focused tests and confirm failures.
- [ ] Add link, inline-code and code-block toolbar actions and dialogs.
- [ ] Add code-block and inline-link context-menu entries.
- [ ] Re-run focused tests and confirm they pass.

### Task 5: Apply live settings and styles

**Files:**
- Modify: `src/editor/YeMindEditor.ts`
- Modify: `src/core/createMindMap.ts`
- Modify: `src/core/nodeDecorations.ts`
- Modify: `src/styles/index.css`
- Test: `tests/nodeDecorations.test.ts`
- Test: `tests/editorSettings.test.ts`

- [ ] Add failing tests for badge visibility and editor setting attributes.
- [ ] Run focused tests and confirm failures.
- [ ] Apply autosave delay, toolbar visibility, link opening, code-block CSS variables, cloze mode and badge visibility live.
- [ ] Re-run focused tests and confirm they pass.

### Task 6: Documentation, version and roadmap

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `plugin.json`
- Modify: `README.md`
- Modify: `README_zh_CN.md`
- Modify: `CHANGELOG.md`
- Modify: `FEATURE_MATRIX.md`
- Modify: `DEVELOPMENT_PLAN.md`
- Create: `docs/verification-v0.4.0.md`

- [ ] Set version to `0.4.0` in all package metadata.
- [ ] Document the new features, settings, boundaries and phased roadmap through v1.0.
- [ ] Run `npm test`, `npm run check`, and `npm run build`.
- [ ] Verify the generated root `index.js` and `index.css`, then package `siyuan-yemind-zen-v0.4.0.zip` without `node_modules`, `.git` or `dist`.
