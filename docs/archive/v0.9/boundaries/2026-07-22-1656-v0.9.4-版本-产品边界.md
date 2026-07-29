# YeMind v0.9.4 product boundaries

v0.9.4 replaces the outline editing projection and interaction routing. It does not change the persisted map, settings or checkpoint schema.

## Owned by YeMind

- unified structured outline DOM and row semantics;
- stable UID projection between map data and outline rows;
- staged select-all behavior;
- copy/cut/paste and indentation parsing;
- drag gutter, drop intent and aligned insertion indicators;
- flat hover/active visuals, black markers and rainbow depth guides;
- IME, readonly and transaction rollback behavior;
- bridge to upstream undoable `updateData()`.

## Still owned by the map engine

- actual map layout and canvas rendering;
- structural command history and undo/redo;
- node relation/outer-frame/generalization rendering;
- final node measurement and canvas rich-text rendering.

## Persistence and migration

- `maps.json`, `settings.json` and `checkpoints.json` retain their existing formats.
- Stable node UIDs and existing metadata fields are preserved.
- A historical outline mode preference is no longer presented; it does not require data migration.
- Legacy outline controller files remain source-level compatibility fixtures only and are unreachable from the release runtime entry.

## Reference implementation boundary

The supplied third-party reference package was inspected only to understand observable interaction patterns. YeMind does not depend on its minified private modules, does not import its editor state and does not copy proprietary compressed code.
