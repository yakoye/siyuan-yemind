# YeMind v0.9.9 outline guide geometry

## Problem

The structured outline previously painted indent-rainbow guides from a fixed left origin that did not account for the full drag gutter and marker column. The first guide therefore appeared to the left of the Root marker, and every deeper guide was shifted one level to the left.

## Unified geometry

The outline now owns one shared set of CSS geometry variables:

- row start: `6px`
- depth step: `22px`
- drag gutter: `22px`
- marker column: `16px`
- marker-column half: `8px`
- depth-step half: `11px`

The center of a marker at depth `d` is:

```text
rowStart + d × indent + dragWidth + branchHalf
```

The first guide is exactly halfway between the Root marker and the depth-1 marker:

```text
guideStart = rowStart + dragWidth + branchHalf + indentHalf
```

Guide `n` is then:

```text
guideStart + n × indent
```

## Rendering rules

- Root rows render no guide.
- A depth-1 row renders exactly one guide.
- A depth-2 row renders two guides, and so on.
- Guides cycle through four existing indent-rainbow colors every four levels.
- Guide rows remain non-interactive and cannot reduce the drag hit area.
- The deepest guide remains inside the complete indent-cell drag gutter.
- Hover, active/editing state, expansion and drag feedback must not change guide coordinates.
- Drop-indicator indentation uses the same row-start, depth and drag-width variables.

## Compatibility

This release changes only outline presentation geometry. It does not change node UIDs, tree data, selection, clipboard, drag commands, themes, storage schemas or canvas rendering.
