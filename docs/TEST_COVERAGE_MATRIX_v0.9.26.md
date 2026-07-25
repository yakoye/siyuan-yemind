# YeMind v0.9.26 test coverage matrix

| Contract | Automated coverage |
|---|---|
| RED tests written before implementation | New import-geometry, expand-semantics and outline-content suites failed against v0.9.25 before implementation |
| Imported wrapping has one width authority | Unit/offline tests assert `customTextWidth=280`, automatic marker present and `width` absent |
| Conservative legacy repair | Runtime and Chromium tests remove equal duplicated v0.9.25 width fields while retaining custom width and marker |
| Hidden-outline import stabilizes on map reveal | Chromium imports while the canvas is hidden, switches to map mode and checks measured geometry |
| Text remains inside node border | Chromium compares foreignObject bounds with node shape bounds |
| Child branch starts after parent border | Chromium asserts positive parent-right-to-child-left spacing |
| Stable text translation | Chromium verifies wrapped text uses a small internal translation instead of half-node stale centering |
| Branch deep collapse | Commands-selection and dependency-free tests assert selected and descendant branches become collapsed |
| Branch one-level expand | Tests assert only the selected branch expands and descendants remain collapsed |
| Global collapse/root-only expand | Pure-transform tests cover all-branch collapse and root-only one-level restoration |
| Dynamic expansion labels | UI/Chromium contracts verify branch and global state-specific menu text |
| Outline image single-click edit | Chromium verifies one click opens the shared image editor |
| Outline image double-click preview | Chromium verifies double-click opens the lightbox and cancels edit |
| Outline content status projection | Unit/offline/Chromium cover todo, tags, link, note, comments and outer-frame status controls |
| Full outline Add submenu | Chromium verifies todo, outer frame, note, comments, tags, icon, link, clipart, image, code block, formula and inline link |
| Shared data, no duplicated attachment store | Outline controller routes actions to existing editor commands/dialogs; suites assert canonical UID callbacks |
| No visual-decoration mirroring | Accessory contracts omit node fill, border, shape and branch styling from outline projection |
| Previous v0.9.25 contracts | Browser regression covers bounded import dialog, processed preview, dark panels and outline icon/image projection |
| Broad browser regression | 25 browser smoke scripts complete with clean exits; v0.9.18 completes all assertions but its Chromium process does not terminate before the container timeout |
| Test organization | 15 domains / 207 permanent scenario modules |
