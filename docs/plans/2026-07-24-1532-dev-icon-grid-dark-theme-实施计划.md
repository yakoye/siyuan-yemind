# Superpowers plan — YeMind v0.9.23 icon grid and dark theme

## Red

1. Add an offline contract requiring a 22px slot, 15px artwork, light/dark source pairs and theme-aware outline variables.
2. Add a Chromium regression requiring aligned native/custom menu labels, all-icon dark visibility, dark outline states and active toolbar contrast.
3. Run both against v0.9.22 and retain the expected failures:
   - missing `suppliedIconNames` / fixed icon slot contract;
   - timeout waiting for `.ymz-icon-slot` in the existing toolbar.

## Green

1. Wrap supplied and custom project/menu artwork in a shared icon slot.
2. Preserve exact light Base64 URIs and create deterministic dark image URIs.
3. Normalize native SiYuan menu SVG boxes to the same geometry.
4. Replace fixed outline colors with appearance variables.
5. Add dark toolbar, panel and detached-menu appearance handling.

## Refactor and verify

1. Keep image-document isolation so host SVG rules cannot enter supplied artwork.
2. Reuse one geometry contract across toolbar, first-level menus and submenus.
3. Run offline, syntax, structure, hostile CSS and real Chromium tests.
4. Build, package, extract, verify archive contents and rerun the release tests from the extracted package.
