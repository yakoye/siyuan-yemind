# YeMind vendored simple-mind-map runtime

This directory pins `simple-mind-map@0.14.0-fix.3` together with the runtime
patches used by the verified YeMind v0.9.31 bundle. The previous lockfile
referenced this directory without committing it, so a clean clone could not
install or reproduce the plugin.

The patched sources were recovered from the `sourcesContent` embedded in the
installed plugin's `index.js.map`. To audit or reconstruct them from a verified
runtime bundle, use:

```text
node scripts/restore-vendored-runtime.mjs <index.js.map> <npm-package-directory> vendor/simple-mind-map-runtime
```

Upstream project: `simple-mind-map`, version `0.14.0-fix.3`, MIT license.

## YeMind patch inventory

`UPSTREAM_BASELINE.json` is an allowlist, not permission to modify the whole
runtime. Every file outside `allowedModifiedFiles` must remain byte-equivalent
to the pinned upstream revision.

- `src/core/command/KeyCommand.js`: existing YeMind keyboard integration.
- `src/core/render/Render.js`: `onNodeTextEditChange` skips the tree relayout
  when the fresh measurement did not change the node box (most ticks of a
  typing burst), and refreshes `nodeDataSnapshot` when it did, so the next
  render does not rebuild the node's text from the stale stored text and throw
  the live measurement away.
- `src/core/render/Render.js` and `src/core/render/node/MindMapNode.js`: defer
  opening an inserted node editor until the completed tree layout has committed
  its final SVG transforms, so Tab, Enter and quick-add never expose a blank or
  misplaced first frame.
- `src/core/render/node/nodeCreateContents.js` and `src/plugins/RichText.js`:
  `textAutoWrapWidth` may also be a function of the node, so an auto-wrap limit
  stated in characters stays correct across node levels with different font
  sizes. A number keeps behaving exactly as upstream. The static measurement
  and the live editor share one resolver so they wrap at the same boundary.
- `src/utils/index.js` and `src/core/render/node/nodeCreateContents.js`: node
  text measurement no longer depends on which node was measured before it. An
  unresolvable font size used to be concatenated into the string
  `'undefinedpx'`, which the CSSOM rejects, so the shared measurement element
  kept the previously measured node's font size while the freshly created
  foreignObject inherited the stylesheet's. `getNodeRichTextStyles` now omits
  unusable values, and `createRichTextNode` resets the supported style set on
  the shared element before applying the current node's.
- `src/core/render/node/nodeModifyWidth.js`: preserves one painted text shell
  while the user resizes a node instead of replacing visible text every frame.
- `src/plugins/RichText.js`: keeps the editor opaque until committed SVG layout,
  normalizes geometry on every completed edit, and focuses Quill with
  `preventScroll` plus a silent selection.

The two text lifecycle patches are backed by
`tests/e2e/yemind-upstream-lifecycle.spec.ts` and
`tests/e2e/web-rich-text-outline.spec.ts`. They were introduced from the
2026-08-02 SiYuan traces `Trace-20260802T171111.json.gz` and
`Trace-20260802T171727.json.gz`, plus the 2026-08-03 insertion traces
`Trace-20260803T164449-abc.json.gz`, `Trace-20260803T164540-enter.json.gz` and
`Trace-20260803T164842-enter-type.json.gz`. Extending this list requires a new
failing regression test and trace or equivalent runtime evidence.
