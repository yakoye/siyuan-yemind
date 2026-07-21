# YeMind v0.7.0 官方功能适配边界

## 本版范围

v0.7.0 不移植 KMind 编辑器私有内核。本版聚焦 SiYuan 插件外壳能力：关于、版本一致性、诊断导出和全局搜索链路追踪。

## 继续复用的边界

- 导图结构、历史、布局和节点最终变更仍由 `simple-mind-map` 负责。
- 思源标签、搜索窗口和设置入口继续使用公开插件/宿主接口及受控 DOM 适配。
- 全局搜索只记录宿主结构是否存在、结果数量和导航步骤，不复制宿主正文。

## YeMind 自有实现

- `releaseInfo.ts`：产品与构建身份。
- Settings → About：版本和发布摘要。
- Diagnostics schema v3：结构化本地导出。
- Global-search diagnostics：从查询到节点高亮的状态机事件。
- Semantic version gate：按兼容性与功能范围决定版本号。

## 未改变

- 导图数据格式。
- 检查点数据格式。
- 官方 KMind 私有文档模型和历史内核没有被复制。
