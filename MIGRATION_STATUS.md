# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.17`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing maps remain compatible. The optional `layoutPresetId` introduced in v0.9.12 still infers from the engine layout for legacy maps.
- v0.9.16 writes `yemindClipartGeometryVersion: 2` for newly inserted clipart and repairs legacy clipart nodes that still carry the old default `72 × 72` size.
- v0.9.17 adds no map-schema migration. Live width layout, context-menu organization and outline-selection ownership are runtime interaction changes only.
- Fixed visual resources remain outside map data and are referenced through stable catalog IDs and plugin-local URLs.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. v0.9.17 does not rewrite node UIDs, text, hierarchy, image data, relation data or unrelated metadata. The live-width controller performs history-free transient renders during dragging and persists only the final width through the existing engine command.
