# YeMind v0.7.0 Verification Report

Date: 2026-07-21

## Scope

v0.7.0 adds Settings → About, release identity consistency checks, semantic-versioning documentation, structured diagnostics schema v3, and end-to-end global-search diagnostic tracing.

## Source workspace verification

```text
Test files: 150 passed
Tests: 407 passed
TypeScript: passed
Production build: passed
Vite modules: 899
Built index.js syntax: passed
```

Commands:

```bash
npm test
npm run check
npm run build
node --check index.js
```

## Extracted release verification

A source archive was created without `node_modules/`, `dist/`, `.git/` or nested ZIP files, then fully extracted into a clean directory.

```text
ZIP CRC: passed
npm ci: passed
Extracted tests: 150 files / 407 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted Vite modules: 899
Extracted index.js syntax: passed
```

## Release identity gate

The automated release gate verifies that all of these report `0.7.0`:

- `package.json`
- `package-lock.json`
- root package entry in `package-lock.json`
- `plugin.json`
- runtime `PLUGIN_VERSION`
- `RELEASE_INFO.version`
- `RELEASE_INFO.buildVersion`
- README current version
- CHANGELOG release heading

The About page additionally compares the installed manifest, runtime code and build versions at runtime.

## Diagnostics validation

The diagnostics archive contains:

```text
summary.md
environment.json
version-consistency.json
event-timeline.jsonl
search-state.json
active-map-state.json
regression-results.json
errors.json
diagnostic-marker.json
dom-structure-snapshot.html
diagnostics.json
settings.json
README.txt
```

Privacy checks confirm that the default archive excludes map titles and node text. The DOM structure snapshot records element structure, classes, IDs, safe state attributes and visibility only; input values and result/preview text are omitted, and map/node identifiers are redacted.

When no real global-search session has been recorded, the self-check returns a warning instead of incorrectly reporting that search navigation passed. After the user records and reproduces the issue, it checks result/preview mounting and the latest navigation success/failure state.

## Global-search event chain

Permanent tests cover the diagnostic sequence for:

```text
query-change
result-counts
list-mounted
preview-mounted
result-selected
enter-captured
close-request
search-closed / search-close-fallback
open-request
map-tab-found-existing / map-tab-created
map-editor-ready
target-node-found
target-ancestors-expanded
target-node-selected
target-node-centered
target-node-highlighted / target-navigation-failed
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The advisories are in the existing Quill / `simple-mind-map` / UUID dependency chain. No dependency was added or upgraded for v0.7.0. Automatic remediation requires a breaking or incompatible dependency change and was not applied in this release.

## Environment limitation

The build environment cannot launch the real Windows SiYuan 3.7.2 desktop client. About rendering, real search-window DOM timing, search closing, tab activation and final node highlighting still require desktop acceptance. The new diagnostic workflow is designed to capture those exact runtime steps when the user reproduces them.
