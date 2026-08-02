# Changelog

## 1.9.6 - 2026-08-03

This patch release fixes two remaining visual-state defects in the shared canvas text editor without adding another focus or rendering lifecycle.

- Moves the selection toolbar and its color popover into the same document-level overlay space as the upstream body-level canvas editor, so the toolbar remains above selected node text in both light and dark themes.
- Keeps toolbar placement in viewport coordinates, clamps it to the visible YeMind editor area and preserves the existing 120 ms pointer-selection settle behavior.
- Makes the existing full selection on Tab/Enter/+ nodes visibly painted by extending the selection CSS to the upstream body portal; typing immediately replaces `新节点` with a visible caret and live text.
- Adds browser gates for real stacking order, visible selection paint, automatic select-all and immediate replacement across Tab, Enter and quick-add paths.

## 1.9.5 - 2026-08-02

This patch release stabilizes the first visible frame of newly inserted nodes and the final handoff from live editing to committed SVG text.

- Restores the upstream `TextEdit` visibility behavior so Tab, Enter and quick-add nodes always retain a static text fallback until the opaque editor has painted.
- Keeps the live editor visible while changed text is committed and hides it only after the final `node_tree_render_end`, preventing a temporary upper-left text frame.
- Adds frame-by-frame gates for inserted-node text, editor-to-SVG handoff and node switching without changing the persisted map format.

## 1.9.4 - 2026-08-02

This patch release fixes the remaining node-width drag flicker without adding another YeMind overlay or timing workaround. The vendored `simple-mind-map` width-drag path now keeps the existing painted text subtree attached and updates its measured content and node geometry in place, while the normal upstream layout still performs the final committed render on pointer release.

- Keeps the same SVG text group and `foreignObject` alive for every width-drag frame, preventing the text from alternating between the upper-left origin and its final position.
- Updates the node shape, hover geometry and expansion placeholder in place during the live drag, then performs one canonical full render after the drag ends.
- Adds a DPR 1.25 browser regression that records every animation frame and fails on text-layer replacement, DOM detachment, missing content or more than one pixel of position drift.
- Records the trace-proven `nodeModifyWidth.js` fork in the upstream baseline contract so future builds cannot silently replace or broaden the vendor changes.

## 1.9.3 - 2026-08-02

This stability release completes the shared canvas/outline editing transaction work without replacing the upstream `wanglin2/mind-map` editor lifecycle. It removes the remaining first-frame gaps and stale clipboard state while keeping the plugin and standalone web build on one runtime.

- Gives the live canvas editor a stable node shell so text insertion, paste, node switching and custom-width editing keep the text, border and selection geometry aligned without an empty or duplicated visible frame.
- Makes nodes created through `Tab`, `Enter` and the quick-add button render their default text on the first visible frame, and keeps selection toolbars hidden until their current selection has settled and a complete below-selection position is available.
- Keeps clipboard intent explicit between text, node and image operations across canvas/outline editing states and same-file/cross-file destinations, preventing stale node payloads or source styling from leaking into a later paste.
- Accepts legacy v1/v2 map and checkpoint storage through the documented migration path while preserving every map instead of resetting pre-release data.
- Expands browser coverage for editing geometry, width drag, first paint, selection toolbar transitions, undo/redo and the cross-surface clipboard matrix; the verified release artifacts are shared by the SiYuan plugin and web edition.

## 1.9.2-rc.20260802.0910 - 2026-08-02

This timestamped release candidate keeps the official `simple-mind-map` text-edit lifecycle and removes YeMind's duplicate padded active outline during canvas text editing. It is intentionally not the stable v1.9.2 release and remains pending user verification in SiYuan.

- Confirmed from `Trace-20260802T084131.json.gz` and real SiYuan geometry sampling that the text glyph position remains stable while the padded active rectangle expands the visible node bounds on the double-click frame.
- Keeps the original node shape, text layout, Quill portal, focus and editing lifecycle unchanged.
- Hides only the redundant padded active rectangle while the upstream body editor portal is visible and applies the accent color to the existing node boundary.
- Adds exact first-visible-glyph, active-outline and official-upstream comparison coverage.
- Adds standard timestamped release-candidate identities so unconfirmed fixes do not consume a stable Patch version.

## 1.9.1 - 2026-08-02

This patch release removes the local rich-text overlay-host override that caused the map viewport to jump to the upper-left and snap back whenever a node editor opened, switched nodes, or closed during deletion.

- Restores the official `wanglin2/mind-map` body portal for the fixed-position Quill editor by removing YeMind's `.ymz-editor` `customInnerElsAppendTo` override. The editor is no longer nested inside the map's `overflow: hidden` scroll container, so Quill's native caret scrolling cannot move the map shell during editor focus.
- Keeps the upstream editor lifecycle, focus ownership and persisted map format unchanged; no delay, coordinate compensation, animation-frame positioning loop or parallel editor implementation was added.
- Adds frame-by-frame viewport invariants for opening an editor, switching from node A to node B, and deleting a node. The tests sample shell scroll offsets and the rendered map transform throughout the transition, preventing a final-position-only assertion from missing a one-frame jump.
- Updates all canvas rich-text and clipboard browser contracts to address the official body-level editor portal.
- Full pre-release verification: 973 unit tests passed (38 intentionally skipped), 22 web tests passed, offline smoke checks passed, and the complete desktop Playwright suite passed 90 scenarios with one mobile-only scenario skipped and zero failures.

## 1.9.0 - 2026-08-02

This release replaces the accumulated canvas text-editing patch stack with the official `wanglin2/mind-map` rich-text lifecycle and width behavior. It is a compatible Minor release: persisted map data and transfer formats remain unchanged, while the shared plugin/web editing runtime is substantially simplified.

- Restored the official runtime implementations for text creation, layout, width modification and rich-text opening/closing. Removed YeMind's parallel live-width layout, measurement host, custom plain-text layout contract, duplicate geometry reconciliation and the tests that encoded those obsolete paths. The principal simplification commit deletes 941 lines and adds 220.
- Normalizes runtime node text into the upstream rich-text representation without mutating the canonical persisted tree, preserving hard line breaks, rich HTML, children and summaries.
- Uses the upstream `customInnerElsAppendTo` option to keep the official editor inside the current YeMind tab's overlay host. This preserves upstream geometry while preventing a body-level editor from escaping the tab's style and stacking context.
- Keeps one small SiYuan host integration: an active edit session owns Quill focus until a real outside pointer action, so a host `RootWebArea` focus claim cannot force a third click before the caret appears. No fixed delay, continuous animation-frame poll or replacement editor lifecycle is introduced.
- Keeps canvas/outline clipboard intent explicit across editing and non-editing states, newly inserted nodes, images and same-file/cross-file targets, preventing a stale node payload from replacing a later text paste.
- Full verification before the release build: 972 unit tests passed (39 intentionally skipped), 22 web tests passed, offline smoke suite passed, and 108 Playwright scenarios passed (68 mobile/non-applicable scenarios skipped by project policy) with zero failures.

## 1.8.1 - 2026-08-01

Fixes two real regressions surfaced against the 1.8.0 canvas text edit kernel: (1) double-clicking into an unmodified node could shift its own line wrapping (e.g. a 5-character last line becoming 6 characters) even though nothing was edited, and (2) double-clicking some nodes never produced a visible caret at all. Both traced back to the editor-opening transaction, not to anything typed. Root causes and fixes below; no live-edit behavior removed in 1.8.0 (no `node_text_edit_change`, no `RenderLifecycleCoordinator`, no per-keystroke `createTextNode`/`layout`/`renderLine`, no permanent `requestAnimationFrame` polling, no mid-edit static SVG rebuild) was reintroduced.

- **Fixed line-wrap drift on open: the edit host never had an explicit `width`.** `applyEditorGeometry` only ever set `min-width`/`max-width` on the absolutely/fixed-positioned edit host. With no `width`, the browser resolves an auto-width positioned box by shrink-to-fit, which can round to a hair narrower or wider than the static SVG text's own layout width — enough to move the last word across the wrap boundary the instant editing opened, before any keystroke. `applyEditorGeometry` now also writes the exact same content width to `host.style.width`, and the Quill `.ql-container`/`.ql-editor` inside it are pinned to `width:100%; min-width:0; max-width:none` so nothing downstream can re-introduce ambiguity. Verified in a real Chromium session: the live editor's `.ql-editor` width now matches the node's canonical `data-width` exactly (0px delta, previously the two only agreed by coincidence).
- **Fixed the missing caret: the opening gate depended on a browser measurement that could never converge for some nodes.** `commitOpeningPlacement` used to require the live editor's `getBoundingClientRect()` to land within 1.5px of the target rect (`editorContentRectAligned`) before flipping `data-yemind-geometry-ready` to `true`; `markCurrentEditorReady` independently re-checked another live `getBoundingClientRect()` on top of that. For some node shapes (icon/todo prefixes, custom widths, certain zoom levels) neither measurement ever converged, so the gate — and the CSS rule hiding/unfocusing the host until it passes — stayed permanently closed: double-click, nothing visible, no cursor. Both checks are replaced with a structural readiness check (session current, host and `.ql-editor` connected, the content width/height this transaction itself computed and wrote are valid, Quill content loaded) that depends only on facts already known synchronously, never on a fresh paint that may not match. `editorContentRectAligned` is kept, but only feeds `yemind_text_edit_diagnostic` now.
- **Made `focus()` respect the opening gate instead of racing it.** The upstream base class calls `this.focus(start)` synchronously while the opening transaction still has no confirmed geometry. `focus()` now only records the intended selection (`pendingFocusIntent`, decided from the already-reliable `isInserting` flag, not by treating `start === 0` as a proxy for "select all" — an implicit convention that happened to work only because `selectTextOnEnterEditText` is always `false`, but couldn't tell "select all" from "place caret at position 0" if a future caller ever passed a real 0). The DOM focus/selection call itself moves to a new `applyPendingFocusIntent()`, invoked once by `commitOpeningPlacement` the moment the transaction reaches `active`. `scheduleOpeningFocusClaim` no longer self-reschedules for up to three frames; it is a single bounded fallback check one frame later, so one opening transaction claims focus at most twice.
- **Fixed re-double-clicking a node stuck mid-open.** `showEditText` used to bail out unconditionally whenever `showTextEdit` was already `true`, and even the fallback path only started a fresh session when the coordinator's phase was `idle` — so a session stuck in `opening` (never reaching `active`, e.g. a transient geometry-resolution race) made every further double-click on that same node a silent no-op forever. Re-entry on the same node now reclaims focus if the session is already `active`, or discards the stuck transaction (new `abortOpeningSession` — never touches node text or undo history) and opens a fresh session otherwise.
- Two pre-existing E2E geometry assertions were comparing mismatched quantities and are corrected rather than loosened: a 20px "host width vs. whole node width" tolerance (the node's outer shape includes ~9px of shape/icon padding per side that was never part of the editor's own content box) is replaced with a 0.5px comparison between the editor's actual content width and the node's canonical `data-width`; a second test's 0.5px comparison between the live editor and the static SVG group's raw `getBoundingClientRect()` (a canvas-measured *declared* width vs. a rendered *ink* bounding box — two quantities this codebase's own `logicalTextRect` deliberately never treats as equal) now compares both sides against that same canonical `data-width` instead.
- Added `tests/suites/rich-text-editing/v181AtomicCanvasEditorOpening.suite.ts`: reproduces all four defects above against the pre-fix code (explicit-width absence, session stuck at `opening` under a synthetic unmeasurable-rect first attempt, no recovery on re-double-click, `focus(0)` incorrectly selecting all on an edited node) as failing tests before the fix, all green after.
- Full verification: unit suite (1005 passed / 0 failed), `tsc --noEmit`, complete Playwright E2E for the web app (78 passed / 1 skipped as not applicable to desktop) all green.

## 1.8.0 - 2026-08-01

Canvas text edit kernel stabilization. The 1.7.1-1.7.6 series repeatedly patched symptoms of the same underlying architecture (a self-built real-time SVG-rebuild pipeline running on every keystroke, layered on top of vendor's own `openRealtimeRenderOnNodeTextEdit: false`) instead of removing it. This release removes that pipeline entirely rather than tuning it further, based on the user's own architectural review and independent trace analysis.

- **Removed the live-edit SVG commit path entirely.** `YeMindRichText`'s `text-change` handler no longer emits `node_text_edit_change`; `YeMindEditor` no longer listens for it. `RenderLifecycleCoordinator` (which mixed this removed commit logic with an unrelated overflow-repair responsibility) is deleted; the overflow-repair logic is preserved verbatim in a new, smaller `RenderedTextGeometryRepair`. During an edit session, Quill is the only text layer that changes — the static SVG text is untouched until the edit closes and commits once, authoritatively, through the existing `hideEditText()` → `SET_NODE_TEXT` → full render path. Accepted trade-off: the node's border no longer grows in real time while typing, only once the edit commits; paste no longer has a separate immediate-commit branch.
- **Removed two permanent per-frame polling loops**, converting both to event-driven: the canvas text editor's placement monitor (`startPlacementMonitor`, a `requestAnimationFrame` loop that ran every frame for the entire duration an editor was open) is now one synchronous calibration on open plus one scheduled follow-up frame, relying on existing `resize`/`scale`/`translate`/`node_tree_render_end`/`view_data_change` event subscriptions for everything after. The node quick-actions layer's geometry tracker (`trackRenderedGeometry`) no longer reschedules itself; it now runs once per external trigger, with new `node_dragging`/`node_dragend` subscriptions that hide the layer during a structural node drag and restore it after (an explicit `editSuppressed` flag prevents a concurrent drag on a *different* node from un-hiding the layer while text editing is still active on the original node).
- **Fixed double-click select-all on already-edited nodes.** `selectTextOnEnterEditText` is now `false`; the existing `isPristineNodeTextData()` check alone now decides select-all-on-open (still true for a genuinely new/never-edited node), so double-clicking a node with existing content places the caret instead of selecting everything and risking accidental full-text deletion on the next keystroke.
- **Fixed the Quill/SVG padding mismatch that dropped the last character to the next line.** Quill's own default `.ql-editor` padding (`12px 15px`) was never zeroed for the canvas edit host, stacking on top of the host's own vendor-set inset (`4px 6px`) and narrowing the editor's usable width below what the static SVG text layout assumed. Zeroing Quill's padding also incidentally aligned the editor's line-height (was inheriting Quill's default `1.42`) with the static layer's `1.2`, fixing a pre-existing vertical mismatch as well.
- Removed the orphaned-duplicate-static-text-layer cleanup (`removeOrphanedStaticTextLayers`) added in 1.7.3: its only trigger condition (the now-removed live commit racing with width-drag DOM reuse) no longer exists.
- Rewrote the E2E/unit coverage for all of the above: deleted tests that had encoded the removed real-time-rebuild behavior as required ("keeps an open editor on one live SVG node" used to assert `createTextNode`/`layout`/`renderLine` ran on every keystroke); added tests asserting the opposite — real, slowly-paced typing never touches the static SVG mid-edit, line-wrap stays consistent between the edit and static layers, exactly one text layer is visible across 60 sampled animation frames (including while actively typing), and a plain node drag (no text editing involved) hides/restores the quick-actions layer correctly. Also stabilized 3 pre-existing integration tests that had been skipped for an unrelated fixed-timeout race, unrelated to any of the above.
- Full verification: unit suite, `tsc --noEmit`, complete Playwright E2E all green; see `docs/regression-runs/` for the detailed per-change record.

## 1.7.6 - 2026-07-31

- Corrects the 1.7.5 root-cause attribution for the "pure typing" flicker/jump, based on the user's own independent trace analysis (two Chrome performance traces, the second captured on a map with a single node and no children, which on its own rules out subtree-recursion as the dominant cause): the dominant cost is not `renderLine(true)`'s descendant recursion (that fix was real but secondary — CPU-sample counts across both traces put only 1-3 samples in `renderLine` versus roughly two thousand in `createTextNode`/`measureText`). The actual dominant cost is `node.createTextNode()`'s plain-text word-wrap loop: it re-measures the string one character at a time (`measureText()` creates a new detached SVG `<text>` element and calls the browser's native `getBBox()`, which forces a synchronous layout, once per character while probing where to wrap). For ordinary node text this alone produced 180-380ms of forced synchronous `Layout` in a single commit, independent of tree size. The live-edit path called this on every committed keystroke, and Quill's own composition handling fires the same commit path on IME `compositionupdate` (not just `compositionend`), so a CJK candidate change could trigger it repeatedly before a character was even finalized.
- Fixed by debouncing the live-edit commit itself (`RenderLifecycleCoordinator`): rapid keystrokes and composition updates now coalesce into one commit ~160ms after the burst goes quiet, instead of paying the full measurement cost on every character. The node's live-growing border and connector lines still update correctly once per settled commit.
- Added regressions asserting: a burst of several rapid edits produces exactly one commit (with the final, latest text) after the debounce fires, not one per edit; and that closing the editor mid-debounce still flushes the latest pending edit synchronously through `flushPendingTextEdit()` (the coordinator method itself, verified directly).
- Caught by this change's own full E2E run before release, not by the user: widening the debounce window made a pre-existing but previously near-impossible-to-hit race in the editor-close path much easier to hit. `hideEditText()` already reads the editor's current text and commits it authoritatively (`SET_NODE_TEXT` + a full render when it actually changed) before emitting `hide_text_edit`; that event's listener then called the coordinator's `flushPendingTextEdit()`, which could replay an **older, debounce-queued** text snapshot over the authoritative commit that had just landed, momentarily showing an empty placeholder instead of the just-typed text. Reproduced with a real IME composition E2E test (flaky over a full suite run, then reproduced reliably standalone), fixed by having that listener call `invalidate()` instead — discard any in-flight live-edit commit on close rather than replaying it, since `hideEditText()`'s own commit is already authoritative. Re-ran the specific test 8/8 clean after the fix, then the full suite.
- Also corrects the CHANGELOG wording in the 1.7.5 entry below, which had accidentally referenced this plugin's own pre-rename identity by its literal old name — a string this plugin's own identity-contract test (`tests/suites/contracts-compatibility/v081PluginIdentity.suite.ts`) forbids in public documentation for exactly this reason. No functional change; the corrected root-cause note above stands on its own.

## 1.7.5 - 2026-07-31

- Fixed the "pure typing" flicker/jump left open in 1.7.3/1.7.4: a Chrome performance trace captured on the user's real document showed a single keystroke triggering a 184ms main-thread block containing 371 forced synchronous `Layout` passes, all inside `RenderLifecycleCoordinator.commitTextEdit`'s live-edit fast path. Root cause: that path called `node.renderLine(true)` on every keystroke. `renderLine(deep)` always redraws the node's own outgoing connector lines regardless of the `deep` flag; `deep=true` additionally recurses into every descendant's `renderLine`, even though this fast path never repositions descendants (`node.layout()` only rebuilds the edited node's own SVG content — it does not re-run the layout algorithm on children). For a node with a non-trivial subtree, that recursion did wasted, layout-thrashing work on every single character typed, scaling with subtree size; this is what produced the reported "type one character, text jumps, then recovers" behavior on the user's real, larger document while never reproducing on small test maps. Removed the unnecessary `deep` flag; the edited node's own connector lines are still redrawn correctly, its descendants' lines (which never moved) are no longer touched.
- Added a unit regression modeling a node with a child and grandchild (mirroring the real `renderLine(deep)` recursion contract) that asserts a single keystroke redraws only the edited node's own outgoing line and never reaches into descendant `renderLine` calls; confirmed failing against 1.7.4 (child spy was invoked) and passing after the fix.
- Corrects an earlier, incorrect lead pursued during live debugging: a separate plugin-storage/localStorage namespace found on the user's machine, matching this plugin's own identity from an earlier pre-rename development period (see `tests/suites/contracts-compatibility/v081PluginIdentity.suite.ts`, which guards against that old identity ever reappearing in current code or public docs), is leftover data from that period, not a separate interfering plugin; that theory was investigated and ruled out before the trace analysis above found the real cause.

## 1.7.4 - 2026-07-31

- Fixed the live canvas text editor keeping a stale `max-width` after it was already open: the upstream plugin only sets the editor host's `max-width` once, at the moment editing opens. Dragging a node's width handle while its text is already selected and being edited (select all, then narrow the node — a real, common sequence) changes `node.customTextWidth`, and the static SVG text re-wraps to it on every commit, but the live Quill overlay kept wrapping at the width captured when editing first opened. The two representations could show completely different line breaks for the same text — a narrow, many-line SVG stack next to (or briefly under) a wide, few-line Quill block — which is what the reported "double text" screenshots were actually showing once the earlier visibility-clobbering defect was independently fixed. `max-width` is now refreshed on every geometry sync (every keystroke and every drag frame), not just at open.
- Added a browser regression that opens a node, selects all its text, drags the width handle sharply narrower while still editing, and asserts the live editor's `max-width` follows the new width instead of staying stuck at the value captured when editing opened; confirmed failing before the fix (received width matched the pre-drag value, not the narrower one) and passing after.

## 1.7.3 - 2026-07-31

- Fixed a real SiYuan-only defect where dragging a node's width handle while its text is actively selected could leave the static SVG text label visible at the same time as the live Quill overlay (a duplicate/"ghosted" text layer): upstream's width-drag DOM reconciliation reuses the painted static-text element but also copies its freshly measured sibling's whole `style` attribute onto it, silently clearing the `visibility:hidden` YeMind applies while editing. Every width-drag frame during an active edit session now re-asserts that hidden state.
- Fixed a related DOM-accumulation defect where a race between that same width-drag reconciliation and a concurrent live-edit text commit could leave an orphaned duplicate outer SVG text group in the tree — never hidden, never removed, and visible permanently as a second copy of the node's label. Canvas text-visibility sync now sweeps the node's own stable SVG group for such orphans and removes them.
- Added unit regressions pinning both mechanisms directly (a width-drag frame that clobbers the static text's `style` attribute, and an orphan-sibling cleanup case).
- An earlier attempt in this same investigation (gating the SVG-vs-Quill "logical rect" alignment correction on `node.hasCustomWidth()`) was tried and then **reverted** after the full E2E suite caught it breaking editor placement for ordinary center/right-aligned and multi-line nodes — that correction is load-bearing for alignment, not just for custom-width nodes, and gating it out left affected editors permanently hidden. Full regression evidence is in this release's regression record; no trace of that attempt remains in the shipped code or tests.
- **Known remaining issue, not fully resolved by this release**: the static SVG text layer can still become intermittently visible for brief windows during very rapid continuous typing, even though the conditions that gate hiding it were confirmed always true when checked. This was investigated directly against a real SiYuan desktop session (via `--remote-debugging-port`) rather than only the standalone web build; the mechanism causing the brief visible window during typing bursts specifically (independent of the width-drag defect fixed above) was not conclusively identified in this pass and needs further dedicated investigation.

## 1.7.2 - 2026-07-31

- Fixed a severe canvas text-editing data-loss bug: after clicking to place the caret inside existing node text (not select-all) and typing, a single Backspace/Delete could wipe out most of the node's text instead of removing one character. Root cause: Quill's Selection module intentionally emits the caret move that follows typing as a suppressed (`SILENT`) event and never fires its public `selection-change` event for it, so YeMind's "last known selection" cache used as the Delete/Backspace fallback kept a stale, much larger range (e.g. the node's initial double-click select-all) instead of learning the caret had moved. Any user-driven text change now invalidates that cached range.
- Added a permanent browser regression that reproduces the exact click-then-type-then-Backspace sequence and asserts only the just-typed character is removed.

## 1.7.1 - 2026-07-31

- Fixed canvas node text editing so continuous typing (including real per-character keystrokes and CJK IME composition) can no longer lose focus or paint a ghosted duplicate text layer partway through a session: the live-text handoff between the static SVG label and the Quill editor now happens once and stays committed for the rest of the session instead of being re-evaluated (and able to regress) on every keystroke.
- Fixed a newly inserted canvas node's formatting toolbar staying unreachable after typing: the one-shot "swallow the programmatic initial selection" guard no longer also swallows the user's real first text selection on that node.
- Added real sequential-keystroke, IME-composition, second-session, existing-node-retype and single-commit-undo/redo browser regressions, plus a fault-injection regression that pins the exact geometry-realignment root cause.

## 1.7.0 - 2026-07-31

- Unified canvas and outline copy intent for text, image resources and complete node structures across editing/non-editing states, newly created nodes, same-file targets and cross-file targets.
- Added image-resource clipboard payloads with binary image, safe HTML and plain-text fallbacks; direct image context actions now copy the image while clicks outside the image continue to copy the node.
- Rebuilt undo/redo as an explicit history-replay transaction so asynchronous renderer callbacks cannot truncate the redo branch after outline or cross-file paste.
- Kept cross-file node paste free of source UIDs and whole-node presentation styling while preserving hierarchy, semantic rich text, images, clipart, markers, notes, comments, tags, links and attachments.
- Added a durable daily-operation matrix and release-blocking browser coverage for CRUD, Tab/Enter insertion, paste geometry, selection toolbar frames, Delete/Backspace/Ctrl+X, width drag, subtree drag, expansion, image operations and all canvas/outline clipboard routes.

## 1.6.3 - 2026-07-30

- Kept node quick actions anchored to the active node's own visible selection border during wheel, pan, zoom, resize and renderer refreshes, including complex nodes that contain nested descendant borders.
- Tightened the visible `−`, child-count and `+` controls while retaining their larger pointer hit areas.
- Reconciled the live SVG text tree in place during width dragging instead of replacing its HTML on every pointer frame, preserving the painted text nodes and preventing blank, ghosted or jumping frames.
- Added repeated browser and command regressions for viewport-following controls, direct-node border selection, monotonic width resizing, stable text DOM identity and bounded geometry drift.

## 1.6.2 - 2026-07-30

- Made the active DOM text range authoritative for selected-text toolbar placement, including transformed and scaled editor roots, so the toolbar stays beside the current selection instead of using a stale Quill rectangle.
- Hid the previous selected-text toolbar as soon as a new pointer selection begins, then measured and populated the replacement off-screen for two committed frames before revealing it atomically below the current range; it only flips above when the lower space is insufficient.
- Avoided issuing `SET_NODE_TEXT` and a full map render when leaving an unchanged node, preventing the previous node text from jumping while another node enters editing.
- Unified copy, cut, Delete and Backspace around the last valid non-collapsed editor range, preventing a transient collapsed caret from disabling a visibly selected range.
- Kept the SVG node as the single owner of node shape and background while the live HTML editor remains a transparent text layer, removing the mismatched inner frame after creating or pasting into a node.
- Kept ordinary rich-text link clicks inside the editing transaction and removed an inherited code-block format before inserting an inline formula, avoiding accidental navigation and empty code-block remnants.
- Added unit and real-browser regressions for stale-range positioning, single-transaction cut/delete, selection distance and first-frame editor/SVG geometry.

## 1.6.1 - 2026-07-30

- Replaced independent SVG, Quill, geometry and toolbar transient flags with one monotonic canvas edit-session coordinator.
- Kept the static SVG text visible until the replacement editor has both final geometry and meaningful content, then performed one atomic text-layer handoff.
- Rejected stale animation-frame, Quill selection and toolbar callbacks from previous node-editing sessions.
- Positioned the selected-text toolbar while hidden and ignored unrelated previous DOM ranges, eliminating the old-position flash before the current toolbar appears.
- Added state-machine unit coverage and a 50-frame browser regression requiring exactly one visible text layer on every animation frame.

## 1.6.0 - 2026-07-30

- Rebuilt canvas text editing around one geometry-ready transaction, removing the first-frame duplicate/shifted text layer and keeping multiline nodes stable while typing, pasting and resizing.
- Added a semantic node clipboard shared by canvas and outline, covering edit and non-edit modes, new-node anchors, same-file and cross-file copy/paste without leaking source presentation styles.
- Made outline paste a native UID-based structural transaction with one-step undo/redo, stable multiline hard breaks, new UIDs and consistent persistence after reload.
- Added deterministic browser and SiYuan regressions for double-click frame stability, monotonic width dragging, clipboard routing, cross-file style isolation and outline/canvas synchronization.
- Promoted this release to Minor because it delivers a compatible clipboard capability and a major editing-geometry subsystem refactor without changing the persisted map format.

## 1.5.3 - 2026-07-30

- Kept active canvas editing on one local render transaction so double-click, typing and paste no longer replace the complete SVG tree or flicker between stale and live text placement.
- Made node borders, connector lines and the Quill editor follow inserted and pasted text immediately, while width-handle drags retain one monotonic draft geometry until commit.
- Replaced the upstream parent-only drag ghost with a coherent preview of the visible parent subtree and its internal connectors.
- Enlarged the pointer hit areas for expand, collapse and child-count actions without changing their compact visual circles.
- Aligned multiline outline triangles and leaf squares to the first text line, and made one Delete or Backspace remove a selected multiline canvas range.
- Added deterministic unit and real-browser regressions for edit placement, live paste bounds, width resizing, subtree dragging, quick-action hit boxes, first-line outline markers and multiline deletion.

## 1.5.2 - 2026-07-29

- Stabilized live canvas editing so typing, pasting, clearing and width dragging update the editor, SVG node border and layout in one transaction without duplicate layers, jumps or stale geometry.
- Preserved multiline plain text and structural hard breaks through outline editing, collapse/expand, undo/redo, repository migration and full SiYuan restarts without escaped `<br>` markup or trailing blank lines.
- Made fast reverse outline selections survive overshooting the marker and rainbow guide, keeping Delete and Backspace bound to the real saved text range.
- Protected legacy Quill block formats during automatic migration and unified reversible cloze recognition between canvas and outline representations.
- Rebuilt the persistent symbol picker as padded layout cards with spatial groups, labels, keyboard-accessible names and continuous insertion into the original node.
- Added source build identity, expanded regression coverage, synchronized the shared plugin/web build, and documented the KMind transaction and geometry comparison.

## 1.5.1 - 2026-07-29

- Reworked canvas and outline editing into stable UID text transactions, preserving node geometry, viewport state, clipboard selections, and immediate paste bounds without duplicate render frames.
- Normalized clipboard boundary whitespace without losing Quill alignment, indentation, list, quote, or other supported block rich-text semantics in existing maps.
- Fixed fast right-to-left outline selection across the drag gutter so Delete and Backspace follow the real saved text range.
- Unified cloze detection and removal across canvas and outline representations, and made the selected-text toolbar opaque, flat, and readable over map content.
- Added context-menu card creation/removal parity and removed the standalone web sidebar's heavy shadows.
- Added repeated browser and migration regressions for geometry, clipboard, selection, rich-text preservation, cloze interoperability, menu state, and light/dark appearance.

## 1.5.0 - 2026-07-28

- Split outline editing into UID text patches and explicit structure transactions, preventing ordinary typing, whitespace and clearing from rebuilding the complete renderer tree.
- Kept unformatted Quill content on the plain SVG text path while preserving real rich text, eliminating first-edit node size jumps and stabilizing legacy rich-text geometry.
- Fixed browser soft-wrap paste, saved-range Delete/Backspace, canvas rich-text copy, and UID-based quick-action anchoring after renderer refreshes.
- Flattened node selection and selected-text toolbar chrome, with real desktop/mobile browser regressions for geometry, clipboard and outline synchronization.
- Completed the confirmed Version47 follow-up alignment: restored the original network/map symbols, unified fullscreen and appearance icons, removed toolbar separator blocks, flattened context menus, and kept every toolbar/control readable in both appearances.
- Rebuilt minimap viewport projection, responsive zoom controls, theme-aware two-pixel hidden-edge rails, stable hover reveal, larger root typography, and colored segmented outline guides with matching triangles and leaf squares.
- Added the full VS Code-style two-row search/replace contract with case sensitivity, whole-word, regular-expression, selected-node scope and preserve-case controls while preserving rich-text markup and navigating every occurrence.
- Added an atomic revisioned render lifecycle so new-node text appears immediately and stale edit frames cannot move labels after deletion or interfere with unrelated relation lines.
- Deduplicated restored SiYuan tabs by map identity before repository startup, keeping repeated file opens in the already restored tab, and made review-to-card navigation locate the current card.
- Rebuilt the shared editor shell around the confirmed version47 design with unified three-edge toolbar behavior, responsive overflow, discoverable hidden edges, and complete light/dark surfaces.
- Added persistent cards and focused review with progress, search, favorites, flipping, status changes, node linkage, three review ratings, and a same-session requeue for “again”.
- Expanded the Basic theme group to YeMind Default, Ink Branch, Material, Aurora, Morning Mist, and Dunes with real light/dark six-color definitions and explicit apply behavior.
- Replaced the obsolete bidirectional organization entry with a real right-growing organization structure and aligned all 28 gallery contracts, thumbnails, quick controls, and drag directions.
- Restored text selections before every canvas/outline rich-text action, expanded the outline panel controls, and added keyboard/touch-safe context menus.
- Finalized `.yemind.svg`, `.yemind.zip`, outline HTML and interactive map HTML exports while keeping legacy `.yemindz.*` imports compatible.

## 1.3.0 - 2026-07-27

- Unified the SiYuan plugin and standalone web app around one source tree, one eight-marker version contract and reproducible dual-host release ZIPs with manifests and SHA-256 checksums.
- Added independent top, left and bottom toolbar hiding with discoverable edge indicators, persisted light/dark/system appearance and responsive desktop/mobile behavior.
- Stabilized all 28 structure layouts, branch controls, canvas/outline CRUD and dragging, context-menu viewport clamping, media editing/preview, relation lines and complete multi-format transfer.
- Fixed selected-text formatting on canvas and outline so every shared toolbar action preserves its range; fixed reversible cloze formatting and outline edit/delete context actions.
- Added unit, web, offline and real-browser acceptance suites plus GitHub CI, Pages deployment and tag-driven dual-package releases.

## 1.2.0 - 2026-07-27

- Added one shared 12-format export workflow for the SiYuan plugin and standalone web app, with `.yemind.svg` as the default.
- Added recoverable YeMind JSON/ZIP payloads for SVG, SVG package, KMindz, YeMind ZIP and PNG exports.
- Added automatic import detection for YeMind/KMindZ SVG and PNG packages, ZIP, XMind, legacy KMind/JSON, Markdown, OPML, text and FreeMind outlines.
- Reused the mature simple-mind-map SVG, PNG, XMind and PDF renderers while preserving YeMind layout, theme, project style and node extension fields in native packages.

## 1.1.1 - 2026-07-27

- Completed standalone canvas, node and outline context-menu parity with viewport clamping, scrollable tall menus, nested submenus, current-state marks and self-contained icons.
- Routed node quick disclosure through the live renderer so Root and intermediate branches reliably collapse and expand.
- Recalculated rich-text node geometry after web fonts load, preventing imported mixed-language labels from drifting outside their node bounds.
- Replaced the host-only formula symbol reference with a self-contained SVG visible in standalone text-selection toolbars.

## 1.1.0 - 2026-07-27

- Replaced approximate gallery mappings with 28 explicit runtime layout contracts and a compatibility bridge for existing documents.
- Added mirrored tree/timeline/organization layouts plus bidirectional organization, serpentine timeline, radial, table and bracket renderers.
- Unified quick-action and drag geometry with each layout's actual branch direction.
- Compacted the outline gutter, added a visible six-dot move handle, and added eight-point image/clipart selection with direct deletion.
- Redesigned shared replace/delete SVG actions and fixed standalone web development asset serving.

## 1.0.0 - 2026-07-27

- Fixed classic theme palette cards so they show only colors that the selected theme actually applies.
- Replaced the native rainbow-line scheme select with grouped two-column palette cards.
- Restored the patched `simple-mind-map` runtime as a reproducible local dependency and fixed a nullable drag-geometry edge case.
- Added a whitelist-based atomic runtime synchronizer that preserves an existing `data/` directory.
- Added a complete standalone web entry with IndexedDB persistence, map import/export, backups, responsive navigation and GitHub Pages deployment.

## 0.9.31 - 2026-07-26

- Changed only the Theme dropdown presentation to grouped tabs and two-column palette cards.
- Added exactly six real first-level branch color blocks to every existing theme card without modifying preset data.
- Preserved all 22 theme IDs, the Basic/Colorful/Classic groups, selection, persistence and map-appearance behavior.
- Kept the Line Style dropdown on its existing list presentation and added unit, offline and Chromium regressions for the display-only change.

## 0.9.30 - 2026-07-25

- Positioned node quick controls from the actual outgoing child connector across logical, bilateral, tree, timeline, organization and fishbone layouts.
- Separated quick one-level expansion from full subtree and full-map context-menu expansion/collapse semantics.
- Made top, bottom and left toolbars pinned by default with vertical/diagonal pin states, shared persistence and left-edge reveal; added distinct unlocked/locked icons.
- Added Text to Mind Map above Add in the canvas node context menu.
- Added one shared viewport-aware Replace/Delete popover for canvas and outline markers/clipart, with UID-targeted deletion and existing picker reuse.
- Added v0.9.30 unit, offline and Chromium regressions for branch direction, expansion scopes, toolbar states, menu contracts and resource actions.

## 0.9.29 - 2026-07-25

- Added default auto-hide behavior for the top and bottom toolbars, edge reveal, one persisted pin control, and hover/focus retention.
- Made the status zoom percentage directly editable with percent parsing and configured min/max clamping.
- Made the status title inline-editable and synchronized successful renames to repository data and the open SiYuan tab.
- Added a 12px invisible non-scaling association-line hit path while preserving the normal 3px selected visual stroke and keeping relation overlays out of node layout.
- Changed quick-action numbers to direct-child counts, recursively collapse descendants, expand only one level, and follow the rendered child branch across all supported layouts.
- Cleared image and clipart resize overlays when changing views and kept outline double-click preview on the shared image lightbox.
- Added v0.9.29 unit, offline and Chromium regressions for toolbar visibility, pin persistence, zoom/title input, relation selection, five-layout quick-action placement, expansion semantics and resource-state cleanup.

## 0.9.28 - 2026-07-25

- Replaced transformed outline marker children with a directly scaled compact sprite background, fixing marker artwork and border alignment.
- Replaced visible note/comment number badges with semantic SVG symbols and stabilized first-hover previews through measured hidden layout, animation-frame settling, image-load updates and `ResizeObserver` repositioning.
- Increased outline image click arbitration so single click opens the image editor while double click consistently cancels editing and opens the shared canvas lightbox.
- Restored canvas clipart direct manipulation with eight resize handles and a delete control while keeping direct picker access and suppressing only the ordinary replace toolbar.
- Added a pure eight-candidate anchored placement engine that keeps marker and clipart dialogs inside the viewport and avoids the clicked asset at edges and corners.
- Routed native and custom dialogs through a shared YeMind dialog shell, standardizing bold centered titles, close-button geometry and right-aligned footer actions.
- Added v0.9.28 unit, dependency-free runtime and Chromium regressions for marker geometry, semantic outline icons, stable previews, click arbitration, clipart handles, anchored placement and dialog chrome.

## 0.9.27 - 2026-07-25

- Replaced outline marker SVG reconstruction with the same sprite-backed rendering used by the canvas and made every outline marker directly editable through the marker picker.
- Preserved outline image and clipart single-click editing plus shared double-click lightbox preview, and added hover previews for todo, tags, links, notes, comments and outer-frame status.
- Added compact anchor-aware marker and clipart dialogs with bold custom title bars, explicit close controls and placement that avoids the clicked canvas or outline asset.
- Right-aligned note actions and made title-bar or scrim close autosave the current note while explicit Cancel continues to discard the edit.
- Changed canvas clipart clicks to open the clipart picker directly without the previous image replace/delete overlay, while ordinary images keep their existing resize behavior.
- Normalized todo prefix geometry and added accessory-only outline refresh so icon, image and semantic content changes remain consistent across map, outline and split views without overwriting active outline text.
- Added v0.9.27 unit, dependency-free runtime and Chromium regressions for marker rendering, asset interaction, dialog geometry, hover previews, note autosave, todo alignment and dirty-outline synchronization.

## 0.9.26 - 2026-07-24

- Removed redundant `width` from newly imported wrapped nodes and added a conservative upgrade repair for v0.9.25 nodes marked with `yemindImportedAutoWidth` when `width` equals `customTextWidth`.
- Added a post-import measured redraw that preserves the exact viewport transform and selected node, preventing long wrapped labels from desynchronizing text, node bounds and branch anchors.
- Changed branch disclosure to recursively collapse every descendant branch and to expand only the selected level; global disclosure now collapses all branches and restores only the root's first level.
- Added outline image and clipart single-click editing plus cancellable double-click lightbox preview through the existing shared image tools.
- Expanded outline content projection and actions for todo, outer frame, notes, comments, tags, node links, markers, clipart, images, code blocks, formulas and inline links without mirroring canvas decoration.
- Added v0.9.26 unit, dependency-free runtime and Chromium regressions for width migration, collapse state, image interaction and outline content parity.

## 0.9.25 - 2026-07-24

- Fixed the Text to Mind Map dialog at a viewport-safe size with independently scrollable source and processed-preview panes.
- Replaced source-text echoing with parsed hierarchy preview rows that omit Unicode and Windows Tree guide glyphs.
- Added a display-unit import-width policy: long imported labels receive 280px automatic wrapping without inserted newlines, while later user width edits clear the automatic marker and persist.
- Replaced visible Theme and Line native selects with custom anchored choice panels and unified dark toolbar, panel, hover, focus, selected and disabled colors.
- Added compact outline projection for marker icons, images and clipart without mirroring node background, border, shape or line decoration.
- Added an outline Add submenu that reuses the existing marker, clipart and image dialogs against the selected node.
- Added v0.9.25 unit, dependency-free runtime and Chromium regressions for dialog geometry, processed preview, width persistence, dark project panels and outline accessories.

## 0.9.24 - 2026-07-24

- Add the exact requested outline node context menu, including current-line clipboard semantics, sibling ordering, disclosure, subtree deletion and delete-current-only promotion.
- Add Text to Mind Map import with auto/manual recognition for Unicode trees, Windows Tree output, spaces or tabs, Markdown lists, numbered outlines and plain lines, plus mode-specific placeholders and live preview.
- Create new maps with only the center topic and make repeated Enter on an empty outline row promote one level until the root-child boundary removes it and focuses the root.
- Make cutting the current outline line copy and clear only its text while preserving the node, descendants, hierarchy and order.
- Preserve the exact canvas transform across host appearance redraws, repeat restoration on the next frame, suppress internal view persistence and defer full redraw for hidden zero-size canvases.
- Add complete dark styling for Theme and Line labels, icons, hover/open states and native option lists.
- Replace the rich-text π glyph with the shared SiYuan `iconMath` formula icon.
- Add red-first parser, menu, Enter-boundary, cut-preservation, transform-stability, dark-control and real Chromium regressions.

## 0.9.23 - 2026-07-24

- Standardize YeMind and native SiYuan menu icons on a 22px slot with 15px proportional artwork and a fixed 4px label gap.
- Add isolated light/dark Base64 SVG variants for all 14 supplied operation icons while preserving the original light-source bytes.
- Remove hard-coded light outline hover/selection fills and black disclosure symbols in favor of appearance-aware variables.
- Increase dark-mode contrast for top-toolbar hover and active controls, panels, outline rows and disclosure markers.
- Mark canvas and node context menus with the detected host appearance so detached menus select the correct icon variant.
- Add red-first offline contracts and Chromium coverage for menu alignment, all-icon dark pixel visibility, outline states and active toolbar contrast.

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
