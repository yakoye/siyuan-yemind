# YeMind v0.8.2 验证报告

## 变更

- Dock、顶栏、菜单共享的 `iconYeMind` 从固定绿色 PNG 嵌入改为纯 SVG `currentColor` 矢量图标。
- Dock 未激活时继承思源普通前景色；激活时继承高对比前景色，可在蓝色或主题色背景上自动反色。
- 关于页继续使用 `icon.png` 品牌原色图标（#176B50）。

## 自动验证

- 测试文件：155 passed
- 测试数量：432 passed
- TypeScript：passed
- 生产构建：passed
- Vite modules：900
- `node --check index.js`：passed

## 专项契约

- 交互图标必须包含 `stroke="currentColor"`。
- 交互图标不得包含 `<image>` 或固定 `#176B50`。
- 品牌 PNG 仍保持透明背景与 #176B50 像素。
