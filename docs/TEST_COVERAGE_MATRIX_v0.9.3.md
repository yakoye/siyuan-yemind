# YeMind v0.9.3 test coverage matrix

| Domain | v0.9.3 coverage |
| --- | --- |
| Styles and themes | Transparent center fill resolves to effective canvas/theme background; explicit center and local fills retain priority. |
| Commands and selection | Hover shows add/collapse/expand actions without selection; pointer bridge keeps controls alive while crossing the gap. |
| Outline and split view | Continuous textarea serialization, full 34-line sample import, indentation inference, escaped punctuation, explicit/implicit root rules, stable UID and structural-path metadata reconciliation, multiline indent/outdent, automatic indentation, IME composition protection, debounced whole-tree apply and tree/text synchronization. |
| Data safety | Whole-document replacement uses undoable `updateData()` and existing autosave; release ZIP excludes user data. |
| Browser regression | Real Chromium verifies root coverage, hover bridge, default text mode, multiline native selection, sample TOC import, repository persistence and secondary tree mode. |
| Existing regression | All 15 test domains / 166 scenario modules, deterministic offline bundle, plugin bootstrap, theme/rainbow refresh, light/dark mode and archive extraction gates remain active. |
