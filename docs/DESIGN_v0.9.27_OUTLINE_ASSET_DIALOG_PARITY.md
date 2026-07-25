# YeMind v0.9.27 — outline asset editing and dialog parity

## Shared content authority

Map, outline and split views continue to project one canonical node-data tree. Marker, clipart, image, todo, note, comments, tags, links and outer-frame state are never copied into an outline-only store.

When the outline text editor is dirty, YeMind patches only the accessory container for each existing UID row. The editable rich-text host, current selection and row structure remain untouched.

## Marker rendering

Outline markers use the same fixed marker sprite and background-position contract as the picker and map canvas. Each marker is an actionable button carrying the canonical marker value. This avoids duplicate SVG pattern IDs and keeps the visual result identical across views.

## Image interaction

- One click on an outline image or clipart waits briefly, then opens the shared editor.
- A second click inside the arbitration interval cancels editing and opens the shared lightbox.
- Canvas clipart skips the ordinary image replacement toolbar and opens the clipart picker directly.
- Ordinary canvas images keep their existing resize, replace and delete interaction.

## Dialog geometry

Marker and clipart dialogs have compact fixed target widths constrained by the current viewport. Their custom title bars are bold and vertically centered, include an explicit close button and can be dismissed through the backdrop. When opened from an asset, the dialog is placed beside the anchor and clamped to the viewport without covering the clicked asset where space allows.

## Note close semantics

The note dialog treats Save, title-bar close and backdrop close as commit actions. Cancel remains the only explicit discard path. Read-only notes close without mutation.

## Todo geometry

Canvas todo prefix layout uses one 18 × 18 content box with a centered 17 × 17 checkbox. Outline todo uses the compact checkbox itself rather than wrapping it in a second framed status control.
