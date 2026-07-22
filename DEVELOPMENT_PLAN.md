# YeMind development plan

## Current baseline

- Product version: 0.9.6
- Host baseline: SiYuan 3.7.3
- Plugin ID and folder: `siyuan-yemind`

## Completed foundations

- Local map, settings and checkpoint repositories.
- Canvas, split outline and full outline views.
- Stable UID-based node transactions and focus ownership.
- Rich-text editing, node images, notes, comments and styles.
- Global search integration and node navigation.
- Structured diagnostics and domain-organized regression suite.
- Complete theme text, fill, border and line color system.
- Atomic whole-map appearance refresh with viewport and selection preservation.
- Unified structured outline with native cross-node selection, staged select-all and selection-aware paste.
- Indentation-based hierarchy import, UID/metadata preservation and failure rollback.
- Full indentation-cell outline dragging with stable row/depth insertion feedback.
- Hover-owned canvas node quick actions with a pointer-safe bridge.

## Next priorities

1. Validate v0.9.6 right-growing logical drag and stable outline editing in SiYuan 3.7.3 with large maps and mixed images.
2. Generalize the accepted right-logical drag model through explicit layout adapters for left, bilateral, organization, timeline and fishbone families.
3. Profile 1,000+ node outline editing and drag-target resolution, reducing unnecessary DOM or geometry work without weakening transaction safety.
4. Expand import/export formats in isolated releases.
5. Continue accessibility, screen-reader and keyboard-navigation coverage.
6. Prepare a stable 1.0 compatibility and migration policy.
