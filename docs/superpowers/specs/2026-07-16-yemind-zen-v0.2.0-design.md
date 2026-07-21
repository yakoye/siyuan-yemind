# YeMind Zen v0.2.0 Source-Core Design

## Goal

Replace the transitional hand-written SVG runtime with a fully source-built SiYuan plugin powered by `simple-mind-map`, while renaming the install folder and plugin ID to `siyuan-yemind-zen` and keeping the in-app name `YeMind Zen`.

## Scope

v0.2.0 delivers a stable base editor rather than the full future feature set. It includes:

- TypeScript/Vite as the only runtime source; no transitional root runtime is retained.
- A SiYuan Dock listing local YeMind maps.
- One reusable tab per map, with duplicate-open prevention.
- New, rename, copy-link and delete-with-confirmation actions.
- Node rendering and selection through `simple-mind-map`.
- Double-click editing, child/sibling insertion and node deletion.
- Native history, undo/redo, drag/reparent, pan, zoom and fit-view.
- A SiYuan-native context menu backed by `simple-mind-map` commands.
- Local persistent storage through the SiYuan plugin data API.
- A KMind-Zen-inspired compact top-left toolbar, left tool strip and bottom status bar.

Out of scope for v0.2.0: formulas, cloze, advanced rich text toolbar, XMind/KMindz compatibility, document-tree maps, mirror blocks and subdocuments. These remain subsequent milestones.

## Architecture

### Runtime

`src/index.ts` exports the SiYuan plugin class. Vite bundles all editor code and `simple-mind-map` into root `index.js`; `siyuan` stays external because it is provided by the host.

### Data

`MapRepository` owns a versioned `maps.json` document. Each map stores its title, timestamps, layout, theme and a `simple-mind-map` tree. Repository changes notify Dock and open tabs.

### Editor

`YeMindEditor` creates one `simple-mind-map` instance and maps UI actions to its command API. The editor subscribes to `data_change`, `node_active`, `node_contextmenu` and view events. Debounced persistence writes current map data without storing DOM state.

### SiYuan integration

`YeMindZenPlugin` registers icons, Dock, custom tab, top bar and commands synchronously. It loads storage asynchronously afterward. `openMap()` focuses an existing matching custom tab before opening a new one.

### UI

The visual structure follows the previously approved KMind-Zen-inspired scheme:

- top-left floating toolbar: brand, map, split, outline, import/export placeholders and save state;
- left floating strip: fit, reset zoom, undo, redo;
- bottom floating status: title, roots/nodes/words, search placeholder, zen, read-only, minimap placeholder, zoom, fullscreen and help.

Only controls backed by implemented behavior are active in v0.2.0; later controls are omitted rather than shown broken.

## Error handling

- Invalid storage falls back to an empty repository and reports a non-destructive error message.
- A map that disappears while open renders a concise missing-map state.
- Deleting an open map closes its tab.
- No map is auto-recreated when the final map is deleted; the Dock may be empty.

## Testing

- Unit tests cover default-map creation, repository CRUD, final-map deletion, serialization and duplicate-tab matching.
- Command-adapter tests use a fake mind-map object to prove the correct native commands are issued.
- Build and TypeScript checks prove the installable root bundle is generated solely from `src/`.
