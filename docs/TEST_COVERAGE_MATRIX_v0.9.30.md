# YeMind v0.9.30 Test Coverage Matrix

| Contract | Unit/source suite | Offline smoke | Chromium smoke |
|---|---|---|---|
| Right/left/bilateral quick-control side | `v0930BranchControlPlacement` | `branchControlsToolbarResourcesV0930SmokeEntry` | `smoke-v0930-branch-controls-toolbar-resources.py` |
| Rendered child geometry overrides generic fallback | `v0930BranchControlPlacement` | — | v0.9.30 multi-layout run |
| Direct-child count and one-level quick expansion | `v0930ExpansionScopes` | v0.9.30 smoke | v0.9.29/v0.9.30 quick-action runs |
| Full subtree expand/collapse | `v0930ExpansionScopes` | v0.9.30 smoke | node menu labels/actions |
| Full-map expand/collapse | `v0930ExpansionScopes` | v0.9.30 smoke | canvas menu labels/actions |
| Text-to-map before Add | `v0930ContextMenuContracts` | v0.9.30 smoke | node context menu + dialog |
| Pinned default and three toolbar states | `v0930ToolbarStateIcons` | v0.9.30 smoke | v0.9.29/v0.9.30 toolbar runs |
| Vertical/diagonal pin and open/closed lock | `v0930ToolbarStateIcons` | v0.9.30 smoke | v0.9.30 icon assertions |
| Marker/clipart Replace/Delete popover | `v0930ResourceActionPopover` | v0.9.30 smoke | outline marker and clipart flow |
| UID-targeted resource deletion | source adapter + Chromium | — | repository persistence check |
| Existing asset/dialog behavior | historical suites | all offline entries | v0.9.27 regression |
| Existing relation/zoom/title behavior | historical suites | v0.9.29 smoke | v0.9.29 regression |
