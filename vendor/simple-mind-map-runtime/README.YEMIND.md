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
