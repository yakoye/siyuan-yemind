# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.13`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing maps remain compatible. The optional `layoutPresetId` introduced in v0.9.12 still infers from the engine layout for legacy maps.
- v0.9.13 adds no persisted fields and does not rewrite existing center topics or child labels.
- Fixed visual resources remain outside map data and are referenced through stable catalog IDs and plugin-local URLs.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. The v0.9.13 marker, measurement, menu and panel changes are rendering and command-routing changes, not a persisted map-schema rewrite. Existing node UIDs and metadata remain unchanged by compatible moves.
