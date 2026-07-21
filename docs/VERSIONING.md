# YeMind 语义化版本规则

YeMind 使用 `Major.Minor.Patch`。

## Major

出现不兼容的数据格式、公共行为或迁移要求时增加主版本。进入 `1.0.0` 还要求导图、大纲、搜索、存储、迁移和诊断经过多个稳定版本验证。

## Minor

兼容前提下增加完整功能、设置分区或重构主要子系统时增加次版本并将 Patch 归零。例如 v0.7.0 新增“关于”、版本门禁并升级诊断子系统。

## Patch

单一缺陷、小范围交互、文案或样式修复，且不改变数据格式和主要架构时增加修订号。

## 发布身份门禁

每次发布必须统一：

- `package.json`
- `package-lock.json`
- `plugin.json`
- `src/plugin/constants.ts`
- `src/releaseInfo.ts`
- 设置 → 关于
- 诊断报告与版本一致性文件
- README / CHANGELOG / FEATURE_MATRIX / DEVELOPMENT_PLAN
- 发布 ZIP 文件名
- 验证报告

任何一项不一致都不得发布。
