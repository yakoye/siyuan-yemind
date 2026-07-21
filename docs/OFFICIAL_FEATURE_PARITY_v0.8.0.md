# YeMind v0.8.0 品牌与工程兼容边界

## 本版完成

- 公开产品名称统一为 **YeMind**。
- npm 工程包名统一为 `siyuan-yemind`。
- TypeScript 插件入口由 `YeMindZenPlugin` 重命名为 `YeMindPlugin`。
- 发布压缩包统一采用 `siyuan-yemind-vX.Y.Z.zip`。
- 使用用户提供的思维导图图形生成 32、64、128 和 512 像素透明 PNG。
- 所有图标可见像素严格使用 `#176B50`，边缘只通过 alpha 抗锯齿。
- 思源 SVG 图标符号内嵌 32px 图标数据，避免外部资源加载失败。
- 设置“关于”使用 512px 根图标。

## 有意保留的兼容标识

`plugin.json.name` 继续为 `siyuan-yemind-zen`。这是思源识别插件数据目录、恢复标签和插件 URL 的永久技术标识，不是公开产品名。

直接改成 `siyuan-yemind` 会让思源把它当成另一个插件，已有 `maps.json`、`settings.json`、`checkpoints.json`、恢复标签和 `siyuan://plugins/...` 链接将无法自动衔接。因此 v0.8.0 采用：

```text
公开产品名：YeMind
工程包名：siyuan-yemind
源码入口：YeMindPlugin
永久思源插件 ID：siyuan-yemind-zen
```

## 官方参考

KMind Zen 0.34.0 仍是交互与功能参考名称。本次不会修改官方产品名称，也不会改变导图数据格式、上游编辑器命令或存储结构。
