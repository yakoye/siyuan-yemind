# YeMind Integration Examples

## Load catalogs

```ts
import markerCatalog from "../data/marker-catalog.json";
import clipartCatalog from "../data/clipart-catalog.json";
import layoutCatalog from "../data/layout-catalog.local.json";
```

Adapt JSON import syntax to the project's bundler if required.

## Render marker

```ts
const marker = markerCatalog.items.find(
  item => item.id === "priority-01",
);

const style = getYemindMarkerStyle(
  assets.markerSpriteUrl(),
  marker,
);
```

## Render clipart

```tsx
<img
  src={assets.clipartUrl(clipart.relativePath)}
  alt={clipart.label}
  draggable={false}
/>
```

## Render layout thumbnail

```tsx
<img
  src={assets.layoutUrl(layout.relativePath)}
  alt={layout.title}
  draggable={false}
/>
```

## Search clipart

```ts
function searchCliparts(query: string, categoryId?: string) {
  const keyword = query.trim().toLocaleLowerCase();

  return clipartCatalog.items.filter(item => {
    const categoryMatches =
      !categoryId || item.categoryId === categoryId;

    const textMatches =
      !keyword ||
      item.label.toLocaleLowerCase().includes(keyword);

    return categoryMatches && textMatches;
  });
}
```

## Node data

Store stable IDs and presentation settings, not embedded SVG/Base64 content.

```json
{
  "markers": ["priority-01", "flag-02"],
  "clipart": {
    "id": "animal-001",
    "width": 64,
    "height": 64
  },
  "layoutId": "mindmap"
}
```
