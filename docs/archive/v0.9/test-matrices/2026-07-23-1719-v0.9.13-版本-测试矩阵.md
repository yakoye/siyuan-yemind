# YeMind v0.9.13 test coverage matrix

| Reported defect | Automated regression |
|---|---|
| Marker/icon content leaves node bounds | `v0913MarkerImageRegression.suite.ts` verifies pattern-clipped marker SVG geometry |
| Image tools/preview interaction | Same suite verifies hover ownership, magnifier event and translucent blurred backdrop |
| Selected relation becomes thick black | `v0913RelationSelection.suite.ts` verifies active color and width |
| Toolbar hover, Structure outside-close, panel density | `v0913PanelInteraction.suite.ts` |
| About placement | `v0913AboutEntry.suite.ts` |
| New-map labels | `v0913DefaultMapNaming.suite.ts` |
| Multi-selection lost on right-click | `v0913ContextMenuSelection.suite.ts` |
| Text nodes collapse to empty pills | `v0913MeasurementHost.suite.ts` |

The test architecture remains 15 domain entry files. Scenario modules are controlled by `tests/suite-manifest.json`.
