# YeMind v0.9.16 test coverage matrix

| Area | Permanent coverage |
| --- | --- |
| Hover state | Blue image-only frame; no handles or toolbar |
| Click selection | Eight handles, delete button and Replace/Delete toolbar; node activation retained |
| Keyboard deletion | Delete/Backspace removes image only and ignores editable controls |
| Edge resizing | Free one-axis resize; Shift preserves ratio |
| Corner resizing | Ratio preserved with or without Shift; opposite corner anchored |
| Cursor contract | N/S, E/W and diagonal cursors mapped to the eight handles |
| Replacement | Existing image dialog opens for the selected node |
| Double-click routing | Image opens lightbox; text opens editor and selects all |
| Drag isolation | Image overlay controls do not start structural drag |
| Clipart geometry | 48px longest edge; legacy 72 × 72 repair retained |
| Regression cleanup | Old Delete/resize/magnifier controls absent |
| Packaging | ZIP integrity, exclusions, extracted syntax/type/build checks |
