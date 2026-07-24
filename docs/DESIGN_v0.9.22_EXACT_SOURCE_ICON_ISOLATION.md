# YeMind v0.9.22 design: exact source icon isolation

## Problem

The v0.9.21 adapter decoded the supplied SVG data URI and inserted its geometry as an inline `<svg>` tree. Several stroke-only source paths depended on the root `fill="none"`. In SiYuan, themes or user snippets can apply broad rules such as `svg path { fill: ... !important; }`, so the host cascade could fill those paths and turn the intended line artwork into solid black shapes.

A standalone browser preview did not show the defect because the supplied SVG was rendered as its own image document without the SiYuan host stylesheet.

## Authoritative artwork

`图标-svg.txt` remains the authoritative source. YeMind v0.9.22 stores the complete Base64 SVG data URI byte-for-byte for all 14 supplied operation icons:

- search, project style, undo, redo and fullscreen;
- insert upper, same-level and lower node;
- node style, relation, outer frame, summary, marker and clipart.

No path, mask, dash pattern, opacity, source color, viewport or aspect-ratio instruction is rewritten.

## Isolation boundary

Each supplied icon is rendered as an image element:

```html
<img
  class="ymz-operation-icon ymz-icon-…"
  src="data:image/svg+xml;base64,…"
  alt=""
  aria-hidden="true"
  draggable="false"
>
```

An `<img>` creates a separate image-document boundary. Host selectors can style the outer 18×18 element, but they cannot enter the embedded SVG and override its `<path>`, `<mask>` or `<clipPath>` rules.

YeMind CSS therefore controls only sizing, alignment, object fitting, pointer behavior and drag behavior. It does not recolor the supplied artwork.

## Regression contract

The release locks the design through:

- SHA-256 checks for every complete data URI;
- assertions that supplied icons are `<img>` elements with no nested inline geometry;
- an offline smoke independent of npm-installed test packages;
- Chromium coverage with deliberately hostile `svg`, `svg *` and `svg path` rules;
- the retained double-click rich-text selection toolbar regression.
