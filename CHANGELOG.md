# Changelog

## 0.9.22 - 2026-07-24

- Replace inline rewritten supplied SVG geometry with the exact Base64 SVG documents from `图标-svg.txt`.
- Render all 14 supplied operation icons through an image document boundary so SiYuan/theme `fill` and `stroke` selectors cannot turn outline paths into solid black blobs.
- Preserve original dimensions, fixed colors, masks, dashes, opacity and path data while retaining one consistent 18px toolbar/menu layout box.
- Add permanent SHA-256 source-byte, dependency-free offline and hostile-host-CSS Chromium regressions.
- Preserve the v0.9.21 double-click full-selection formatting-toolbar behavior.

## 0.9.21 - 2026-07-24

- Preserve the exact path geometry from the supplied SVG catalog while normalizing every operation icon into one centered 20×20 current-color presentation shell.
- Replace fixed dark strokes and fills with theme-inherited color without redrawing masks, dashed guides, opacity or relationship semantics.
- Apply the supplied artwork to search, project style, undo, redo, upper/same/lower insertion, node style, relationship, outer frame, marker and clipart actions.
- Emit the rich-text selection payload after double-click enters edit mode and selects the complete node text, so the shared formatting toolbar opens immediately.
- Add source-contract, offline and real Chromium regressions for source geometry, dark-theme inheritance, menu slots and the initial full-selection toolbar.


## 0.9.20 - 2026-07-24

- Redraw supplied and clipboard operation icons with one 20×20 current-color visual system.
- Flatten marker and clipart dialog surfaces, remove marker group headings, and keep native close controls in the top-right corner.
- Add bidirectional root-crossing drag intent for mind maps, including branch-local before, after and child slots.
- Persist the destination branch direction before applying cross-root moves and retain independent left/right candidate stability.
- Add offline and suite-level regressions for icon geometry, dialog structure, and mirrored root crossing.

## 0.9.19 - 2026-07-24

- Replace the requested project, node, history, relationship, insertion, asset, search and fullscreen icons with normalized theme-aware SVG artwork.
- Rename and reorder node insertion actions as upper-level, same-level and lower-level.
- Reverse the footer mode glyph so it communicates the action after clicking.
- Rebuild the marker picker as one fixed-size categorized scroll view with sticky navigation, explicit close, outside-click dismissal and aligned footer actions.
- Rebuild the clipart picker as a fixed-size complete catalog without the Load More control.
- Open the checkpoint manager directly from the toolbar and add checkpoint creation inside the manager.
- Align the outline insertion marker to the branch marker center for the resolved target depth.
- Add permanent source, offline and UI-shell regressions for the complete v0.9.19 interaction contract.

## 0.9.18 - 2026-07-24

- Reveal the currently selected canvas node immediately when split or outline view opens, using outline-local scrolling without transferring editing ownership.
- Preserve the proven right-logical drag path and mirror its local zones, sticky targeting, parent guide and room preview for left logical structure.
- Normalize branch directions so mind-map, reverse, balanced-down, tree, timeline, organization and gallery-mapped layouts share immediate drag geometry.
- Generalize live room making to horizontal and vertical sibling axes while retaining one candidate-parent guide and removing legacy insertion/origin lines.
- Add a dedicated right-fishbone renderer that mirrors left fishbone node geometry, paths, summaries and tail without mirroring readable content.
- Add permanent source, offline and Chromium regressions for split reveal, cross-layout repository mutation and right-fishbone geometry.

## 0.9.17 - 2026-07-24

- Reflow the complete map on animation frames during node-width dragging so descendants and edges follow in real time.
- Make “编辑节点” enter text editing with a full text selection; rename node creation actions to 插入同级/子/父节点 and add relationship SVG icons.
- Move outer-frame and todo state actions into 添加, reorder clipboard commands before movement commands, and align custom menu icons with labels.
- Prevent stale structured-outline DOM selections from reactivating an old row after a canvas node is clicked.
- Clip marker sprite SVG overflow and disable pointer events on the source sprite image to eliminate oversized transparent click interception.
- Add permanent offline, source-contract and Chromium regression coverage for the reported interactions.

## 0.9.16 - 2026-07-23

- Rebuilt node-image interaction around direct manipulation: hover border, click selection, eight resize handles and a compact Replace/Delete toolbar.
- Made side handles resize freely by default and proportionally with Shift, while corner handles always preserve the current aspect ratio with directional cursors.
- Scoped Delete and Backspace to the selected image so the image is removed without deleting its node.
- Routed image double-click to the lightbox and text double-click to edit mode with the complete node text selected.
- Removed the old hover Delete, resize and magnifier controls, and kept image actions outside structural drag sessions.
- Reduced new clipart geometry to a 48px longest edge while retaining migration of legacy 72 × 72 defaults.
- Added permanent unit, source-contract, offline and Chromium regressions for the new image workflow.

## 0.9.15 - 2026-07-23

- Replaced the fixed `72 × 72` clipart insertion size with intrinsic SVG geometry fitted proportionally inside a 72px box.
- Preferred authored SVG `width`/`height`, fell back to `viewBox`, and finally used the already-loaded image dimensions when direct fetch is unavailable.
- Added automatic repair for legacy default clipart nodes carrying `yemindClipartId` and the old square `72 × 72` geometry.
- Synchronized the corrected local asset contract and regression expectations to 13 categories and 764 clipart SVGs.
- Added permanent v0.9.15 aspect-ratio, parser, migration and source-contract regressions.

## 0.9.14 - 2026-07-23

- Replaced per-node multi-selection summaries with one combined summary projected to a contiguous range under the lowest common ancestor.
- Preserved native summary history, rich-text editing and duplicate-range protection while keeping selected descendants folded into their selected ancestor.
- Rebuilt hidden-tab measurement around a stable off-screen editor context and one full repair render, keeping text and node frames in the same geometry generation.
- Isolated drag-first right-button panning from the upstream selection plugin, removing the selection rectangle and selection mutation without breaking stationary context menus.
- Added permanent v0.9.14 unit, source-contract and Chromium regressions for all three reported defects.

## 0.9.13 - 2026-07-23

- Kept marker sprites out of node-content geometry by rendering each icon through a viewport-sized SVG pattern.
- Restored hover-only image tools and magnifier-click preview with a lighter blurred backdrop.
- Replaced thick black active association lines with a clear blue, lightly emphasized selected state.
- Added toolbar hover feedback, outside-click closing for Structure, and separate compact project/node style panels.
- Moved About out of Settings and placed it between Settings and Diagnostics in the top-bar menu.
- Changed new-map node labels to `中心主题` and two `新节点` while preserving the file title `未命名导图`.
- Preserved multi-selection when right-clicking any selected node.
- Moved rich-text measurement nodes outside hidden SiYuan tab containers to prevent text nodes collapsing into empty pills.
- Added permanent v0.9.13 regression suites for all reported defects.

## 0.9.12 - 2026-07-23

- Integrated 126 catalog-driven marker icons from the fixed local sprite; clicking a marker opens its category.
- Added a searchable 764-item clipart picker in 13 categories and place clipart above node text.
- Added a 28-item, seven-group visual layout gallery and persisted the selected `layoutPresetId`.
- Added runtime plugin-base URL resolution and prohibited directory scanning or embedded large visual resources.
- Added overlay-package rules, asset contract documentation, offline contract checks and Chromium interaction coverage.

## 0.9.11 - 2026-07-23

- Unified canvas and outline selection-toolbar timing and restored saved ranges before applying font or size changes.
- Added single-click image-tool pinning, double-click preview and outside-click unpinning without structural-drag leakage.
- Anchored project and node style panels to their triggers with one shared medium-size surface.
- Rebuilt single-node, multi-node and blank-canvas context menus with state-aware outer frames and separate node/inline links.
- Enabled editable cubic Bézier association-line control points, tangent-driven arrow orientation and persisted control data.
- Hardened delayed association-line probes after completion or cancellation.
- Moved node quick actions flush against node borders and added permanent browser regression coverage.

## 0.9.10 - 2026-07-23

- Replaced repeated per-row gradient guides with one structured-outline guide overlay.
- Drew exactly one 1px guide for each expanded parent, directly below its triangle tip and through its visible subtree.
- Preserved the four-color indent-rainbow cycle without overlapping same-parent segments.
- Added outline-local reveal when canvas selection changes.
- Kept outline selection centred on canvas through `GO_TARGET_NODE` and completed bidirectional visible-node synchronization.
- Added permanent source-contract and Chromium geometry/navigation coverage.

## 0.9.9 - 2026-07-23

- Unified outline row indentation, drag gutter, marker columns and indent guides under one geometry model.
- Removed the redundant guide to the left of the root marker.
- Moved the first guide to the midpoint between root and first-level marker columns.
- Positioned deeper guides at the midpoint between each adjacent pair of marker columns while retaining the four-color cycle.
- Kept drag indicator depth calculations on the same indentation variables.
- Added permanent CSS and Chromium geometry regression coverage.

## 0.9.8 - 2026-07-22

- Preserved unaffected solid tree edges throughout right-logical drag previews.
- Replaced only shifted incoming edges with temporary preview-coordinate overlays.
- Removed extra canvas rich-text focus frames while preserving the text caret and native selection.

## 0.9.7 - 2026-07-22

- Replaced fixed right-logical lanes and tiny edge hotspots with nearest-node enlarged local target boxes.
- Split every local box into sibling-before, sibling-after and child-side semantics for unequal node widths and heights.
- Added sticky-target hysteresis while allowing immediate switches on strong body/tail hits.
- Kept the green dashed parent preview continuously visible from drag start through release.
- Used the original parent only as a no-target fallback and switched to each candidate parent in the same pointer frame.
- Fixed mixed coordinate spaces by drawing both parent and ghost endpoints in scene coordinates.
- Made parent link, room-making preview and final command consume one candidate object.
- Added permanent unit, offline and Chromium coverage for continuous links and real-time parent switching.

## 0.9.6 - 2026-07-22

- Added explicit outline Enter splitting, soft breaks and two-stage empty-node deletion.
- Expanded outline drag initiation to the full indent cell and stabilized depth-aligned green guides.
- Fixed inherited-font toolbar presentation.
- Removed right-logical canvas insertion guides and introduced live room-making with one candidate-parent dashed link.

## 0.9.5 - 2026-07-22

- Rebuilt outline and canvas drag intent around shared NONE, BEFORE, AFTER and CHILD semantics.
- Restricted outline structural drag to an invisible 14px move gutter while preserving native text selection in node content.
- Reduced outline leaf squares to 5×5px and added YeMind-green depth-aligned insertion guides with a square origin marker.
- Replaced clone-overlap canvas targeting with pointer-based geometry, explicit sibling edge slots and hierarchy-aware child tails.
- Added neutral dead zones, immediate stale-target clearing, fast sibling stabilization and deliberate child dwell.
- Kept dashed parent previews visible throughout dragging and added green structural insertion guides on the canvas.
- Excluded dragged subtrees from hit testing and suppressed self, descendant, root and unchanged-position mutations.
- Added Escape cancellation, no-op history protection and metadata-preserving subtree moves across outline and canvas.
- Matched the trash-can artwork to the magnifier visual weight without changing image-action button boxes or hit areas.
- Isolated image preview, delete and resize controls from structural canvas dragging.
- Expanded permanent regression coverage to 15 domains and 170 scenario modules.

## 0.9.4 - 2026-07-22

- Replaced the dual text/node outline modes with one continuous structured outline editor.
- Added native cross-node selection, staged current-node/full-outline `Ctrl/Cmd+A`, and selection-aware copy, cut and paste.
- Added atomic single-node, cross-node and indentation-based multiline replacement with stable UID and metadata preservation.
- Preserved unselected child subtrees when multiline paste reuses an existing boundary node.
- Added safe rich-text clipboard handling, plain-text paste, hidden-descendant copy rules, IME protection and readonly selection/copy.
- Replaced leaf circles with equal-size black squares while retaining black expand/collapse triangles and indent-rainbow guides.
- Flattened hover and active row presentation to background/text state only, without borders, outlines, shadows or left accent bars.
- Restricted structural dragging to a dedicated gutter and added depth-aligned before, inside and after insertion indicators.
- Delayed the formatting toolbar until pointer or keyboard selection completes.
- Expanded permanent regression coverage to 15 domains and 169 scenario modules.

## 0.9.3 - 2026-07-22

- Filled transparent center topics with the effective theme or project canvas background.
- Rebuilt node quick actions around pointer hover and a delayed node-to-button interaction bridge.
- Added a continuous document outline with native multiline selection, copy/cut/paste and replacement.
- Added indentation inference, escaped punctuation normalization and hierarchy import for external outlines and table-of-contents text.
- Added Tab/Shift+Tab batch indentation and automatic indentation continuation on Enter.
- Reconciled document edits with stable node UIDs and metadata, committed through one undoable `updateData()` transaction.
- Added structural-path reconciliation for completely rewritten labels and protected Chinese IME composition from partial synchronization.
- Retained the synchronized node-tree mode for rich-text editing, drag and expand/collapse operations.
- Expanded permanent regression coverage to 15 domains and 166 scenario modules.

## 0.9.2 - 2026-07-22

- Added center, first-level, second-level and normal-node border colors to the complete theme data model.
- Replaced separate theme/rainbow refresh paths with one atomic appearance transaction.
- Fixed theme changes not appearing until a later structural render.
- Fixed rainbow-line palette changes not appearing immediately.
- Preserved viewport transforms and active-node selection across complete appearance redraws.
- Kept node-local text, fill, border and line styles above whole-map theme fallbacks.
- Expanded permanent regression coverage to 15 domains and 162 scenario modules.

## 0.9.1 - 2026-07-22

- Completed the 19 named theme definitions for center, first-level, second-level and normal-node text, fill and line colors.
- Added three complete base themes with light and dark appearances.
- Generated runtime theme data from one checked-in JSON source and registered 22 public themes.
- Preserved node-local text, fill and line styles above theme fallbacks.

## 0.9.0 - 2026-07-21

- Added a trash-can image removal control with confirmation before deletion.
- Added an image magnifier control and an editor-local lightbox with wheel zoom, 1:1 reset, outside-click, close-button and Escape dismissal.
- Removed native title tooltips from note and comment hover badges.
- Added ten named rainbow-line palettes: Dawn, Rainbow, Vitality, Dance, Code, Harmony, Island, Rose, Mint and Green Tea.
- Rebuilt whole-map themes around three base themes and ten complete color schemes with matching backgrounds and node/branch colors.
- Added permanent regression coverage for image controls, confirmation, lightbox behavior, hover badges, palette persistence and theme rendering.
- Updated the development and acceptance baseline to SiYuan 3.7.3.

## 0.8.6 - 2026-07-21

- Reorganized regression tests into 15 feature domains with a manifest-based structure check.
- Removed exact duplicate assertions while preserving all user-reported regression scenarios.

## 0.8.5 - 2026-07-21

- Isolated canvas and outline editing focus in split view.

## 0.8.4 - 2026-07-21

- Stabilized rich-text positioning after node drag rerenders.

## 0.8.3 - 2026-07-21

- Unified canvas and outline node text-editing transactions.

## 0.8.2 - 2026-07-21

- Made Dock and toolbar icons adapt through `currentColor`.

## 0.8.1 - 2026-07-21

- Completed the `siyuan-yemind` plugin identity and safe storage migration.

## 0.8.0 - 2026-07-21

- Established the YeMind product identity and green icon family.
