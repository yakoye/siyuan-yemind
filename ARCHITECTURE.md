# YeMind Zen 架构

## 项目标识

- 插件目录：`siyuan-yemind-zen`
- 插件 ID：`siyuan-yemind-zen`
- 思源显示名：`YeMind Zen`
- 当前版本：`0.5.20`

## 核心分层

```text
SiYuan Plugin Shell
├─ Dock / Tab / Top Bar / Settings
├─ MapRepository：导图元数据、内容和当前项
├─ CheckpointRepository：独立命名快照与恢复前保护
├─ DiagnosticsService：本地诊断、问题时刻窗口、版本自检与脱敏导出
├─ YeMindEditor：编辑器生命周期、稳定大纲 patch 和自动保存
├─ simple-mind-map：节点、布局、历史、最终拖拽变更、缩放
├─ Official drag intent adapter：仅负责画布拖动预览候选、稳定器和引导线
├─ Outline adapter：不移动活动行的 keyed patch、单活动 Quill、原生 expand 同步、空节点结构删除和整行 Pointer 拖拽意图
├─ Node quick actions：编辑器局部新增/折叠控件，动作路由到上游命令
├─ Node style panel：原生样式 patch、历史和主题继承
├─ Node note/comment layer：备注数据、清理、对话框和悬停预览
└─ UI：顶部、左侧、底部工具栏与思源原生菜单
```

## 目录

```text
src/
├─ core/       simple-mind-map 创建、插件注册和命令适配
├─ content/    待办、备注、批注和安全富文本等节点扩展数据
├─ diagnostics/ 本地日志、自检和诊断包生成
├─ editor/     编辑器生命周期、富文本工具栏、模板、状态统计
├─ model/      导图与检查点数据模型、默认导图、事务持久化仓库
├─ plugin/     思源插件、Dock、Tab、协议与常量
├─ settings/   全局设置及存储
├─ styles/     运行样式
├─ ui/         节点内容菜单和对话框
└─ compat/     后续文件兼容适配器
```

## 原则

1. 所有运行代码由 `src/` 构建，不再保留旧运行时兜底。
2. 导图编辑能力通过 `simple-mind-map` 的公开内核、插件和命令系统完成。
3. 思源集成使用思源公开插件 API；不会修改其他插件的压缩代码。
4. 不设置 Pro、付费、试用、激活、会员或能力开关。
5. 文件兼容进入 `src/compat/`，不污染编辑内核。
6. 新功能先写测试，再实现并通过类型检查和生产构建。
