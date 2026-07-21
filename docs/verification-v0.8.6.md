# YeMind v0.8.6 验证报告

日期：2026-07-21

## 改动范围

本版仅重构测试基础设施，不修改产品运行功能。

- Vitest 入口：159 → 15
- 独立场景模块：159 → 158
- 测试项：448 → 445
- 删除：1 个完全重复的插件身份测试文件、2 条重复版本断言
- 用户反馈回归：全部保留
- 功能域：15

## 功能域结果

| 功能域 | 测试数 | 结果 |
|---|---:|---|
| Outline & Split | 52 | 通过 |
| UI Shell | 47 | 通过 |
| Storage & Lifecycle | 42 | 通过 |
| Styles & Themes | 40 | 通过 |
| Node Content | 38 | 通过 |
| Rich Text Editing | 35 | 通过 |
| Drag Interactions | 33 | 通过 |
| Commands & Selection | 31 | 通过 |
| Search & Navigation | 31 | 通过 |
| Advanced Structures | 26 | 通过 |
| Checkpoints | 20 | 通过 |
| Diagnostics & Release | 19 | 通过 |
| Contracts & Compatibility | 17 | 通过 |
| Settings | 11 | 通过 |
| User Regression Matrix | 3 | 通过 |
| **合计** | **445** | **通过** |

## 源码工作区门禁

```text
Test structure: 15 domains / 158 scenario modules passed
Test Files: 15 passed
Tests: 445 passed
TypeScript: passed
Production build: passed
Vite modules: 903
index.js syntax: passed
```

基线完整测试耗时约 9.29 秒；重构后约 6.69 秒。

## 发布包二次验证

从最终 ZIP 完整解压后执行：

```text
npm ci: passed
Test structure: passed
Test Files: 15 passed
Tests: 445 passed
TypeScript: passed
Production build: passed
index.js syntax: passed
```

## 包结构

- `plugin.json.name`: `siyuan-yemind`
- `plugin.json.version`: `0.8.6`
- 显示名称：`YeMind`
- 平铺覆盖包：是
- `maps.json`：不包含
- `settings.json`：不包含
- `checkpoints.json`：不包含
- `node_modules/`、`dist/`、`.git/`：不包含

## 安全审计

```text
low: 1
moderate: 2
high: 0
critical: 0
```

本版未新增或升级依赖。
