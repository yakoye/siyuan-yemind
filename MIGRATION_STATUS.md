# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.4`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing map, settings and checkpoint files require no v0.9.4 schema migration.
- The previous outline mode preference is ignored because v0.9.4 exposes one unified outline surface; map content is unchanged.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed. Unified outline changes are an editor projection and command-routing change, not a persisted map-schema rewrite.
