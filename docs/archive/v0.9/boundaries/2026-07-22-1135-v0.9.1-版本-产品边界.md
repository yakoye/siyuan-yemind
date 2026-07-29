# YeMind v0.9.1 product boundaries

v0.9.1 changes the whole-map theme color system only. Existing map structure, node UIDs, project styles, command history, settings, checkpoints and storage file names remain compatible.

Generated theme colors are runtime fallbacks. They are not serialized into node data. Explicit node text, background and line colors keep higher priority.

The 19 supplied theme records in `docs/theme-colors/yemind_theme_colors.json` remain unchanged and are the single source for generated runtime definitions.
