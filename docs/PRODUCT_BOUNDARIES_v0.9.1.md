# YeMind v0.9.1 product boundaries

YeMind owns its product interface, map repository, settings, checkpoints, diagnostics, search integration, outline behavior and editor coordination. Third-party dependencies are listed in `THIRD_PARTY_NOTICES.md`.

v0.9.1 changes theme and color configuration only. It does not change map structure, node UIDs, command history or storage schemas. Existing maps continue to load without migration.

The authoritative named-theme source is stored in:

- `docs/theme-colors/yemind_theme_colors.json`
- `docs/theme-colors/yemind_theme_colors.md`
