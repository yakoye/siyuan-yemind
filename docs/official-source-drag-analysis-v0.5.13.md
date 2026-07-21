# YeMind Zen v0.5.13：KMind Zen 官方节点拖动机制继续研究

日期：2026-07-17

## 1. 本次现场问题

用户在 Windows SiYuan 3.7.2 中安装 v0.5.12 后提供了两张真实拖动截图：

1. 被拖节点已经降低透明度并出现 ghost，但父节点到原节点的旧实线仍在；
2. ghost 已经进入上方节点附近，父节点提示仍连接旧父节点，目标切换明显滞后。

本次继续采用方案 C：研究 KMind Zen 0.33.0 官方生产 bundle 的真实机制，再适配到 YeMind Zen 的 `simple-mind-map` 内核。最终结构变更、历史、布局和保存仍由上游负责。

## 2. 旧父节点实线的真实所有权

安装版本 `simple-mind-map` 的 `Drag.createCloneNode()` 在拖动开始时依次调用：

```text
node.setOpacity(...)
node.hideChildren()
node.startDrag()
```

`MindMapNode.hideChildren()` 只隐藏：

- 当前节点自己持有的 `_lines`；
- 当前节点的后代节点。

在 `simple-mind-map` 中，节点 A 到子节点 B 的线由 A 持有，而不是 B 持有。因此，被拖节点 B 的“父 → B”入线位于：

```text
B.parent._lines[B.parent.children.indexOf(B)]
```

这解释了截图：B 的子树和出线已经隐藏，但旧入线仍由父节点正常显示。

### v0.5.13 处理

拖动 clone 第一次创建后：

1. 找到每个顶层被拖节点的父节点和子节点索引；
2. 获取对应父节点 `_lines[index]`；
3. 记录该 SVG 线拖动前是否可见；
4. 在整个拖动会话中隐藏它；
5. mouseup、取消、插件移除或销毁后，按原可见状态恢复。

多选拖动只处理上游已经筛选出的顶层节点，避免父子同时选中时重复隐藏同一子树连接。

## 3. v0.5.12 目标切换为什么仍然迟钝

v0.5.12 已经绕开上游固定约 300 ms 的 throttle，并加入 `requestAnimationFrame` 和 60 ms/3 帧稳定器，但候选目标仍来自上游 `Drag.prototype.checkOverlapNode()`。

该上游算法主要依据：

- 鼠标点；
- 节点内部四分之一命中区；
- 相邻节点之间的鼠标位置。

它没有使用完整 ghost 矩形，也没有 KMind Zen 官方的 80 px 子节点尾区和 44/72 px 同级通道。因此，ghost 看起来已经接近目标，但鼠标点还没有进入上游小命中区时，候选仍不会改变。

## 4. KMind Zen 0.33.0 官方候选算法

格式化后的官方 bundle 中，核心候选函数位于约第 22472–22890 行。

### 4.1 使用完整拖动矩形

官方输入是：

```text
draggedRect = { x, y, width, height }
```

不是单独的 pointer 坐标。所有子节点目标和同级目标都用矩形相交面积计算。

### 4.2 官方常量

```text
child tail                    80 px
child enter padding            8 px
child active/leave padding    22 px
sibling lane enter padding    44 px
sibling lane active padding   72 px
sibling end enter padding     44 px
sibling end active padding    72 px
```

### 4.3 候选优先顺序

官方顺序是：

1. ghost 命中目标生长方向的 child tail：立即作为该节点的子节点；
2. 存在同级通道，并且 ghost 中心不在某个子目标主体中：作为同级节点；
3. 命中子目标主体：作为子节点；
4. 仍有同级候选：作为同级节点；
5. 否则无目标。

这使 ghost 在视觉上接近新父节点时能提前进入候选，同时避免在节点主体和同级间隙交界处频繁跳变。

### 4.4 60 ms / 连续 3 帧稳定器

官方稳定器位于约第 136510–136543 行：

- 候选与稳定目标相同：立即清空 pending；
- 新候选首次出现：记录时间和第 1 帧；
- 后续帧候选相同：累计帧数；
- 时间达到 60 ms 且累计至少 3 帧后才切换稳定目标；
- 候选变化则重新计时。

### 4.5 Pending 时仍需继续逐帧

v0.5.12 只有新的 mousemove 才推进稳定器。如果用户把鼠标停在目标旁边，候选可能停留在第 1 或第 2 帧，直到再次移动才切换。

v0.5.13 在存在 pending candidate 时继续安排下一帧，因此鼠标停住后也能自动完成 60 ms/3 帧稳定。

## 5. 对当前 simple-mind-map 布局的适配

官方 bundle 使用它自己的 container layout 类型。YeMind Zen 不能直接照搬名称，必须映射到当前安装的 `simple-mind-map` 实际几何。

| 当前布局 | 父子生长方向 | 同级排列轴 |
| --- | --- | --- |
| logicalStructure | 右 | 纵向 |
| logicalStructureLeft | 左 | 纵向 |
| mindMap | 按分支左/右 | 各分支纵向 |
| organizationStructure | 下 | 横向 |
| catalogOrganization | 下；根的子级横排，后代纵排 | 根横向，后代纵向 |
| timeline | 根的子级向右，后代向下 | 根横向，后代纵向 |
| timeline2 | 根向右，后代按分支向上/下 | 根横向，后代纵向；上方分支需反向映射回数据顺序 |
| verticalTimeline 系列 | 根向下，后代按分支左/右 | 纵向 |

鱼骨图的层级方向和反转规则更特殊，本版继续使用上游原生检测作为明确 fallback，不在没有完整专项验证的情况下猜测替换。

### Timeline2 上方分支

`simple-mind-map` 的上方时间轴分支中，视觉顺序与 `parent.children` 数据顺序相反。候选可以按视觉位置计算，但最终必须映射回原生数据顺序，否则 `INSERT_BEFORE` / `INSERT_AFTER` 会落到反方向。

v0.5.13 对该分支执行：

```text
nativeIndex = childCount - visualIndex
```

并选择正确的原生前后相邻节点，最终仍交给上游 INSERT 命令。

## 6. 贝塞尔引导线

官方 renderer 位于约第 105218–105275 行：

- 稳定新目标：绿色 `6 6` 虚线，线宽 2.5；
- 没有稳定新目标：红色 `3 6` 原父节点提示；
- 横向：父节点右侧中心 → ghost 左侧中心；
- 纵向：父节点底部中心 → ghost 顶部中心；
- 两个控制点向外偏移 40 px；
- 原父节点线按 140 px 距离改变线宽和透明度。

v0.5.13 不再用“整张图一个方向”的判断。目录组织、时间轴、竖向时间轴等混合布局分别按当前稳定目标或原父节点的真实生长方向选择横向/纵向曲线。

## 7. 最终结构所有权

候选适配器只产生上游已经认识的字段：

```text
overlapNode
prevNode
nextNode
```

mouseup 仍由安装版本 `simple-mind-map` 执行：

```text
MOVE_NODE_TO
INSERT_AFTER
INSERT_BEFORE
```

没有新增：

- 第二套树变更算法；
- 第二套撤销历史；
- 自定义节点坐标持久化；
- 新导图格式；
- 新保存仓库。

## 8. 自动化覆盖与手工边界

自动化覆盖：

- 旧入线隐藏和原可见状态恢复；
- 现场截图对应的上方新父节点切换；
- 80 px child tail；
- 8/22 px子目标留白；
- 44/72 px同级通道；
- logical-left、mindMap、organization、catalog、timeline、timeline2、verticalTimeline 映射；
- timeline2 上方分支视觉顺序到原生数据顺序的转换；
- 60 ms/3 帧稳定器；
- 鱼骨图 fallback；
- 最终 MOVE/INSERT 命令仍归上游。

自动化不能替代 Windows SiYuan 中的真实鼠标手感。仍需手工验证快速拖动、慢速贴边、停住鼠标、立即松手、多选拖动和不同缩放比例下的视觉跟随。
