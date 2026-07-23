# YeMind architecture

YeMind is a local-first SiYuan mind-map plugin built with TypeScript, Vite, Quill and `simple-mind-map`.

## Layers

- `src/plugin/`: SiYuan lifecycle, Dock, tabs, global search and protocol links.
- `src/model/`: map and checkpoint repositories, schema normalization and persistence.
- `src/core/`: engine registration, commands, drag behavior, themes, palettes and decorations.
- `src/editor/`: canvas, unified structured outline, selection/clipboard coordination, focus ownership and project controls.
- `src/ui/`: dialogs, menus, color panels, image preview and diagnostics surfaces.
- `src/settings/`: settings storage plus shortcut and general configuration pages.
- `src/diagnostics/`: structured event timeline, self-checks and exportable diagnostic archives.

## State ownership

- Repository map data is authoritative for structure, content, appearance and view state.
- `simple-mind-map` commands own structural mutations and undo/redo history.
- Stable node UIDs bridge canvas rerenders, structured outline rows, search results and checkpoints.
- The structured outline is an editing projection, not a second persisted document.
- Outline DOM transactions are converted back to one `MindMapTree` and committed through the upstream undoable `updateData()` path; `setData()` is intentionally not used.
- Canvas and outline own focus independently. Text selection is never interpreted as node dragging; structural drag begins only in the outline gutter.
- Images, notes, comments, tags, todo state and local styles remain node data fields and survive ordinary title/hierarchy editing.

## Unified outline model

- One `contenteditable` root owns every visible node row, allowing native selection across rows.
- Each row carries stable UID, depth, collapsed state and semantic controls; controls are `contenteditable=false`.
- Collapsed descendants remain in the logical projection but are hidden visually, so whole-outline copy remains complete while ordinary mouse selection follows visible content.
- Selection, paste and drag are routed through explicit coordinators rather than separate text/tree modes.
- Current-node replacement, cross-node replacement and indentation import are atomic and rollback if the tree transaction is rejected.
- Outline row start, depth step, drag gutter, marker column and indent-rainbow guides share one geometry contract; the Root has no guide and each descendant guide lies halfway between adjacent marker columns.

## Persistence

Current storage is under `data/storage/petal/siyuan-yemind/`:

- `maps.json`
- `settings.json`
- `checkpoints.json`

Release packages contain code and documentation only.

## Compatibility

Historical plugin links and theme identifiers are accepted through narrow internal aliases. Existing map/settings/checkpoint schemas do not require a v0.9.13 migration. v0.9.13 changes rendering hosts, interaction routing and default labels only; it does not introduce a storage schema fork. Legacy outline controller source remains only for historical test compatibility and is not reachable from the current runtime bundle.

## Fixed local visual assets (v0.9.12)

`src/data/*catalog*.json` is the only runtime inventory for markers, clipart and layout thumbnails. `src/config/yemind-local-assets.ts` resolves catalog-relative paths from the SiYuan plugin base URL. The UI never scans folders. Marker nodes store stable sprite IDs, clipart nodes store a stable `yemindClipartId` plus the plugin-local image URL, and maps persist `layoutPresetId` separately from the actual engine `layout`.

## Interaction stabilization (v0.9.13)

- Marker sprite images live inside SVG patterns so only the icon viewport contributes to node geometry.
- Canvas context-menu capture preserves the multi-selection snapshot before upstream selection clearing.
- Rich-text measurement nodes live under `document.body`, outside hidden SiYuan tabs, and are removed at map destruction.
- Image tools are hover-owned and About is a standalone top-level dialog.


## Combined summaries and same-generation geometry (v0.9.14)

Multi-selection summary planning is handled by `src/core/combinedSummary.ts`. It removes selected descendants covered by a selected ancestor, finds the lowest common ancestor of the remaining nodes, projects them to direct children and invokes the native summary command once for a single contiguous range.

Rich-text and custom-content measurement caches live in one off-screen host that mirrors the active `.ymz-editor` class, data attributes and CSS variables. Cache relocation schedules one full render rather than a partial rerender so text, node shape and layout are computed in the same generation. Drag-first right-button panning explicitly cancels the upstream Select gesture before movement begins.
