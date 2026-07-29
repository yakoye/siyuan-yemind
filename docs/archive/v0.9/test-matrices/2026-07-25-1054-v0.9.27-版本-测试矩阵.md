# YeMind v0.9.27 test coverage matrix

| Contract | Automated coverage |
|---|---|
| RED tests before implementation | New outline-asset suite and dependency-free smoke failed against v0.9.26 marker/hover/dialog contracts before implementation |
| Outline marker uses shared sprite | Unit/offline/Chromium assert sprite background, actionable marker value and absence of duplicated SVG pattern markup |
| Marker is directly editable | Chromium clicks an outline marker, checks selected picker state, adds another marker and verifies the outline projection updates |
| Dirty outline text is preserved | Chromium edits active outline text, changes marker data and verifies both unsaved text and updated markers remain |
| Image click/double-click distinction | Controller and Chromium verify cancellable single-click editing and shared double-click lightbox preview |
| Semantic hover preview | Unit and Chromium cover note, comments, todo, tags, link and outer-frame preview content |
| Compact todo control | Unit/offline/Chromium assert borderless outline checkbox and centered 18px canvas prefix geometry |
| Compact anchored dialogs | Unit and Chromium assert custom title/close controls, 600/660px target widths, viewport clamping and non-overlap with clicked assets |
| Note close semantics | Source/unit contracts assert autosave function is used by Save, custom close and backdrop; Cancel marks discard |
| Canvas clipart direct picker | Unit/source contract and browser regression assert clipart click emits the picker event without the selected-image toolbar |
| Cross-view accessory refresh | Controller contract plus Chromium verify accessory-only updates while preserving focused outline content |
| Previous v0.9.26 contracts | Existing import geometry, disclosure and outline content regressions remain in the full suite |
| Broad browser regression | 27 Chromium smoke scripts completed with clean exits; the long-running v0.9.18 multi-layout script did not complete inside the container limit, while its neighboring drag/layout regressions passed |
| Test organization | 15 domains / 208 permanent scenario modules |
