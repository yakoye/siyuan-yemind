# YeMind v0.5.8 Verification Report

Date: 2026-07-17

## Scope

This release adds named, persistent checkpoints and transactional safe restore without changing the existing map autosave format or replacing `simple-mind-map` runtime history.

## Implemented behavior

- Checkpoints are stored independently in `checkpoints.json`.
- A checkpoint contains an immutable snapshot of node data, layout, theme template, and validated view data.
- The current map title is not overwritten during restore.
- Users can create, list, rename, restore, and delete checkpoints.
- Each map keeps up to 20 ordinary manual checkpoints by default.
- Automatic retention removes only the oldest ordinary manual checkpoints.
- Recovery-protection checkpoints are never automatically removed.
- If every old checkpoint is protected, a newly created checkpoint is preserved and the list may temporarily exceed 20 entries.
- Before restore, the editor flushes pending autosave data and creates a protected “before restore” checkpoint.
- The map snapshot is restored transactionally through `MapRepository.restoreSnapshot()`.
- The open editor is refreshed through the upstream `simple-mind-map.setFullData()` API.
- Read-only mode permits viewing and creating checkpoints, but blocks restore.
- Deleting a map triggers best-effort cleanup of its checkpoint records after the map deletion succeeds.

## Automated verification

The following commands completed successfully from the project root:

```bash
npm test
npm run check
npm run build
node --check index.js
```

Results:

- Vitest test files: 71 passed.
- Vitest tests: 170 passed.
- TypeScript check: passed.
- Production build: passed.
- Vite transformed modules: 860.
- Built JavaScript syntax check: passed.
- Built assets:
  - `index.css`: approximately 50.25 kB, gzip 8.61 kB.
  - `index.js`: approximately 1,917.28 kB, gzip 417.42 kB.
  - `index.js.map`: approximately 3,707.36 kB.

## Checkpoint-specific regression coverage

Automated tests cover:

- Independent repository loading and normalization.
- Deep-cloned immutable snapshots.
- Per-map sorting and filtering.
- Manual retention at the configured limit.
- Protected checkpoint preservation.
- Newly created checkpoint preservation when all previous entries are protected.
- Rename and delete operations.
- Map deletion cleanup.
- Flush-before-create and flush-before-restore behavior.
- Protection checkpoint creation before restore.
- Abort behavior when protection creation fails.
- Transactional map restoration.
- Preservation of the current map title.
- Upstream `setFullData()` editor refresh.
- Autosave suppression during snapshot application.
- Read-only restore protection.
- Checkpoint dialog rendering and command wiring.

## Dependency audit note

`npm audit` reported one low-severity and two moderate-severity findings in the dependency tree. No high- or critical-severity findings were reported. These findings were not changed as part of v0.5.8.

## Manual verification still required

This environment cannot launch the user’s actual SiYuan v3.7.2 workspace. The following should therefore be checked after installation:

1. Create a named checkpoint after editing several node types.
2. Close and restart SiYuan and confirm that checkpoints remain visible.
3. Rename and delete a checkpoint.
4. Restore an older checkpoint and confirm that the current map title is unchanged.
5. Confirm that a protected “恢复前” checkpoint is created before restoration.
6. Restore again from that protection checkpoint.
7. Create more than 20 ordinary checkpoints and confirm that only the oldest ordinary entries are pruned.
8. Verify that protected entries are retained even if the total temporarily exceeds 20.
9. Restore while an autosave is pending and confirm that the latest pre-restore state is protected.
10. Confirm that read-only mode allows viewing/creating but not restoring checkpoints.
11. Delete a map and confirm that its checkpoints no longer appear.
