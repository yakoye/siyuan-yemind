# YeMind v0.9.18 product boundaries

- Host baseline: SiYuan 3.7.3.
- Stored map schema is unchanged from v0.9.17.
- Opening split or outline view may scroll only YeMind's outline container to reveal the currently selected node. It does not change the active canvas node or enter outline editing.
- The original right-logical drag resolver remains the reference implementation and is called directly for `logicalStructure`.
- Other adapted layouts normalize their local growth direction into the same interaction frame; the final mutation still uses the existing native tree command and history path.
- Drag previews are transient. They may move rendered sibling subtrees and temporary incoming-edge overlays, but they do not persist intermediate coordinates into map data.
- `rightFishbone` and `rightFishbone2` are registered runtime layouts. Their tree geometry and generated paths are horizontally mirrored from the upstream fishbone implementation while node content remains unmirrored.
- Tree-table and “other” gallery items do not introduce separate storage schemas; they map to supported engine layouts and inherit their drag behavior.
- Resource-excluded release archives intentionally omit `assets/` and must be overlaid on a local project that already contains those fixed resources.
- Release archives never contain maps, settings, checkpoints, diagnostics or other user-created storage data.
