# YeMind v0.9.30 Design

## 1. Branch quick controls

The `+ / - / direct-child count` control is attached to the current node's outgoing child connector. Runtime placement first measures rendered child nodes and resolves the dominant left/right/top/bottom direction. When descendants are collapsed or not measurable, the last measured direction is retained for that UID, then the official layout-growth contract is used as fallback.

This gives the following stable rules:

- right logical structure: right connector;
- left logical structure: left connector;
- bilateral mind map: each branch uses its own side;
- tree, timeline, organization and fishbone layouts: actual rendered child direction wins over a generic layout name.

The displayed number is the direct child count only. `-` recursively collapses the subtree; the number reopens the selected node one level only.

## 2. Expansion scopes

Expansion is intentionally split into three scopes:

- quick control: recursive collapse, one-level expansion;
- node context menu: fully expand or fully collapse the selected subtree;
- blank-canvas context menu: fully expand or fully collapse the complete map.

Each command creates one tree transaction and preserves node UIDs and content.

## 3. Three-edge toolbar visibility

One persisted `toolbarsPinned` setting controls the top, bottom and left toolbars.

- default `true`: all three are visible and the vertical pin is shown;
- `false`: the diagonal pin is the selected auto-hide state;
- top, bottom and left edge hot zones reveal their corresponding bar;
- toolbar hover or keyboard focus postpones hiding;
- switching to auto-hide blurs the clicked pin so pointer activation does not permanently hold the toolbar open.

The read-only button uses separate open-lock and closed-lock SVGs while retaining the existing read-only behavior.

## 4. Resource action popover

Canvas and outline marker/clipart clicks use one transient `ResourceActionPopover`:

- Replace opens the existing marker or clipart picker;
- Delete targets the exact node UID and resource;
- the popover selects an above/below/left/right viewport-safe position;
- outside pointer, Escape and view changes close it;
- no popover state is persisted in map data.

## 5. Canvas text-to-map entry

The single-node canvas context menu places `文本转导图…` immediately before `添加`. It invokes the same text-to-map dialog and atomic tree transaction used by the outline entry point.
