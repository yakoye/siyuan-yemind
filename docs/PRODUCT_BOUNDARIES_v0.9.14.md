# YeMind v0.9.14 product boundaries

- Multi-selection summary is one contiguous structural range. When selected branches have gaps, the native range necessarily covers the intervening sibling branches.
- Selecting an ancestor together with its descendants summarizes the ancestor once; descendants are not given independent summaries.
- The release does not migrate or rewrite existing summary data. It changes only newly created multi-selection summaries.
- Measurement caches are runtime-only DOM elements and are never persisted.
- Drag-first mode reserves right-button drag for pan. Selection remains available through left-button selection mode and Ctrl/Cmd node selection.
- Stationary right-click context menus remain supported.
- The overlay archive intentionally excludes the fixed `assets/` tree and all user map/settings/checkpoint data.
