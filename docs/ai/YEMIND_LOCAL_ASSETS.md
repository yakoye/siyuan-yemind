# YeMind Fixed Local Assets

YeMind keeps its large visual resources permanently under the plugin project and AI development packages should normally reference them rather than bundle them again.

## Current fixed structure

```text
siyuan-yemind/
├─ assets/
│  ├─ clipart/                 # 764 SVG files, 13 categories
│  ├─ icons/
│  │  └─ marker-sprite.png     # 126 marker icons
│  └─ layout-thumbnails/       # 28 SVG thumbnails
│     └─ layout-catalog.json
├─ yemind-icon-32.png
├─ yemind-icon-64.png
└─ yemind-icon-128.png
```

## Source of truth

- Marker metadata: `src/data/marker-catalog.json`
- Clipart metadata: `src/data/clipart-catalog.json`
- Layout metadata: `src/data/layout-catalog.local.json`
- Complete contract: `src/data/yemind-asset-contract.json`
- URL helpers: `src/config/yemind-local-assets.ts`

The UI should not scan directories at runtime. It should render panels from these catalogs.

## Runtime paths

All paths in the catalogs are relative to `assets/`.

```ts
const assets = createYemindAssetResolver(pluginBaseUrl);

assets.markerSpriteUrl();
assets.clipartUrl("clipart/01_动物/001_河马.svg");
assets.layoutUrl(
  "layout-thumbnails/01_mindmap/01_mindmap.svg",
);
```

`pluginBaseUrl` must come from the actual YeMind/SiYuan runtime. Do not hardcode a local disk path.

## Marker sprite

- Source PNG: `assets/icons/marker-sprite.png`
- Source size: 760 × 976
- CSS background size: 380 × 488
- Display cell: 28 × 28
- Start offset: 14 × 14
- Grid step: 36 × 36
- Total icons: 126

Use `backgroundPosition` from `marker-catalog.json`.

## Clipart

The clipart catalog contains every SVG file. Search should match the item's `label`, while category tabs should use `categoryId` and `categoryLabel`.

Do not reorganize the physical category folders. The current folder is authoritative.

## Layout thumbnails

There are 28 thumbnails in seven groups. They already use:

- green root nodes
- darker gray normal nodes
- darker gray connectors

Use the existing SVG files directly. Do not recolor them again at runtime.

## AI ZIP rule

Default development/update package:

```json
{
  "mode": "resource-excluded-update",
  "requiresExistingLocalAssets": true
}
```

Exclude the fixed visual resources. Include only changed code, JSON/TS catalogs, documentation, tests, and build files.

A standalone release is different: it must still contain or install the assets.
