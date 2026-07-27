# YeMind v0.9.31 Theme palette dropdown design

## Scope

This release changes only the visual presentation of the existing Theme dropdown. It does not add, remove, rename or recolor themes and does not change theme application, persistence or redraw behavior.

## Presentation

- Existing groups are rendered as tabs.
- Existing themes are rendered in a two-column card grid.
- Each card contains the existing theme name and exactly six first-level branch background colors.
- The selected theme card and its group tab are highlighted.
- Host light/dark appearance changes panel chrome only; preview colors remain literal theme colors.
- The shared Line Style dropdown retains the pre-existing list renderer.

## Data ownership

`themePaletteColors()` reads `preset.light.colorAppearance.branches[0..5].level1Background`. It returns a new array and never mutates preset definitions. Existing theme IDs, aliases, groups and settings remain authoritative.
