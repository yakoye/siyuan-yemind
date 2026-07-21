# YeMind architecture

YeMind is a local-first SiYuan mind-map plugin built with TypeScript, Vite, Quill and `simple-mind-map`.

## Layers

- `src/plugin/`: SiYuan lifecycle, Dock, tabs, global search and protocol links.
- `src/model/`: map and checkpoint repositories, schema normalization and persistence.
- `src/core/`: engine registration, commands, drag behavior, themes, palettes and decorations.
- `src/editor/`: canvas, split outline, rich-text editing, focus ownership and project controls.
- `src/ui/`: dialogs, menus, color panels, image preview and diagnostics surfaces.
- `src/settings/`: settings storage and About/shortcut/general pages.
- `src/diagnostics/`: structured event timeline, self-checks and exportable diagnostic archives.

## State ownership

- Repository data is authoritative for maps, appearance and view state.
- Engine commands own structural mutations and history.
- Stable node UIDs bridge canvas rerenders, outline rows and search results.
- Canvas and outline share map data but never share an implicit focus-restoration ticket.
- Images, notes, comments, tags and local styles are node data fields.

## Persistence

Current storage is under `data/storage/petal/siyuan-yemind/`:

- `maps.json`
- `settings.json`
- `checkpoints.json`

Release packages contain code and documentation only.

## Compatibility

Historical plugin links and theme identifiers are accepted through narrow internal aliases. New links, resources, diagnostics and persisted identities use `siyuan-yemind` and current YeMind identifiers.
