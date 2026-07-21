# YeMind v0.8.3 验证报告

日期：2026-07-21

## 发布目标

本版修复节点文字编辑事务：

- 新节点、默认节点和从未编辑的节点，双击后自动全选；
- 已编辑节点，双击后光标位于文字末尾；
- 画布、分屏和大纲均支持 Ctrl/Cmd+A、复制、剪切、粘贴、Backspace、Delete、方向键和中文输入法；
- 富文本编辑框覆盖在原节点位置，不再出现节点内空白、文字漂到页面左上角；
- YeMind 自定义 RichText 必须真正替换 `simple-mind-map` 预注册的同名插件。

## 用户诊断包结论

诊断包 `yemind-diagnostics-20260721-192819.zip` 中：

- 插件版本为 0.8.1，版本一致性通过；
- 大纲多次出现 `edit-start → structure-change → editor-destroy`；
- 旧诊断没有记录画布编辑框坐标、富文本宿主、初始选区和 Ctrl+A 路由，无法直接解释文字漂移；
- 源码检查进一步确认，上游 RichText 使用视口固定坐标，而编辑框被挂载在思源标签内部容器中，坐标系不一致会导致编辑层漂移。

v0.8.3 新增 `rich-text` 编辑诊断事件，记录编辑层定位方式、编辑层坐标、节点坐标和初始选区策略。

## 实现验证

### 真实画布集成测试

测试使用真实 `simple-mind-map + SVG + Quill`，而不是只比较 CSS 字符串：

1. 创建带偏移量的 `.ymz-editor` 与 SVG 节点；
2. 双击真实 SVG 节点；
3. 确认实际插件实例是 `YeMindRichText`；
4. 确认编辑宿主挂载到当前编辑器根节点；
5. 确认编辑宿主采用 `position: absolute`；
6. 确认编辑层坐标由节点视口坐标转换为编辑器局部坐标；
7. 确认节点文字仍位于编辑层中。

### 首次编辑与已有节点

- `yemindTextPristine=true`：初始选区覆盖全部可编辑文字，不包含 Quill 末尾换行；
- `yemindTextEdited=true`：初始选区为文字末尾的零长度光标；
- 历史默认文字 `新节点 / 主要主题 / 另一个主题 / 未命名导图` 在没有编辑标记时按首次编辑处理；
- 用户输入后写入 `yemindTextPristine=false`、`yemindTextEdited=true`。

### 快捷键与剪贴板

- Ctrl/Cmd+A 由当前 Quill 编辑器捕获，并只选择当前节点文字；
- Ctrl/Cmd+C、Ctrl/Cmd+X、Ctrl/Cmd+V 不被节点结构快捷键阻止；
- 画布和大纲都使用同一套可编辑文字长度计算，排除 Quill 末尾换行；
- 只在编辑器区域拦截 Ctrl/Cmd+A，不影响非编辑状态的节点多选行为。

### 插件注册

`simple-mind-map` UMD 构建可能预注册上游 RichText。注册器现在按 `instanceName` 替换同名插件，避免 `usePlugin()` 因重复实例名跳过 YeMind 覆盖。集成测试直接断言正式实例构造函数为 `YeMindRichText`。

## 自动验证结果

```text
测试文件：156 passed
测试数量：437 passed
TypeScript：passed
生产构建：passed
Vite modules：901
构建入口语法：passed
```

生产依赖审计：

```text
low: 1
moderate: 2
high: 0
critical: 0
```

本版没有新增依赖；现有问题来自既有依赖链。

## 桌面端仍需验收

当前构建环境无法启动 Windows SiYuan 3.7.2。安装后应重点验证：

1. 新建节点双击后文字全部被选中，可直接粘贴覆盖；
2. 新建节点全选后 Ctrl+X 可剪切；
3. 已编辑节点双击后光标位于末尾；
4. 画布编辑框与节点位置完全重合；
5. 分屏和纯大纲中 Ctrl+A 只选择当前节点文字；
6. 连续 Backspace/Delete、中文输入法、复制、剪切、粘贴均不退出编辑；
7. 自动保存和结构同步不会无故销毁当前编辑器。
