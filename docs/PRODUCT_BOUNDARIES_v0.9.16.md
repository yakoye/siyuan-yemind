# YeMind v0.9.16 product boundaries

- Image selection is separate from node selection but always keeps the containing node active.
- Delete and Backspace remove the selected image only; they do not remove the node.
- Side handles permit intentional distortion unless Shift is held. Corner handles never distort the current ratio.
- Replacement uses the existing local/file image workflow and does not introduce cloud upload or remote image management.
- The floating toolbar contains Replace and Delete only. Image placement and other node styling remain in their existing interfaces.
- Double-clicking an image opens preview; double-clicking text enters text editing and selects all text.
- New clipart uses a 48px longest edge. Existing user-resized image dimensions are not normalized automatically.
- Release archives continue to exclude `assets/`, `node_modules`, user map data and generated production source maps. The checked-in `docs/build-input/v0.9.0-index.js.map` remains because the offline reproducible builder consumes it as source input.
- Host baseline remains SiYuan 3.7.3.
