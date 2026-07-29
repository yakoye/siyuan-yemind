# YeMind v0.9.0 verification

Date: 2026-07-21  
Host acceptance baseline: SiYuan 3.7.3

## Scope

- node-image trash control and confirmation;
- node-image magnifier and editor-local lightbox;
- wheel zoom, 1:1 reset, outside-click, close-button and Escape dismissal;
- note/comment hover badges without native title overlays;
- ten named rainbow palettes;
- three base themes plus ten complete color-scheme themes;
- palette/background persistence and checkpoint restore;
- all existing editing, outline, drag, search, storage and diagnostic regressions.

## Source validation

```text
Test domain entries: 15 passed
Scenario modules: 160
Tests: 458 passed
TypeScript: passed
Production build: passed
Vite modules: 906
Built index.js syntax: passed
```

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The reported issues are in the existing Quill and UUID dependency chain. Automatic remediation requires forced breaking dependency changes, so this release does not apply `npm audit fix --force`.

## Release contract

```text
plugin.json.name: siyuan-yemind
plugin.json.version: 0.9.0
plugin.json.minAppVersion: 3.7.3
package.json.name: siyuan-yemind
package.json.version: 0.9.0
runtime version: 0.9.0
```

The release archive must be flat and must not contain `node_modules`, `dist`, `.git`, `maps.json`, `settings.json`, `checkpoints.json` or nested ZIP files.
