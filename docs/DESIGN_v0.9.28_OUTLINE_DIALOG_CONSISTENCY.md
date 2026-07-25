# YeMind v0.9.28 — outline and dialog consistency

## Outline accessory geometry

Outline marker buttons are fixed 20 × 20 interaction slots. The 28 × 28 marker sprite is scaled mathematically into an 18 × 18 background viewport, including both sprite size and background position. No transformed oversized child is clipped inside the button.

Note and comment indicators use the same SiYuan symbol IDs as the node context menu. Their presence is communicated by an icon and accessible label; comment count remains available to hover preview and assistive text but is not rendered as a leading number.

## Preview arbitration

Single-click image editing waits for the system-compatible double-click interval used by YeMind. Double-click cancels the pending edit before opening the shared lightbox. Hover previews become visible only after a layout frame, then use ResizeObserver and image-load hooks to recompute placement when content dimensions settle.

## Clipart direct manipulation

Clipart is still editable through its picker, but it is first selected by the image adjustment plugin. The selected frame exposes eight resize handles and the top-right delete button. Clipart hides the ordinary replace/delete text toolbar because replacement is handled by the picker.

## Anchored dialogs

Asset dialogs evaluate eight directions around the anchor. Candidate rectangles are viewport-clamped and scored by overflow, anchor overlap and displacement. A non-overlapping in-viewport candidate wins whenever one exists.

## Dialog chrome

Every YeMind Dialog root receives a shared host class. Native and custom headers use a 46px row, bold title and centered 30px close button. Action rows align to the right; leading destructive actions remain in the same right-aligned group instead of switching sides between dialogs.
