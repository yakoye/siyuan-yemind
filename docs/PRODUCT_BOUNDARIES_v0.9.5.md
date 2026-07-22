# YeMind v0.9.5 product boundaries

v0.9.5 changes drag target resolution, drag previews, outline drag initiation and image-action presentation. It does not change map, settings or checkpoint schemas.

The persisted map tree remains authoritative. `simple-mind-map` commands remain the only canvas mutation path, while the unified outline continues to call the existing UID-based move command. No user map data is bundled into the release archive.

Specialized layouts without verified geometric adapters continue to use the upstream drag fallback instead of receiving guessed coordinates. This keeps the release conservative while right/left logical structures, mind maps, organizations and supported timeline layouts use pointer-driven intent.
