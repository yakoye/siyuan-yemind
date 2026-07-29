# YeMind v0.9.12 fixed local asset integration

## Scope

v0.9.12 integrates the existing fixed YeMind visual resources through catalogs. Runtime code never scans asset directories.

- 126 marker icons from `marker-sprite.png`, grouped into eight catalog categories.
- 806 clipart SVGs in thirteen categories, with label search.
- 28 layout thumbnails in seven groups.

## Runtime model

The SiYuan runtime provides the plugin base URL. All catalog paths are resolved beneath `<plugin-base>/assets/`; local disk paths and Base64 copies are forbidden.

## Markers

Marker identifiers are stored as stable node icon values. The canvas renders a clipped view of the shared sprite. Clicking an existing marker opens its own category so another marker of the same kind can be selected immediately.

## Clipart

Clipart remains an ordinary node image with the stable `yemindClipartId` metadata. It is placed above node text, uses a local SVG URL, and retains the existing image preview/delete/resize interaction.

## Layout gallery

The top Structure control opens a catalog-driven gallery of 28 thumbnails in seven groups. The selected visual preset is persisted as `layoutPresetId`; each preset maps to the closest layout supported by the current `simple-mind-map` engine. This preserves the 28-item product catalog without claiming 28 independent layout engines.

## Packaging

The AI development artifact is an overlay package. It includes code, catalogs, documentation, tests and build outputs, but excludes fixed visual resources. Applying the ZIP over an existing YeMind project must not delete the existing `assets/clipart`, marker sprite or layout thumbnails.
