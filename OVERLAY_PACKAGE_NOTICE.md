# YeMind v0.9.20 resource-excluded update package

This ZIP is a resource-excluded update package for an existing `siyuan-yemind` project that already contains the fixed local resources:

- `assets/clipart/`
- `assets/icons/marker-sprite.png`
- `assets/layout-thumbnails/`

Extract it over the existing plugin directory. Do not delete the existing asset directories first.

The file name no longer uses an `-overlay` suffix, but the package still intentionally excludes those large visual files. A standalone clean installation must include the fixed resources separately. The archive also excludes `maps.json`, `settings.json`, `checkpoints.json`, diagnostics data and all other user-created storage files.
