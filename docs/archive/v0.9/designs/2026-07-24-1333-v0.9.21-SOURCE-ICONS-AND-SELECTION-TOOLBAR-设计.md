# YeMind v0.9.21 design: supplied SVG adaptation and initial selection toolbar

## Supplied icon geometry

The artwork in `图标-svg.txt` is treated as the authoritative geometry. YeMind does not reinterpret or redraw the paths. Each source SVG is embedded inside a common presentation shell:

- outer `viewBox="0 0 20 20"`;
- centered inner viewport at `x=1`, `y=1`, `width=18`, `height=18`;
- original source `viewBox` and `preserveAspectRatio="xMidYMid meet"`;
- one aligned toolbar/menu slot;
- namespaced masks and clip paths for repeated inline instances.

Fixed dark strokes and fills are converted to `currentColor`. White mask geometry remains white because it defines luminance rather than visible artwork. Dashed guides, source opacity and relationship semantics are preserved.

## Double-click selection toolbar

Entering rich-text edit mode programmatically selects the complete node text with Quill's silent source. Silent selection does not emit Quill's normal `selection-change` event, so YeMind now publishes the equivalent normalized rich-text selection payload on the next animation frame. The shared toolbar then uses the real Quill bounds and current format state for placement.

Newly inserted nodes retain the previous behavior and do not open the formatting toolbar immediately.
