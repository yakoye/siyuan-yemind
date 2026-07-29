# YeMind v0.9.11 test coverage matrix

| Area | Permanent automated coverage |
|---|---|
| Selection timing | Pointer selection hides the toolbar until mouseup; completed ranges reveal it |
| Range restoration | Font and size controls restore the saved rich-text range before formatting |
| Mixed/default values | Inherited fonts and sizes resolve to visible default/automatic labels |
| Image pinning | Single click pins tools, outside click unpins and double click opens preview |
| Image drag isolation | Preview, delete and resize controls do not start node movement |
| Single-node menu | Exact item order, shortcuts, separators and dynamic outer-frame label |
| Multi-node menu | Batch style, summary, relation, expansion, clipboard and deletion surface |
| Blank menu | Combined expand/collapse-all action |
| Inline links | Node link and selected-text inline link remain distinct; inline link follows Formula |
| Style panels | Same dimensions, trigger anchoring, viewport clamping and toggle/close behavior |
| Relation controls | Native adjustment option, two control handles, tangent helpers and auto marker orientation |
| Relation lifecycle | Delayed overlap probes and repeated cancellation after completion are harmless |
| Relation persistence | Endpoint and target-control-offset fields remain in serialized relation data |
| Quick-action geometry | First action circle touches the rendered node border without shrinking its hit target |
| Historical regression | Themes, outline, drag, guides, images, persistence and canvas-outline navigation |
