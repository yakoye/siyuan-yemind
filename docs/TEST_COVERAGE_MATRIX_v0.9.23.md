# YeMind v0.9.23 test coverage matrix

| Contract | Automated coverage |
|---|---|
| Failing test precedes implementation | RED logs from `iconLayoutDarkV0923SmokeEntry` and `smoke-v0923-icon-grid-dark.py` against v0.9.22 |
| 22px custom icon slot | Offline source/CSS contract and Chromium geometry measurement |
| 15px proportional artwork | Offline source/CSS contract and Chromium bounding-box measurement |
| 4px menu label alignment | Chromium native/custom icon rows; label-left spread ≤ 1px |
| Native SiYuan icon parity | Chromium verifies 22px SVG box and 3.5px padding |
| Exact light source bytes | SHA-256 checks for all 14 `图标-svg.txt` data URIs |
| Host CSS isolation | Chromium hostile `svg path` fill/stroke regression |
| Dark icon selection | Editor and detached context-menu appearance selectors |
| All 14 dark icons visible | Chromium canvas pixel audit: non-empty alpha and average luminance threshold |
| Dark outline hover/active | Chromium computed-state contrast checks |
| Dark top-toolbar active | Chromium foreground/background contrast check |
| Test organization | 15 domains / 196 permanent scenario modules |
