# YeMind v0.9.8 product boundaries

v0.9.8 changes only right-growing `logicalStructure` drag-preview edge rendering and the visual chrome of the canvas rich-text editor. It does not change target resolution, final structural commands, map/settings/checkpoint schemas, outline behavior, themes, image tools or other layout adapters.

The dragged subtree root incoming edge remains represented by the continuous green dashed candidate-parent guide. Unaffected solid edges remain visible. Only incoming edges whose child endpoint moves during room-making are temporarily replaced by non-persisted overlays and restored when the preview ends.

Canvas text editing keeps the node's existing theme/selection shell and removes only additional Quill/contenteditable/browser borders, outlines and shadows. The caret and native text selection remain visible and editing commands are unchanged.
