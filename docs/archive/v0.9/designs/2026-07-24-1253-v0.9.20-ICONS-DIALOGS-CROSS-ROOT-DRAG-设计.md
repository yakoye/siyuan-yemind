# YeMind v0.9.20 design: icons, dialogs and cross-root drag

## Icons

All custom operation icons use a shared 20×20 viewport, rounded 1.5 px strokes, `currentColor`, and explicit `fill="none"` unless a small semantic dot is required.

## Asset dialogs

Marker and clipart dialogs use one fixed container. Category controls remain at the top while only the resource area scrolls. Marker items have no card background by default; clipart items keep individual white resource cards.

## Cross-root drag

The pointer side of the centre topic selects a left or right interaction frame. The target side is transformed into the proven right-logical geometry, producing distinct before, after and child candidates. On drop, the root-child branch direction is persisted before structural insertion.
