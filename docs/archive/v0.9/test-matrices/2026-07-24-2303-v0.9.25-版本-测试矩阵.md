# YeMind v0.9.25 test coverage matrix

| Contract | Automated coverage |
|---|---|
| RED tests written before implementation | New UI-shell, outline-split and dependency-free smoke contracts failed against v0.9.24 before implementation |
| Dialog remains inside viewport | Source contract plus Chromium bounding-box assertion (`980 × 696` in a `1280 × 760` viewport) |
| Source and preview scroll independently | CSS/source suite checks `min-height:0`, `overflow:hidden` shell and `overflow:auto` panes |
| Preview is parsed output | Runtime smoke verifies four preview rows and absence of `├─`, `└─`, `│` source glyphs |
| Long-label unit estimator | Outline-split suite and dependency-free runtime smoke cover CJK/ASCII unit calculation |
| Automatic imported width | Runtime and Chromium verify `width=280`, `customTextWidth=280`, and no inserted newline |
| Manual width ownership | Commands-selection regression expects persisted `SET_NODE_DATA` width plus `yemindImportedAutoWidth:false` |
| Custom Theme/Line panels | UI-shell suite and Chromium verify buttons, panels, selected item and no visible native select |
| Dark project-control palette | CSS contracts and Chromium surface/toolbar luminance checks |
| Outline icon/image/clipart projection | Outline-split suite, dependency-free runtime smoke and Chromium DOM assertions |
| Outline Add submenu | UI-shell source contract and Chromium submenu order `图标 / 剪贴图 / 图片` |
| No border/background mirroring | Flattened-block suite asserts style fields are absent; accessory CSS is content-only |
| Previous v0.9.24 contracts | Chromium verifies menu order, line-only cut, import, repeated Enter and zero-pixel theme-switch drift |
| Existing icon isolation | Hostile-CSS and dark-pixel regressions for all 14 supplied SVGs |
| Broad browser regression | All 26 `scripts/smoke-*.py` scripts complete successfully |
| Test organization | 15 domains / 204 permanent scenario modules |
