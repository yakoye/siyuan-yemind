# YeMind v0.9.11 node actions and relation editing

## Selection toolbar

Canvas and outline emit a selection candidate while the pointer is moving, but show the formatting toolbar only after pointer release or completed keyboard selection. The toolbar stores the rich-text range before focus enters native select/input controls and restores that range before formatting font, size or other attributes.

## Image interaction

A single image click activates the containing node and pins image actions. A double click opens the editor lightbox. Image action controls stop structural pointer propagation, and an outside canvas click clears the pinned image state.

## Context menus

Single-node, multi-node and blank-canvas contexts own separate ordered menus. Single-node outer-frame wording is derived from persisted outer-frame group membership. Node hyperlinks and rich-text inline links are separate commands; inline links require a text range and appear after Formula.

## Style panels

Project and node styles use the same 400px by up-to-440px anchored surface. Project style is anchored below the toolbar button; node style is anchored near the invoking context-menu point. Click outside, Escape or repeated trigger closes the active surface.

## Association lines

YeMind retains the upstream cubic Bézier model with two editable control points and tangent helper lines. Arrow orientation follows the terminal tangent through `auto-start-reverse`. Endpoint ratios and control offsets remain in native persisted relation data. A lifecycle guard prevents a throttled target probe from dereferencing a cleared creation source after completion or cancellation.

## Quick actions

The quick-action container starts at the node edge. Multiple actions keep internal spacing, but no external gap remains between the first circular control and node border.
