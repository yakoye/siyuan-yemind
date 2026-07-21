# YeMind Zen v0.5.14 Official Visual Parity Implementation Plan

## Task 1: Theme adapter tests

Files:
- `tests/themePresets.test.ts`
- `src/core/themePresets.ts`

Steps:
1. Write failing tests for default curved lines, light/dark variants, spacing override, preset labels and rainbow palettes.
2. Run `npm test -- tests/themePresets.test.ts` and confirm failure because the module is missing.
3. Implement the smallest pure adapter.
4. Re-run the focused test.

## Task 2: Persistence tests

Files:
- `tests/mapAppearancePersistence.test.ts`
- `src/model/types.ts`
- `src/model/defaultMap.ts`
- `src/model/MapRepository.ts`
- `src/model/CheckpointRepository.ts`

Steps:
1. Write failing tests for legacy migration, default curve, update persistence and checkpoint restore.
2. Run focused tests and confirm expected failures.
3. Add `lineStyle`, normalize theme IDs, and preserve fields in checkpoints.
4. Re-run focused tests.

## Task 3: Upstream theme runtime tests

Files:
- `tests/createMindMapAppearance.test.ts`
- `tests/registerPlugins.test.ts`
- `src/core/registerPlugins.ts`
- `src/core/createMindMap.ts`

Steps:
1. Write failing tests for RainbowLines registration and adapted options.
2. Run focused tests.
3. Register upstream `RainbowLines`; pass theme/rainbow options into MindMap.
4. Re-run focused tests.

## Task 4: Toolbar and editor integration tests

Files:
- `tests/editorTemplate.test.ts`
- `tests/editorAppearanceIntegration.test.ts`
- `src/editor/editorTemplate.ts`
- `src/editor/YeMindEditor.ts`

Steps:
1. Add failing tests for theme and line selectors and runtime persistence behavior.
2. Run focused tests.
3. Add controls, appearance application, appearance observer and checkpoint restore integration.
4. Re-run focused tests.

## Task 5: Documentation and versioning

Files:
- `plugin.json`
- `package.json`
- `AGENTS.md`
- `README_zh_CN.md`
- `CHANGELOG.md`
- `FEATURE_MATRIX.md`
- `MIGRATION_STATUS.md`
- `docs/official-feature-parity-v0.5.14.md`

Steps:
1. Set version to 0.5.14.
2. Document implemented parity and remaining official capabilities.
3. Update the current baseline.

## Task 6: Completion gate

Run:

```bash
npm test
npm run check
npm run build
node --check index.js
npm audit --json
```

Package and verify:

```bash
zip -r siyuan-yemind-zen-v0.5.14.zip siyuan-yemind-zen
unzip -t siyuan-yemind-zen-v0.5.14.zip
node --check <extracted>/siyuan-yemind-zen/index.js
```

Record exact counts and remaining Windows SiYuan manual checks in the verification report.
