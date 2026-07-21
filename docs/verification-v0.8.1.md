# YeMind v0.8.1 验证报告

日期：2026-07-21

## 发布身份

- 产品名：YeMind
- 工程包名：`siyuan-yemind`
- 当前思源插件 ID：`siyuan-yemind`
- 当前安装目录：`工作空间/data/plugins/siyuan-yemind/`
- 历史协议链接与数据源 ID：`siyuan-yemind-zen`
- 版本：`0.8.1`

## 身份与数据迁移

- `plugin.json.name`、当前资源 URL、诊断身份和新协议链接均为 `siyuan-yemind`。
- 思源插件数据位于 `data/storage/petal/<插件ID>/`。
- 首次启动时逐项检查 `maps.json`、`settings.json`、`checkpoints.json`。
- 新 ID 文件缺失且旧 ID 文件存在时，复制到新 ID；旧文件不删除。
- 新 ID 已有任何有效数据时，保留新数据并跳过对应迁移。
- 历史 `siyuan-yemind-zen` 协议链接仍可解析。

## 安装包

- ZIP 为平铺结构，可直接解压覆盖 `data/plugins/siyuan-yemind/`。
- 不包含 `maps.json`、`settings.json`、`checkpoints.json`、`node_modules`、`dist` 或嵌套 ZIP。

## 源码门禁

```text
测试文件：154 passed
测试数量：429 passed
TypeScript：passed
生产构建：passed
Vite modules：901
index.js 语法：passed
```

## 依赖审计

```text
low: 1
moderate: 2
high: 0
critical: 0
```

本版没有新增依赖或执行破坏性强制升级。

## 覆盖安装

1. 完全退出思源。
2. 建议备份工作空间，至少保留 `data/storage/petal/siyuan-yemind-zen/` 与 `data/storage/petal/siyuan-yemind/`。
3. 将 ZIP 内文件直接解压到 `工作空间/data/plugins/siyuan-yemind/` 并覆盖。
4. 启动思源并启用 YeMind；首次启动会按上述规则迁移旧 ID 数据。
