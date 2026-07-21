# YeMind v0.8.0 验证报告

日期：2026-07-21

## 范围

- 新品牌图标与精确颜色
- 公开产品名称重命名
- npm 工程与源码入口重命名
- 永久插件 ID 数据兼容
- 全部历史功能回归

## 源码工作区验证

```text
测试文件：152 passed
测试数量：419 passed
TypeScript：passed
生产构建：passed
Vite modules：900
构建入口语法：passed
```

## 图标门禁

自动测试解码 PNG 像素并验证：

```text
assets/yemind-icon-32.png：32×32 RGBA
assets/yemind-icon-64.png：64×64 RGBA
assets/yemind-icon-128.png：128×128 RGBA
icon.png：512×512 RGBA
所有 alpha > 0 的像素 RGB：#176B50
顶部中心安全区域：透明
```

## 身份与兼容门禁

```text
公开显示名：YeMind
npm 工程名：siyuan-yemind
源码入口：YeMindPlugin
发布版本：0.8.0
永久思源插件 ID：siyuan-yemind-zen
```

永久插件 ID 保持不变，用于保护已有导图、设置、检查点、恢复标签和插件 URL。

## 依赖审计

```text
low: 1
moderate: 2
high: 0
critical: 0
```

问题来自现有 `simple-mind-map` 依赖链中的 Quill 和 UUID。自动修复会引入破坏性依赖变更，本版未强制降级或升级。

## 待真实桌面端验收

当前环境不能启动 Windows SiYuan 3.7.2，仍需检查：

- 顶栏、Dock、标签和全局搜索中的新图标清晰度；
- 32px 图标在浅色和深色主题中的显示；
- 从 v0.7.1 覆盖升级后，原有导图和设置是否原样读取；
- 设置“关于”中的新名称、图标和版本信息。
