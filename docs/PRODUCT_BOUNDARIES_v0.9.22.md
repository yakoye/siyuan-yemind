# YeMind v0.9.22 product boundaries

- Host baseline remains SiYuan 3.7.3.
- This release changes only the presentation boundary for the 14 supplied operation icons and related regression coverage.
- The exact fixed colors in `图标-svg.txt` are preserved. YeMind no longer converts them to `currentColor`.
- Host themes and snippets may size or position the outer image element, but cannot recolor embedded SVG paths through ordinary CSS selectors.
- Dark-theme contrast now follows the original source artwork rather than inherited host text color and therefore requires visual confirmation in the user's actual theme.
- No map schema, UID, hierarchy, rich text, relation, image, checkpoint, settings or asset-catalog migration is introduced.
- The resource-excluded release ZIP intentionally omits the large fixed `assets/` directory and must be installed over the user's existing complete plugin directory when those assets are already present.
- User data files such as `maps.json`, `settings.json` and `checkpoints.json` are not included or modified by the package.
