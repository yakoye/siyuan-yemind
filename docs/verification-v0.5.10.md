# YeMind v0.5.10 Verification Report

Date: 2026-07-17

## Scope

v0.5.10 is a real-runtime stability release based on two diagnostics archives exported from SiYuan 3.7.2. It does not add a new map format, free-drag mode, replacement layout engine, or second persistence implementation.

## Diagnostic evidence

### Archive `yemind-diagnostics-20260717-103711.zip`

- Plugin version: 0.5.9
- Persistent map summaries at export: 2
- Recorded events: 476
- Real `map-deleted` events: 0
- Runtime errors: 1
- Error sequence 312: `容器元素el的宽高不能为0`
- The error followed a switch to pure outline view, where the hidden mind-map canvas was still resized.

### Archive `yemind-diagnostics-20260717-103934.zip`

- Plugin version: 0.5.9
- Persistent maps in the full-content attachment: 3
- Recorded events: 25
- Real `map-deleted` events: 0
- Runtime errors: 0
- Open-map requests: 8
- Editor mounts: 2
- The third map received repeated open requests without a corresponding editor mount.

### Confirmed root causes

1. The diagnostics lifecycle self-check created a temporary map in the real `MapRepository` and deleted it in `finally`. The Dock therefore briefly displayed a third item and then removed it. The user's real maps were not deleted.
2. Dock rendering could occur before repository loading completed and was not guaranteed to refresh after readiness.
3. Restored or hidden SiYuan tabs could have a zero-sized container when the editor was constructed.
4. Pure outline mode still called `mindMap.resize()` after hiding the canvas.
5. A stale tab registry handle could prevent the same map from being opened again.
6. Todo badge clicks reused the context-menu three-state transition, so the completed state was deleted instead of becoming pending.
7. Structured drag kept upstream target calculation but lacked a continuous, clear parent guide.

## Implemented fixes

### Isolated diagnostics

- Added `runIsolatedLifecycleProbe` with separate temporary map and checkpoint storage files.
- The real map/checkpoint repositories are read only for summaries during self-check.
- Added a single-flight lock so simultaneous self-check requests share one lifecycle run.
- Temporary files are cleaned in `finally`.
- Added a regression proving no real repository emission or map-list mutation occurs.

### Dock and restored tabs

- Dock shows `正在加载导图…` until `host.whenReady()` resolves, then forces a final render.
- A restored tab registers a live handle, waits for a non-zero container, and only then constructs `YeMindEditor`.
- Tab activation retries while SiYuan is still creating the tab head element.
- Dead handles are removed from `OpenMapTabRegistry` so reopening can create a fresh tab.
- Visibility polling disconnects its observer and timers after completion or cancellation.

### Zero-size canvas protection

- Pure outline mode does not call `mindMap.resize()`.
- Map/split mode uses bounded animation-frame retries and only resizes a non-zero canvas.
- Checkpoint application skips hidden-canvas resize/fit work.
- Diagnostic self-check does not warn about the intentionally hidden canvas in outline mode.

### Todo semantics

- Badge/checkbox click: pending ↔ completed.
- Context menu: add todo → mark completed → delete todo.
- Deletion remains available only through the explicit context-menu action.

### Structured drag guide

- Added `YeMindDrag`, extending the installed upstream `Drag` plugin.
- The guide uses upstream `overlapNode`, `prevNode`, `nextNode`, and original parent resolution.
- A dashed line connects the drag clone to the current upstream-selected parent.
- Existing placeholder lines are made dashed and more visible.
- `MOVE_NODE_TO`, `INSERT_BEFORE`, and `INSERT_AFTER` remain entirely upstream-owned.

## Automated verification

```text
Test files: 82 passed
Tests: 195 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 871
Built index.js syntax: passed
```

Focused coverage includes:

- isolated lifecycle storage and cleanup
- no real repository mutation during diagnostics
- concurrent self-check coalescing
- Dock startup readiness
- restored-tab liveness and deferred activation
- non-zero element waiting and cancellation
- outline-mode zero-canvas behavior
- safe editor resize contract
- todo checkbox and context-menu state transitions
- drag target resolution and nearest-edge guide geometry
- existing context menus, persistence, checkpoints, outer frames, relations, rich text, selection, clipboard, and drag regression suites

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

These are existing upstream dependency findings. No bottom-layer package was force-upgraded in this stability release.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. After installation, verify:

1. Start SiYuan and confirm all three existing maps appear without running diagnostics.
2. Run self-check and confirm the Dock count never temporarily increases or decreases.
3. Open every map, including the previously non-mounting third map.
4. Switch map → outline → split → map and confirm no console error.
5. Add a todo, click to complete, click again to return to pending, then delete only from the context menu.
6. Drag a child or subtree and confirm the dashed line follows the current target parent while structural behavior remains unchanged.
7. Export a new diagnostics archive if any issue remains.
