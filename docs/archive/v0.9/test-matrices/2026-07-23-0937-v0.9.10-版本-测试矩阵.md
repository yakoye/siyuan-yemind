# YeMind v0.9.10 test coverage matrix

| Area | Permanent automated coverage |
|---|---|
| Guide ownership | One overlay and one guide element per expanded visible parent |
| Triangle alignment | Chromium compares guide X with the expanded triangle tip/centre |
| Vertical start | Guide starts immediately below the triangle tip |
| Visible subtree span | Guide ends at the last visible descendant marker |
| Uniform width | Every rendered line resolves to exactly `1px` |
| Duplicate prevention | Parent UID set and line count must match; same-depth intervals may not overlap |
| Color cycle | Parent depth selects the existing four-color indent-rainbow palette |
| Canvas → outline | Canvas activation scrolls and reveals the matching active outline row |
| Outline → canvas | Outline activation centres/presents the matching canvas node |
| Local scrolling | Outline reveal changes outline `scrollTop`, not page scroll |
| Historical outline | Selection, paste, Enter, empty deletion, drag and rich-text behavior |
| Historical canvas | Themes, drag preview, edge continuity, image tools and node editing |
