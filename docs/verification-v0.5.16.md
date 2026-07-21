# YeMind v0.5.16 Verification Report

Date: 2026-07-18

## Scope

This release completes the eight approved interaction changes: no node three-dot menu, no comment count on nodes, simplified color palettes with HEX/RGB values, text-only outline deletion keys, separate canvas/node context menus, a compact zen-exit capsule, node image paste/drop, and upstream proportional image resizing.

The release does not change map/checkpoint schemas, the upstream structural history owner, the plugin ID, or the image data model.

## Superpowers workflow evidence

- official source and upstream runtime researched before implementation;
- design recorded in `docs/superpowers/specs/2026-07-18-v0.5.16-interaction-parity-design.md`;
- executable plan recorded in `docs/superpowers/plans/2026-07-18-v0.5.16-interaction-parity.md`;
- new behavior first expressed as failing regressions;
- implementation completed only after focused RED/GREEN runs;
- full verification rerun after version and documentation updates.

## Focused automated coverage

- node postfix contains only the count-free comment icon;
- no node menu setting, event or button remains;
- palette has 52 swatches, Reset Default, native custom color and live HEX/RGB values, with no EyeDropper entry;
- empty outline Backspace/Delete resolves to no structural action;
- canvas menu and node menu have distinct classes and action scopes;
- long node menu has maximum height and a narrow scrollbar;
- zen exit button has collapsed and expanded presentation states;
- image files are detected from clipboard and drag data, including dragover MIME-only data;
- transformed client coordinates resolve the target normal/generalization node;
- image natural dimensions are written through existing commands;
- upstream `NodeImgAdjust` remains registered and uses ratio-preserving resize.

## Verification commands

```text
npm test
npm run check
npm run build
node --check index.js
npm audit --json
```

## Results

```text
Test files: 98 passed
Tests: 252 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 880
Built index.js syntax: passed
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing dependency chain. No bottom-layer dependency was force-upgraded for this interaction release.

## Data and runtime boundaries

- Plugin ID: `siyuan-yemind-zen`.
- Display name: `YeMind`.
- Version: `0.5.16`.
- Map, checkpoint and settings file names are unchanged.
- Legacy `showNodeMenuButton` settings are ignored as unknown input.
- Image input writes the existing upstream node image fields.
- Image resizing remains upstream-owned by `NodeImgAdjust`.
- Canvas/node structure, history, layout and persistence remain upstream-owned.

## Package verification gates

The release archive excludes `node_modules/`, temporary `dist/` and `.git/`, while retaining complete TypeScript source, tests, Superpowers skills, architecture, design, plan, parity, changelog and verification documentation. The final archive is checked with `unzip -t`, fully extracted, and the extracted `index.js` is checked again with Node.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. The following require real desktop acceptance:

1. Right-click blank canvas and verify menu position/actions.
2. Right-click nodes and verify the long menu scrolls without becoming overly wide.
3. Verify the zen capsule expands on mouse hover and keyboard focus, then exits.
4. In split/full outline, verify Backspace/Delete never removes an empty node.
5. Paste local PNG/JPEG/WebP images onto selected nodes.
6. Drag local images onto nodes at different pan/zoom levels.
7. Resize inserted images and confirm width/height remain proportional.
8. Recheck Chinese IME, undo/redo, save/reopen and checkpoints.
