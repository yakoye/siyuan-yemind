# YeMind v0.9.17 product boundaries

- Host baseline: SiYuan 3.7.3.
- Stored map schema is unchanged from v0.9.16.
- Live width following is active only while the native node width handle is pressed and is throttled to one full render per animation frame.
- The final width is still persisted by simple-mind-map on mouseup; intermediate frames do not create history records.
- Canvas selection may clear a DOM text range inside the structured outline. It does not alter node text or browser selections outside YeMind's outline.
- “编辑节点” edits only the primary selected node. Multi-selection keeps its existing batch menu.
- The 添加 submenu changes labels according to current todo and outer-frame state; readonly restrictions remain enforced.
- Resource-excluded release archives intentionally omit `assets/` and must be overlaid on a local project that already contains those fixed resources.
- Release archives never contain maps, settings, checkpoints, diagnostics or other user-created storage data.
