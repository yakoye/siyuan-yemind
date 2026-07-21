# YeMind Zen v0.5.15 Rich-text parity design

Date: 2026-07-18

## Problem

YeMind editor chrome and rich-text overlays could escape above SiYuan Settings. The upstream node editor could inherit an invisible text color. Canvas editing forced whole-label selection, outline rows downgraded rich HTML to plain text, and text/background controls used separate reset buttons instead of one coherent palette.

## Official source findings

KMind Zen keeps formatting selection-driven, reuses a persistent editor transaction, restores selection after changes and scopes editor overlays to the editor surface. Its private document model cannot be embedded without duplicating YeMind's map, history and persistence kernels.

## Scheme C adaptation

- Scope every editor overlay to `.ymz-editor` and isolate that root's stacking context.
- Keep upstream canvas RichText and expose it through a small `RichTextFormattingTarget` interface.
- Preserve partial selection by disabling automatic whole-label selection.
- Use one active Quill instance for the currently edited outline row; render inactive rows as sanitized rich HTML.
- Reuse one target-aware toolbar across canvas, split outline and full outline.
- Commit outline HTML with upstream `SET_NODE_TEXT` rich-text mode.
- Provide a user-requested color palette with reset, custom color and EyeDropper fallback.

## Non-goals

- No KMind private document kernel, history or persistence.
- No one-Quill-per-outline-node implementation.
- No host-global fixed overlay.
- No second map data format.
