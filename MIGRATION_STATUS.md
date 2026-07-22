# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.5`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing map, settings and checkpoint files require no v0.9.5 schema migration.
- The previous outline mode preference is ignored because v0.9.5 exposes one unified outline surface; map content is unchanged.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. Unified outline and tree-drag changes are editor projection, geometry and command-routing changes, not a persisted map-schema rewrite. Existing node UIDs and metadata remain unchanged by compatible moves.
