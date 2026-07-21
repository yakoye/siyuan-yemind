# YeMind v0.5.7 Verification

## Scope

This release adds only native outer-frame workflows. It does not add checkpoints, import/export, cross-map state, custom frame coordinates, or a second history implementation.

## Upstream contract verified

The tests execute the `parseAddNodeList` implementation from the installed `simple-mind-map@0.14.0-fix.3` package and verify:

- continuous siblings are grouped into one range;
- non-continuous siblings are split into separate ranges;
- nodes under different parents are grouped separately;
- selecting an ancestor and descendant keeps only the top ancestor.

YeMind delegates creation to `ADD_OUTER_FRAME`, text editing to `showEditTextBox`, style changes to `updateActiveOuterFrame`, and deletion to `removeActiveOuterFrame`.

## Automated verification

- `npm test`: 64 test files, 150 tests passed.
- `npm run check`: TypeScript passed.
- `npm run build`: passed; 855 modules transformed.
- Generated `index.js`: Node syntax check passed.
- ZIP integrity and extracted runtime checks: passed.

## Manual verification still required in SiYuan

1. Add one frame to one ordinary node.
2. Select three continuous siblings and create one frame.
3. Select two non-continuous siblings and confirm two frames.
4. Select nodes under different parents and confirm separate frames.
5. Select a parent and descendant and confirm no duplicate nested frame is created.
6. Edit frame text by toolbar and by double-clicking the native text label.
7. Change stroke, fill, solid/dashed style, and text alignment.
8. Move framed nodes, reorder siblings, change node text, zoom, and switch layouts.
9. Delete a frame, then undo and redo.
10. Save, close the tab immediately, reopen, and confirm frame data remains.
11. In readonly mode, confirm frames can be selected and inspected but not created, changed, or deleted.

The current build environment cannot launch the user's local SiYuan v3.7.2 instance, so these mouse-level checks are not claimed as completed.
