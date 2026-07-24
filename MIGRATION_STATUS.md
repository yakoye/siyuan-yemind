# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.25`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing maps remain compatible. The optional `layoutPresetId` introduced in v0.9.12 still infers from the engine layout for legacy maps.
- v0.9.16 writes `yemindClipartGeometryVersion: 2` for newly inserted clipart and repairs legacy clipart nodes that still carry the old default `72 × 72` size.
- v0.9.20 adds no map-schema migration. Icon artwork, flat asset dialogs and cross-root drag intent are runtime UI changes only.
- v0.9.21 adds no map-schema migration. Supplied SVG normalization and initial rich-text toolbar display are presentation/event changes only.
- v0.9.22 adds no map-schema migration. Exact supplied SVG image isolation changes only generated UI markup and stylesheet presentation.
- v0.9.23 adds no map-schema migration. Icon-slot geometry, dark icon variants and theme-state styling are presentation-only changes.
- v0.9.24 adds no persistent map-schema migration. Outline text import creates ordinary UID-backed nodes, while context-menu, Enter, formula-icon and appearance-stability changes operate through existing transactions and presentation state.
- v0.9.25 adds no upgrade-time migration. New long imported nodes may carry optional `width`, `customTextWidth` and `yemindImportedAutoWidth` fields; manual width editing clears the automatic marker. Outline accessories are derived from existing `icon`, `image` and `yemindClipartId` content and do not duplicate visual style data.
- Fixed visual resources remain outside map data and are referenced through stable catalog IDs and plugin-local URLs.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. v0.9.25 does not rewrite existing node UIDs, text, hierarchy, image data, relation data or unrelated metadata during upgrade. Text-to-map changes data only after explicit user confirmation and commits the result as one tree transaction; its automatic width fields are added only to newly imported long labels. Checkpoints continue using the existing independent history store.
