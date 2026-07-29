# YeMind v0.9.2 product boundaries

v0.9.2 changes only the whole-map appearance model and its redraw coordination. Map structure, node UIDs, command history, settings, checkpoints and storage file names remain compatible.

The authoritative named-theme sources are:

- `docs/theme-colors/yemind_theme_colors_with_borders.json`
- `docs/theme-colors/yemind_theme_colors_with_borders.md`

Generated theme values are runtime fallbacks. Explicit node-local text, fill, border or line colors remain higher priority and are not overwritten or serialized by a theme change.

Theme and rainbow-line changes are applied through one renderer transaction. It does not invoke the rainbow plugin command that writes colors into nodes, so switching appearance does not add map-history entries or mutate node data.
