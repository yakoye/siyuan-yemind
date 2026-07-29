# YeMind v0.9.30 Product Boundaries

## Included

- Geometry-aware placement of node `+ / - / count` controls.
- Direct-child count and one-level quick expansion.
- Full selected-subtree expand/collapse from node menus.
- Full-map expand/collapse from blank-canvas menus.
- Default-pinned top, bottom and left toolbars controlled by one pin.
- Separate vertical/diagonal pin and open/closed lock icons.
- Canvas node `文本转导图…` entry.
- Shared Replace/Delete popover for canvas and outline marker/clipart resources.
- UID-targeted marker and clipart deletion.

## Deliberately unchanged

- Map tree schema, node UID format and existing content fields.
- Image resize/lightbox behavior for ordinary node images.
- The marker and clipart catalogs and their fixed asset files.
- Rich-text, relation, summary, outer-frame and drag data formats.
- Zoom/title editing introduced in v0.9.29.

## Behavioral distinctions

- A quick count click expands one level only; it is not an “expand all descendants” command.
- Node context-menu expansion applies to one subtree; blank-canvas expansion applies to the whole map.
- A marker or clipart click does not immediately open a catalog; it first presents Replace/Delete.
- The auto-hide pin is a presentation setting and does not change map content.

## Packaging boundary

The update ZIP intentionally excludes the already-installed fixed resources:

- `assets/clipart/`
- `assets/icons/marker-sprite.png`
- `assets/layout-thumbnails/`

It also excludes maps, settings, checkpoints, diagnostics and every other user-created storage file.
