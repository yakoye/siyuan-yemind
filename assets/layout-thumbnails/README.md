# YeMind Layout Thumbnails — Green Theme

本资源包包含 28 个独立 SVG 布局缩略图，按 7 个分类组织。

## 统一配色

- 根节点渐变起点：`#16C784`
- 根节点渐变终点：`#43D89C`
- 普通节点：`#8F99A8`
- 次级普通节点：`#B8C0CB`
- 连线：`#667085`
- 箭头和方向标识：`#475467`

## 文件结构

- `01_mindmap`：思维导图（逻辑图），5 个
- `02_tree`：树状图，6 个
- `03_timeline`：时间轴，5 个
- `04_organization`：组织结构图，3 个
- `05_fishbone`：鱼骨图，2 个
- `06_tree-table`：树形表格，2 个
- `07_other`：其他，5 个
- `layout-catalog.json`：名称、分组、文件路径和主题颜色
- `preview.html`：浏览器预览全部缩略图

## YeMind 中使用

直接作为图片加载：

```html
<img
  src="/assets/layouts/01_mindmap/01_mindmap.svg"
  width="40"
  height="32"
  alt="思维导图"
/>
```

也可以读取 `layout-catalog.json` 动态生成布局选择面板：

```js
const catalog = await fetch('/assets/layouts/layout-catalog.json').then(r => r.json());

for (const item of catalog.items) {
  console.log(item.title, item.file);
}
```

SVG 均保持原始 `40 × 32` 尺寸和 `viewBox="0 0 40 32"`，只统一了配色，没有改变节点位置、连线形状或布局方向。
