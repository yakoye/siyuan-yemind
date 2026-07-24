# YeMind v0.9.25 — import preview, dark project controls and outline content

## 1. Text-to-map dialog

The dialog is viewport-bounded instead of content-sized:

- width: `min(980px, calc(100vw - 48px))`;
- height: `min(700px, calc(100vh - 64px))`;
- source and preview panes own independent scroll containers;
- the shell and body use `min-height: 0` so large input cannot grow the dialog beyond the screen.

The preview is generated from parsed `{ depth, text }` records. It does not echo the source string, so Unicode tree guides, Windows Tree prefixes and indentation syntax are absent from the visible result. Each preview row uses its parsed depth only for visual indentation.

## 2. Imported-label width policy

Text is never split by inserting newlines. The importer estimates display units:

- CJK and full-width characters: `1` unit;
- ASCII and other narrow characters: `0.5` unit;
- normalized spaces: `0.25` unit.

A new imported label exceeding `20` units receives:

```text
width: 280
customTextWidth: 280
yemindImportedAutoWidth: true
```

Short labels receive no forced width. If the user later changes node width, the normal node-style command persists the new `width`/`customTextWidth` and sets `yemindImportedAutoWidth: false`; subsequent saves and reloads therefore preserve the user's value.

For “replace current node,” an existing current-node width has priority over the imported automatic width.

## 3. Theme and Line selection panels

Visible native Theme/Line selects are replaced by `ProjectChoicePanel` instances. Hidden selects remain only as state mirrors for compatibility.

Each panel:

- is anchored to its toolbar button;
- groups options and shows the current selection;
- closes on outside click or explicit close;
- follows read-only state;
- uses the same light/dark hover, focus, selected and disabled palette as Structure and Style.

Detached/custom panels carry their own surface variables and do not depend on the native operating-system option popup, preventing white option blocks in dark mode.

## 4. Outline accessories

The structured outline derives presentation-only accessory data from existing node content:

- `icon` values become compact marker/icon badges;
- `image` becomes a bounded thumbnail;
- `yemindClipartId` identifies clipart-backed image content.

Accessory markup is `contenteditable="false"` and placed before the editable node text. It is updated whenever the corresponding outline row is patched from map data.

The outline “添加” submenu reuses the existing canvas marker picker, clipart picker and image dialog after activating the target UID. Both surfaces therefore mutate the same node data through the same command layer.

## 5. Content-only boundary

The outline synchronizes semantic node content, not canvas decoration. It deliberately does not project:

- node fill/background;
- border color/width;
- node shape;
- connection or branch line styling;
- free canvas geometry.

This keeps outline rows compact and structurally readable while maintaining bidirectional content consistency.
