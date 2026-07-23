# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.14`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing maps remain compatible. The optional `layoutPresetId` introduced in v0.9.12 still infers from the engine layout for legacy maps.
- v0.9.14 adds no persisted fields; it only changes how a new multi-selection summary range is chosen and how runtime geometry is measured.
- Fixed visual resources remain outside map data and are referenced through stable catalog IDs and plugin-local URLs.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. The v0.9.14 summary, measurement and right-drag changes are command-routing and rendering changes, not a persisted map-schema rewrite. Existing node UIDs and metadata remain unchanged by compatible moves.
