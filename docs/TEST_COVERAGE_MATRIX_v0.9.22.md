# YeMind v0.9.22 test coverage matrix

| Area | Coverage |
| --- | --- |
| TDD defect lock | v0.9.21 inline SVG fails the new image-boundary assertion before implementation |
| Exact source preservation | Complete Base64 data URI SHA-256 checked for all 14 supplied icons |
| DOM isolation | Every supplied icon is an `<img>` with no nested `<svg>`, `<path>` or `currentColor` rewrite |
| Accessibility and interaction | Empty `alt`, `aria-hidden="true"`, `draggable="false"`, pointer isolation |
| Layout | Consistent 18×18 outer box and menu/toolbar alignment |
| Host CSS resistance | Chromium injects `!important` black fill/stroke rules against all host SVG descendants |
| Toolbar actions | Search, project style, undo and redo load exact supplied image resources |
| Node menu actions | Upper/same/lower insertion, node style, relation, outer frame, marker and clipart remain isolated |
| Rich-text editing | Double-click still selects full node text and opens the shared formatting toolbar |
| Source/package consistency | Generated `index.js`, copied `index.css`, source checks and extracted-package reruns |
| Regression | Existing structure, assets, dialogs, image editing, drag, outline and selection smoke coverage retained |
