# YeMind v0.9.8 test coverage matrix

| Area | Permanent automated coverage |
|---|---|
| Shifted incoming-edge overlays | Parent-grouped temporary paths, shifted child endpoints, restored logical geometry, unused overlay removal and exact visibility restoration |
| Unaffected tree edges | Real Chromium verifies all non-dragged Root/parent branches remain visible during BEFORE and CHILD room-making previews |
| Dragged root incoming edge | Hidden only for the dragged root and replaced by the continuous green candidate-parent dashed guide |
| Candidate switching | Green guide switches parent while the count of unaffected solid edges remains stable |
| Cancellation | Escape removes overlays and restores all original solid edges |
| Flat canvas editing | Wrapper, Quill container and editor report zero border, zero outline and no shadow in Chromium and DOM-level tests |
| Editing visibility | Node-computed text/background, caret and native selection remain available |
| Historical canvas drag | Nearest-node local zones, hysteresis, room-making, CHILD/sibling commits, metadata retention and undo |
| Historical outline | Enter, soft break, empty-node deletion, structured selection/paste, stable guides and default-font presentation |
| Historical appearance/image | Themes, rainbow lines, root fill, hover actions and image controls |
