# YeMind v0.9.26 — import geometry, deterministic collapse and outline content parity

## 1. Imported long-node geometry

v0.9.25 assigned both `width` and `customTextWidth` to automatically wrapped imported nodes. In a visible canvas this could be masked by a later measurement pass, but importing from outline-only mode meant the map canvas was hidden while rich text was first measured. The browser then returned zero-sized text bounds, while the duplicated width fields influenced different stages of node and layout calculation. The result could be a border, text body and branch anchor that did not share the same geometry.

v0.9.26 uses one layout authority for imported wrapping:

```text
customTextWidth: 280
yemindImportedAutoWidth: true
```

The importer no longer writes `width` for automatic wrapping. A conservative migration removes `width` only when all of these conditions are true:

- `yemindImportedAutoWidth === true`;
- `width` and `customTextWidth` are both numeric;
- the two values are equal.

This repairs v0.9.25-generated data without touching manually sized nodes or unrelated historical data.

### Hidden-canvas stabilization

If import occurs while the editor is in outline-only mode or has a zero-sized canvas, measured layout is deferred. When map or split mode becomes visible, YeMind:

1. resizes the map container;
2. waits for DOM creation and two animation frames;
3. performs one measured redraw;
4. restores the exact pre-import scale and translation;
5. restores the active node;
6. suppresses internal view-change persistence during the transaction.

This prevents text from being centered using stale or zero bounds and avoids importing content changing the user's viewport.

## 2. Recursive collapse and one-level expansion

Collapse state is now calculated by pure tree transforms in `src/core/expandState.ts`.

### Selected branch

- **Collapse all descendants:** the selected branch and every descendant branch receive `expand: false`.
- **Expand one level:** only the selected node receives `expand: true`; descendant branch states remain collapsed.

Menu labels are state-specific:

```text
折叠全部下级节点
展开一级下级节点
```

### Whole map

- **Collapse all nodes:** every branch node receives `expand: false`, leaving only the root visible.
- **Expand one level:** only the root receives `expand: true`, displaying first-level nodes while their branches remain collapsed.

Global labels are:

```text
折叠所有节点
展开一级节点
```

Each action replaces the tree once, creates one undo step, and persists the resulting expansion state.

## 3. Outline image and clipart interactions

Outline accessories are non-editable controls rendered outside the text surface.

For images and clipart:

- single click waits briefly, selects the node, then opens the shared edit/replace workflow;
- double click cancels the pending single-click action and opens the shared image lightbox;
- accessory events do not begin text editing or outline dragging;
- read-only mode permits preview but blocks mutation.

The short cancellable delay prevents the browser's first click from opening an editor before a double-click preview can be recognized.

## 4. Outline node-content parity

The outline Add submenu exposes the same semantic node-content operations as the map:

- todo;
- outer frame;
- note;
- comments;
- tags;
- icon;
- node link;
- clipart;
- image;
- code block;
- formula;
- inline link.

Node-level operations reuse existing commands and dialogs after activating the outline UID. Rich-text operations target the structured outline's rich-text selection, so code, formula and inline-link edits synchronize through the same node data as canvas editing.

The outline projects compact status and content controls for todo, tags, link, note, comments, outer frame, icon, image and clipart. It deliberately does not paint the actual node background, border, shape, outer-frame geometry, branch lines or free canvas position.

## 5. Safety and persistence

- Import still builds and validates a cloned tree before one atomic replacement.
- Width migration is idempotent and narrowly scoped to v0.9.25 automatic-width records.
- Measured redraw does not create a separate undo record.
- Collapse/expand operations are immutable tree transforms.
- Outline actions mutate the canonical node data rather than maintaining a second outline-only store.
- User maps, settings, checkpoints and diagnostics remain outside release archives.
