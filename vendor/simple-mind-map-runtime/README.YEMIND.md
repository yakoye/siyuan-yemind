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
- `src/core/render/Render.js` and `src/core/render/node/MindMapNode.js`: defer
  opening an inserted node editor until the completed tree layout has committed
  its final SVG transforms, so Tab, Enter and quick-add never expose a blank or
  misplaced first frame.
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
