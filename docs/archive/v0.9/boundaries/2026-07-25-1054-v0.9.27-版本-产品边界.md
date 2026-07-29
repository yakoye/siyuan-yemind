# YeMind v0.9.27 product boundaries

## Included

- Sprite-backed marker rendering and direct marker editing from outline rows.
- Outline image and clipart single-click editing plus double-click shared lightbox preview.
- Hover previews for note, comments, todo, tags, link and outer-frame state.
- Compact anchor-aware marker and clipart dialogs with custom title bars and close buttons.
- Note autosave on title-bar or backdrop close, with explicit Cancel discard.
- Direct canvas clipart picker editing without the ordinary image replacement toolbar.
- Todo prefix geometry normalization.
- Accessory-only outline synchronization while rich text remains dirty and focused.

## Data-safety rules

- All actions use existing canonical node fields and commands.
- No v0.9.27 map-schema migration is introduced.
- Dirty outline text and selection are not replaced by accessory refreshes.
- Ordinary image data and resize behavior are unchanged.
- Release archives exclude maps, settings, checkpoints, diagnostics and other user-created storage.

## Deliberately excluded

- Mirroring canvas node background, border, shape, branch styling or actual outer-frame geometry in outline rows.
- Image crop/reposition tools inside the outline.
- Changing ordinary image single-click behavior on the canvas.
- Adding a second marker, image, note or comment persistence layer for outline mode.
