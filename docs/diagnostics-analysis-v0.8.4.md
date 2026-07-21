# YeMind v0.8.4 用户诊断包分析

日期：2026-07-21

诊断包：`yemind-diagnostics-20260721-201450.zip`

## 复现现象

用户在节点发生结构拖动后，即使只是轻微拖动并回到原位置，再双击节点也会出现：

- 节点原位置显示空白编辑框；
- 实际文字编辑层漂到页面左上角；
- 关闭并重新启动思源后暂时恢复。

## 诊断证据

同一次编辑事务中，诊断时间线反复出现：

```text
rich-text opened       hostLeft=684 hostTop=514
rich-text repositioned hostLeft=-6  hostTop=-4
```

其他节点也呈现相同模式：编辑框打开时位置正确，十几毫秒后的重新定位立即变成 `-6/-4`。诊断中的原 SVG 坐标为零。

这证明问题不是文字颜色、Quill 内容丢失或节点正文被清空，而是编辑层在打开后被一次无效几何更新移动到了错误位置。

## 根因

结构拖动触发 `simple-mind-map` 节点重绘。随后存在两种情况：

1. 富文本事务仍持有拖动前的渲染节点对象；
2. 富文本编辑期间原 SVG 文字被隐藏，`getBoundingClientRect()` 返回零尺寸矩形。

旧实现继续接受该零矩形。编辑框还包含自身边距和内边距，因此最终显示为 `left=-6px; top=-4px`。重启思源后渲染实例和临时编辑状态全部重建，所以现象暂时消失。

## 系统性修复

v0.8.4 没有判断 `-6/-4` 后强行复位，而是重构富文本编辑事务：

- 用节点 UID 作为稳定身份；
- 每次定位与提交都重新解析当前渲染节点；
- 拒绝零尺寸、脱离 DOM 和非有限矩形；
- DOM 矩形失效时通过 SVG 屏幕变换矩阵重建位置；
- 矩阵也不可用时保留本次编辑最后有效锚点；
- 无有效几何时跳过本次更新，绝不覆盖正确位置；
- 编辑完成时向当前渲染节点提交正文。

## 新诊断能力

后续若仍发生位置问题，诊断包会记录：

```text
rawNodeWidth / rawNodeHeight
anchorLeft / anchorTop / anchorWidth / anchorHeight
textElementConnected
rectSource
liveNodeResolved
repositioned-from-anchor
reposition-skipped-invalid-target
```

可直接判断失效发生在节点身份、DOM 矩形、SVG 变换矩阵还是编辑宿主坐标转换阶段。
