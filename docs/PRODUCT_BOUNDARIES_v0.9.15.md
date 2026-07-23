# YeMind v0.9.15 product boundaries

- Proportional sizing applies to clipart selected from YeMind's local clipart picker.
- The default box remains 72px on the longest axis; this release does not change the user's manual image-resize controls.
- Existing nodes are repaired only when they have a stable `yemindClipartId`, use the old custom `72 × 72` default and do not already carry the current geometry version.
- Ordinary pasted, dropped or file-selected images are not migrated.
- Clipart whose SVG does not expose usable numeric dimensions or a `viewBox` falls back to the historical square default; the picker can also use the browser-loaded intrinsic size when available.
- The update ZIP intentionally excludes the fixed `assets/` tree. The corrected local assets must already exist in the target project.
- This release changes display geometry and asset metadata only; it does not fork the persisted map schema.
- Host baseline remains SiYuan 3.7.3.
