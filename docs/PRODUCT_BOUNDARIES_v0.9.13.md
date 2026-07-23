# YeMind v0.9.13 product boundaries

## Included

- Fixes for marker/node bounds, hover image tools, image preview backdrop, relation selected state, toolbar hover, panel closing and density.
- Standalone About dialog and top-bar menu ordering.
- Neutral new-map node labels.
- Multi-selection context-menu preservation.
- Hidden-tab rich-text measurement stabilization.
- Regression tests, release documentation and overlay packaging.

## Not included

- No persisted map, settings or checkpoint schema migration.
- No automatic renaming of existing maps from their center topic.
- No new image editor, cropper or annotation workflow.
- No relation-line style editor beyond the selected-state fix.
- No bundled replacement for the omitted large `assets/` directories.

## Data safety

The release archive never contains `maps.json`, `settings.json`, `checkpoints.json` or diagnostic storage. Existing node UIDs, content, styles, images, relation control points and view data remain unchanged.
