# YeMind Zen v0.5.21 Verification Report

Date: 2026-07-20

## Release scope

v0.5.21 fixes Root and ordinary-branch collapse/expand consistency and updates node quick-action visibility:

- editor startup no longer rewrites persisted Root `expand: false` to `true`;
- outline flattening honors Root `expand` instead of forcing depth zero open;
- Root rows render the same repeatable disclosure control as ordinary branches;
- collapsed count pills are explicit expand controls for Root and ordinary branches;
- expanded unselected nodes show no `+ / −` controls;
- selected leaves show `+`;
- selected expanded branches, including Root, show `− / +`;
- collapsed branches show only the hidden-descendant count;
- `+` and `−` share the previous compact minus-button dimensions and typography.

## Root cause

The previous release had three conflicting policies:

1. startup migrated Root `expand=false` back to `true`;
2. outline flattening always treated Root as expanded;
3. Root outline rows did not render disclosure controls.

Together these policies overwrote a valid Root collapse and made the Root impossible to reopen consistently from split/full-outline views.

## Automated verification

```text
Test files: 119 passed
Tests: 315 passed
TypeScript: passed
Production build: passed
Vite modules transformed: 889
Built index.js syntax: passed
ZIP CRC/integrity: passed
Complete extraction: passed
Extracted npm ci: passed
Extracted tests: 119 files / 315 tests passed
Extracted TypeScript: passed
Extracted production build: passed
Extracted index.js syntax: passed
```

Focused regression coverage includes:

- persisted Root `expand=false` survives editor startup;
- collapsed Root hides descendants in outline flattening;
- Root disclosure can repeatedly collapse and expand without replacing the row;
- collapsed Root count click routes to `onSetExpanded('root', true)`;
- command adapter accepts Root for native `SET_NODE_EXPAND` while retaining Root deletion protection;
- unselected/selected/leaf/branch/collapsed quick-action display matrix;
- `+` and `−` compact visual contract.

## Dependency audit

```text
low: 1
moderate: 2
high: 0
critical: 0
```

The findings remain in the existing Quill/simple-mind-map/uuid dependency chain. `npm audit fix --force` proposes breaking or regressive dependency replacements, so no forced dependency change was made in this focused interaction repair.

## Package information

```text
Plugin ID: siyuan-yemind-zen
Display name: YeMind Zen
Package version: 0.5.21
Plugin version: 0.5.21
Runtime version: 0.5.21
```

The archive excludes `node_modules/`, temporary `dist/`, `.git/` and nested ZIP files while retaining complete TypeScript source, tests, Superpowers design/plan documents, architecture, changelog, migration status and verification documentation.

## Remaining manual verification

The current environment cannot launch the user's Windows SiYuan 3.7.2 desktop UI. Real desktop acceptance should verify:

1. select Root, click `−`, confirm only the hidden count remains;
2. click the Root count and confirm all first-level branches return;
3. repeat Root collapse/expand from map, split and full-outline views;
4. collapse an ordinary branch and reopen it from both its outline triangle and map count pill;
5. confirm unselected expanded nodes show no quick buttons;
6. confirm selected leaves show only `+`, while selected expanded branches show equal-size `− / +`;
7. close and reopen the map and confirm Root/branch collapse state persists.
