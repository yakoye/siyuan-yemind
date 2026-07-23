# YeMind v0.9.14 overlay package

This ZIP is an overlay patch for an existing `siyuan-yemind` project that already contains the fixed local resources:

- `assets/clipart/`
- `assets/icons/marker-sprite.png`
- `assets/layout-thumbnails/`

Extract it over the existing plugin directory. Do not delete the existing asset directories first.

This package intentionally excludes those large visual files. A standalone clean installation must include the fixed resources separately. The archive also excludes `maps.json`, `settings.json`, `checkpoints.json`, diagnostics data and all other user-created storage files.
