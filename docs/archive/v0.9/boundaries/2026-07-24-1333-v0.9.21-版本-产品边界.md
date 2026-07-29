# YeMind v0.9.21 product boundaries

- Host baseline: SiYuan 3.7.3.
- The release changes operation-icon presentation and the event emitted after an initial complete rich-text selection.
- Original supplied SVG paths, masks, dashed guides and semantic opacity are preserved; only the presentation shell and theme color are normalized.
- No map schema, UID, text, hierarchy, relation, image, checkpoint or settings migration is introduced.
- The initial toolbar event is emitted only for a non-empty complete selection in an existing node, not for a newly inserted node.
- The resource-excluded ZIP intentionally omits the large `assets/` directory retained by the user locally.
