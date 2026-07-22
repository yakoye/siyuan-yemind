# YeMind migration status

## Current identity

- Plugin ID: `siyuan-yemind`
- Install folder: `data/plugins/siyuan-yemind/`
- Storage folder: `data/storage/petal/siyuan-yemind/`
- Current version: `0.9.3`

## Compatibility retained internally

- Historical plugin protocol links remain readable.
- Historical theme IDs normalize to current YeMind themes.
- Existing map, settings and checkpoint files require no v0.9.3 schema migration.

## Release safety

The release archive does not include user data files and can be extracted over the existing plugin folder while SiYuan is closed.
