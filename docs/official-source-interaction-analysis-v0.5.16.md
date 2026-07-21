# YeMind v0.5.16 官方交互源码研究

日期：2026-07-18

## 输入

- YeMind v0.5.15 完整源码；
- KMind Zen 0.33.0 思源插件生产包；
- KMind Zen 中英文 README；
- `simple-mind-map` 0.14.0-fix.3 源码。

## 官方画布与节点菜单

生产包的中文资源明确分为：

- `app.contextMenu.canvas.*`：回到根节点、重置缩放、新建根节点、进入/退出禅模式、进入/退出只读模式、展开/收起当前导图等；
- `app.contextMenu.node.*`：待办、备注、批注、复制、粘贴、添加父节点、删除、仅删除当前节点和展开层级等。

因此 v0.5.16 不把空白右键和节点右键混成一个菜单。画布菜单只操作整图/视图；节点菜单继续操作节点结构和内容。

## 官方禅模式

README 明确说明：禅模式和只读模式的当前状态在右上角可见并容易退出。YeMind 采用右上角状态胶囊，但按用户要求默认收起，仅在 hover/focus 时展开。

## 官方图片模型与缩放

生产包包含 `app.command.node.image.add/copy/paste/remove/setRegion/moveToNodeRegion/setSize/setFit`。紧邻命令资源的图片尺寸函数对宽、高、最大尺寸和 `aspect` 进行约束。

当前上游 `simple-mind-map` 已具备：

- `SET_NODE_IMAGE`；
- `imageSize.width/height/custom`；
- `NodeImgAdjust`；
- `resizeImgSizeByOriginRatio()`。

`NodeImgAdjust` 在拖动时读取图片原始宽高，按原始比例计算新尺寸，并在 mouseup 时通过 `SET_NODE_IMAGE` 同时写入宽高。因此 YeMind 只需要补齐图片输入入口，不应复制另一套缩放逻辑。

## 大纲删除根因

v0.5.15 的 `resolveOutlineKeyAction()` 在空文本时把 Backspace/Delete 解释为 `remove`，编辑器捕获后调用 `removeNodeByUid()`。这与持续 Quill 编辑器语义冲突：删除键应先属于文本编辑，不应因当前文本为空而隐式转为结构命令。

v0.5.16 移除此键盘映射，节点删除保留在明确菜单和现有导图结构命令中。

## 适配边界

继续保留 YeMind 的：

- `simple-mind-map` 节点结构和历史；
- MapRepository / CheckpointRepository；
- 当前富文本、拖拽、布局、主题和持久化；
- 思源原生 Menu 和 Dialog。

不导入 KMind 私有文档模型、命令总线、图片资产系统或第二套历史。
