# YeMind v0.9.9 product boundaries

v0.9.9 changes the geometry of structured-outline indent-rainbow guides and centralizes the constants used by outline row indentation, drag gutters, marker columns and drop indicators.

The Root no longer receives a guide. The first guide lies between the Root and first-level marker columns, and each deeper guide lies between adjacent marker columns. Marker, text and drag-hit positions remain unchanged.

This release does not change map/settings/checkpoint schemas, node identity, clipboard semantics, outline structural commands, canvas drag behavior, themes, image tools, rich-text editing or other layout adapters.
