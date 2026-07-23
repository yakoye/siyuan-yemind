# YeMind v0.9.17 design: live width layout, context menus and selection ownership

## Scope

This release addresses three independent user-visible regressions without changing the stored mind-map schema:

1. Descendants and edges lag behind while a node text-width handle is being dragged.
2. The single-node context menu has ineffective editing, inconsistent terminology and grouping, and misaligned custom icons.
3. Clicking several canvas nodes can immediately reactivate one old outline row such as “新节点2”.

## Live node-width layout

`simple-mind-map` re-renders the resized node on every pointer move but performs the complete tree layout only on mouseup. `LiveNodeWidthLayoutController` observes active native width-handle drags and schedules at most one `map.render()` per animation frame. It does not execute a data command or create history entries. The native mouseup path remains responsible for persisting the final `customTextWidth`.

## Context-menu contract

The single-node menu order is:

1. 编辑节点
2. 插入同级节点
3. 插入子节点
4. 插入父节点
5. 添加
6. 关联线
7. 节点样式
8. 复制、剪切、粘贴、粘贴（纯文本）
9. 上移节点、下移节点、展开/折叠
10. 删除操作

The 添加 submenu owns dynamic todo and outer-frame actions. Three custom SVGs visualize sibling, child and parent insertion using the same stroke weight and 24×24 view box as other YeMind menu icons.

## Selection ownership root cause

The structured outline retained a browser DOM range in the previously edited row. When a canvas click selected a new node, YeMind updated the outline active UID, but the next document `selectionchange` event still pointed to the old outline editor. That event called the outline activation callback and selected the old node again.

Canvas-originated synchronization now uses `syncActiveUid()`: it clears any selection range anchored inside the outline, drops the outline active-editor reference and updates row highlighting without adopting an editor. Direct outline editing still uses `activateUid()` and retains its own selection.

## Marker hit-area defense

Marker icons are rendered from a large sprite. The generated SVG root clips overflow and the underlying sprite `<image>` has `pointer-events=none`; only the visible marker rectangle participates in node interaction.

## Data safety

No migration is added. Node UIDs, text, hierarchy, relations, images, outer frames and todo data remain unchanged. Only normal user commands persist modifications.
