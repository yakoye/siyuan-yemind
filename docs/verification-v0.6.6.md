# YeMind Zen v0.6.6 Verification

Date: 2026-07-20

## Source workspace verification

```text
Test files: 144 passed
Tests: 382 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 897
Built index.js syntax: passed
```

## Focused regression coverage

- Compact density is exactly horizontal 30 / vertical 2.
- Default inherits the v0.6.5 compact values.
- Comfortable inherits the v0.6.5 default values.
- Whole-map Style is 220px wide and contains no density subtitles.
- Custom horizontal/vertical inputs remain within the panel.
- Outside-click dismissal remains active.
- Global search opens on primary mousedown, retains click and Enter fallback, and suppresses the duplicate click.
- Pending node focus remains queued until the target map editor is ready.
- Fit View uses the four-corner focus SVG.
- All historical outline, folding, editing, right-drag, rich-text, notes, comments, images, summaries and style regressions remain in the release gate.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

No dependency was added, removed or force-upgraded for this release.

## Manual desktop acceptance still required

The current environment cannot run the user's Windows SiYuan 3.7.2 desktop application. Verify after installation:

1. Compare Compact, Default and Comfortable on several layouts.
2. Confirm the 220px Style panel is readable at normal and narrow tab widths.
3. Click a YeMind result in SiYuan global search and confirm the corresponding map tab opens; node focus is an enhancement after map opening.
4. Confirm the new Fit View icon remains clear in light and dark themes.
