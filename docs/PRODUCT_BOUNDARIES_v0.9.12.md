# YeMind v0.9.12 product boundaries

- Catalogs are authoritative; runtime directory scanning is prohibited.
- Marker and clipart binary assets are referenced by plugin-local URLs and are not embedded in map data.
- `layoutPresetId` records the selected visual catalog item; `layout` remains the actual engine layout.
- The 28 visual presets map to the currently supported simple-mind-map engines. Unsupported new geometry is not fabricated.
- The default AI ZIP is an overlay and requires an existing fixed asset installation.
