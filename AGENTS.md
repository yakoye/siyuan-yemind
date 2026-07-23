# YeMind repository guidance

## Product identity

- Product: YeMind
- Package and plugin ID: `siyuan-yemind`
- Current version: `0.9.15`
- Host baseline: SiYuan `3.7.3`
- Release archive: `siyuan-yemind-vX.Y.Z.zip`

## Development rules

1. Preserve user map data. Release archives must never contain `maps.json`, `settings.json` or `checkpoints.json`.
2. Use stable node UIDs for editing, dragging, outline synchronization, search navigation and diagnostics.
3. One editing surface owns focus at a time: canvas or the unified structured outline.
4. Text selection and editing shortcuts have priority over structural shortcuts in both Quill and the structured outline; outline dragging starts only from its gutter.
5. Every user-reported defect becomes a permanent regression scenario in the matching test domain.
6. Run `npm test`, `npm run check`, `npm run build` and `node --check index.js` before packaging.
7. Re-extract the final ZIP, run `npm ci`, and repeat the complete validation.
8. New public documentation and UI copy use only the YeMind product identity.
9. Git commands supplied after releases end with `git push origin main`.

## Test organization

Tests are grouped into 15 domain entry files under `tests/specs/`. Scenario modules stay isolated under `tests/suites/<domain>/`. Update `tests/suite-manifest.json` whenever adding or removing a scenario.
