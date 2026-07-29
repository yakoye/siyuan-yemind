# YeMind v0.9.11 product boundaries

v0.9.11 unifies node-oriented interaction surfaces without changing map, settings or checkpoint schemas.

The release changes rich-text selection timing and range restoration, image selection/preview behavior, context-menu organization, style-panel anchoring, quick-action geometry and association-line editing. Association-line endpoint/control values continue to use the native `associativeLinePoint` and `associativeLineTargetControlOffsets` fields already understood by the underlying map format.

The release does not change theme data, outline hierarchy semantics, right-logical drag targeting, persistence locations, checkpoint format or map identity. Existing maps open without migration; relation lines without manual control data continue to use automatic curves.
