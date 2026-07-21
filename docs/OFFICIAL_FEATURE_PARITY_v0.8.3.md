# YeMind v0.8.3 节点文本编辑适配边界

日期：2026-07-21

## 上游能力

YeMind 继续使用 `simple-mind-map` 的：

- SVG 节点与文本测量；
- Quill 富文本编辑器；
- `SET_NODE_TEXT`、插入节点和历史命令；
- 文字格式、链接、公式和代码格式数据；
- 节点编辑开始与结束生命周期。

## 本版适配

### 1. 编辑器坐标系

上游 RichText 默认使用 `position: fixed` 和视口坐标。YeMind 将编辑器挂载在思源标签内的 `.ymz-editor`，因此必须将节点的视口坐标转换为编辑器局部坐标，并使用 `position: absolute`。

若编辑器确实挂载到 `document.body`，仍保留上游固定定位作为降级路径。

### 2. 初始选区语义

- 新节点、默认节点、显式 pristine 节点：全选文字；
- 已编辑节点：光标位于末尾；
- 输入发生后记录编辑标记；
- 旧数据没有标记时，只对有限的历史默认文案使用兼容判断。

此适配不建立第二套文本模型，最终内容仍由上游 Quill 和 `SET_NODE_TEXT` 保存。

### 3. 画布与大纲一致性

画布 RichText 和 OutlineRichTextController 共用：

- 可编辑长度定义；
- Ctrl/Cmd+A 的局部选区语义；
- 剪贴板快捷键优先于节点结构快捷键；
- 首次全选与已有节点末尾光标策略。

大纲仍使用单活动 Quill 与稳定 keyed patch，不复制官方私有大纲内核。

### 4. 同名插件替换

上游 UMD 构建可能已经把 `RichText` 注册到 `MindMap.pluginList`。YeMind 不能只再次调用 `usePlugin()`，因为重复 `instanceName` 可能被跳过。v0.8.3 按 `instanceName` 替换同名插件，确保测试和生产都使用 YeMindRichText。

## 不改变的兼容边界

- 当前插件 ID：`siyuan-yemind`；
- 历史协议链接别名：`siyuan-yemind-zen`；
- 导图、设置和检查点格式不升级；
- 原有富文本 HTML、节点 UID 和历史命令保持兼容；
- 不修改 `simple-mind-map` 包源码；
- 不建立独立于 Quill 的第二套富文本存储。
