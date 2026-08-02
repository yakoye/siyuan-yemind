import { Rect } from '@svgdotjs/svg.js'

function copyDomAttributes(target, source) {
  if (!target || !source || !target.getAttributeNames) return
  const nextNames = new Set(source.getAttributeNames())
  target.getAttributeNames().forEach(name => {
    if (!nextNames.has(name)) target.removeAttribute(name)
  })
  nextNames.forEach(name => {
    target.setAttribute(name, source.getAttribute(name))
  })
}

function canReuseDomNode(target, source) {
  return Boolean(
    target &&
      source &&
      target.nodeType === source.nodeType &&
      (target.nodeType !== 1 || target.nodeName === source.nodeName)
  )
}

function reconcilePaintedDom(target, source) {
  if (!canReuseDomNode(target, source)) return false
  if (target.nodeType === 3) {
    target.nodeValue = source.nodeValue
    return true
  }
  if (target.nodeType !== 1) return true

  copyDomAttributes(target, source)
  const targetChildren = Array.from(target.childNodes)
  const sourceChildren = Array.from(source.childNodes)
  sourceChildren.forEach((sourceChild, index) => {
    const targetChild = targetChildren[index]
    if (reconcilePaintedDom(targetChild, sourceChild)) return
    const replacement = sourceChild.cloneNode(true)
    if (targetChild) target.replaceChild(replacement, targetChild)
    else target.appendChild(replacement)
  })
  for (
    let index = targetChildren.length - 1;
    index >= sourceChildren.length;
    index--
  ) {
    targetChildren[index].remove()
  }
  return true
}

function preserveLayoutAttributes(target, names) {
  if (!target) return () => {}
  const values = names.map(name => [name, target.getAttribute(name)])
  return () => {
    values.forEach(([name, value]) => {
      if (value === null) target.removeAttribute(name)
      else target.setAttribute(name, value)
    })
  }
}

// Keep Chromium's painted foreignObject alive while its measured width changes.
// Replacing it on every mousemove can expose the new layer at its unpositioned
// origin for one compositor frame, which is visible as text jumping up/left.
export function preserveLiveTextData(previous, next) {
  if (!previous || !next || !previous.node || !next.node) return next
  const previousOuter = previous.node.node
  const nextOuter = next.node.node
  if (!previousOuter || !nextOuter) return next

  const restoreOuterLayout = preserveLayoutAttributes(previousOuter, [
    'x',
    'y',
    'transform',
    'data-offsetx'
  ])
  const restoreContentLayout = preserveLayoutAttributes(
    previous.nodeContent && previous.nodeContent.node,
    ['x', 'y', 'transform']
  )
  reconcilePaintedDom(previousOuter, nextOuter)
  restoreOuterLayout()
  restoreContentLayout()
  previous.width = next.width
  previous.height = next.height
  return previous
}

// Width dragging is a live geometry preview, not a full node render. Keep the
// already-painted node subtree connected and update only geometry that changes.
// The canonical full layout still runs once on mouseup through mindMap.render().
function updateWidthDragLayoutInPlace() {
  if (!this.group || !this.shapeNode || !this.hoverNode) return false

  const halfBorderWidth = this.getBorderWidth() / 2
  const nextShape = this.shapeInstance.createShape()
  nextShape.addClass('smm-node-shape')
  nextShape.translate(halfBorderWidth, halfBorderWidth)
  this.style.shape(nextShape)
  if (!reconcilePaintedDom(this.shapeNode.node, nextShape.node)) return false

  const { hoverRectPadding } = this.mindMap.opt
  this.hoverNode
    .size(
      this.width + hoverRectPadding * 2,
      this.height + hoverRectPadding * 2
    )
    .x(-hoverRectPadding)
    .y(-hoverRectPadding)
  this.style.hoverNode(this.hoverNode, this.width, this.height)

  if (this._unVisibleRectRegionNode) {
    this.renderer.layout.renderExpandBtnRect(
      this._unVisibleRectRegionNode,
      this.mindMap.opt.expandBtnSize,
      this.width,
      this.height,
      this
    )
  }

  this.update()
  this.mindMap.emit('node_layout_end', this)
  return true
}

function syncActiveRichTextEditor() {
  const richText = this.mindMap.richText
  if (
    richText &&
    richText.showTextEdit === true &&
    richText.node === this &&
    typeof richText.updateTextEditNode === 'function'
  ) {
    richText.updateTextEditNode()
  }
}

// 初始化拖拽
function initDragHandle() {
  if (!this.checkEnableDragModifyNodeWidth()) {
    return
  }
  // 拖拽手柄元素
  this._dragHandleNodes = null
  // 手柄元素的宽度
  this.dragHandleWidth = 4
  // 鼠标按下时的x坐标
  this.dragHandleMousedownX = 0
  // 鼠标是否处于按下状态
  this.isDragHandleMousedown = false
  // 当前拖拽的手柄序号
  this.dragHandleIndex = 0
  // 鼠标按下时记录当前的customTextWidth值
  this.dragHandleMousedownCustomTextWidth = 0
  // 鼠标按下时记录当前的手型样式
  this.dragHandleMousedownBodyCursor = ''
  // 鼠标按下时记录当前节点的left值
  this.dragHandleMousedownLeft = 0

  this.onDragMousemoveHandle = this.onDragMousemoveHandle.bind(this)
  window.addEventListener('mousemove', this.onDragMousemoveHandle)
  this.onDragMouseupHandle = this.onDragMouseupHandle.bind(this)
  window.addEventListener('mouseup', this.onDragMouseupHandle)
  this.mindMap.on('node_mouseup', this.onDragMouseupHandle)
}

// 鼠标移动事件
function onDragMousemoveHandle(e) {
  if (!this.isDragHandleMousedown) return
  e.stopPropagation()
  e.preventDefault()
  let {
    minNodeTextModifyWidth,
    maxNodeTextModifyWidth,
    isUseCustomNodeContent,
    customCreateNodeContent
  } = this.mindMap.opt
  const useCustomContent =
    isUseCustomNodeContent && customCreateNodeContent && this._customNodeContent
  document.body.style.cursor = 'ew-resize'
  this.group.css({
    cursor: 'ew-resize'
  })
  const { scaleX } = this.mindMap.draw.transform()
  const ox = e.clientX - this.dragHandleMousedownX
  let newWidth =
    this.dragHandleMousedownCustomTextWidth +
    (this.dragHandleIndex === 0 ? -ox : ox) / scaleX
  newWidth = Math.max(newWidth, minNodeTextModifyWidth)
  if (maxNodeTextModifyWidth !== -1) {
    newWidth = Math.min(newWidth, maxNodeTextModifyWidth)
  }
  // 如果存在图片，那么最小值需要考虑图片宽度
  if (!useCustomContent && this.getData('image')) {
    const imgSize = this.getImgShowSize()
    if (
      this._rectInfo.textContentWidth - this.customTextWidth + newWidth <=
      imgSize[0]
    ) {
      newWidth =
        imgSize[0] + this.customTextWidth - this._rectInfo.textContentWidth
    }
  }
  this.customTextWidth = newWidth
  if (this.dragHandleIndex === 0) {
    this.left = this.dragHandleMousedownLeft + ox / scaleX
  }
  // 自定义内容不重新渲染，交给开发者
  if (useCustomContent) {
    this.reRender([], {
      ignoreUpdateCustomTextWidth: true
    })
  } else {
    const previousTextData = this._textData
    this.getSize(['text'], {
      ignoreUpdateCustomTextWidth: true
    })
    this._textData = preserveLiveTextData(previousTextData, this._textData)
    if (!updateWidthDragLayoutInPlace.call(this)) {
      this.layout()
      this.update()
    }
    syncActiveRichTextEditor.call(this)
  }
}

// 鼠标松开事件
function onDragMouseupHandle() {
  if (!this.isDragHandleMousedown) return
  document.body.style.cursor = this.dragHandleMousedownBodyCursor
  this.group.css({
    cursor: 'default'
  })
  this.isDragHandleMousedown = false
  this.dragHandleMousedownX = 0
  this.dragHandleIndex = 0
  this.dragHandleMousedownCustomTextWidth = 0
  this.setData({
    customTextWidth: this.customTextWidth
  })
  // The live drag path has already measured and painted the final text and
  // shape geometry.  Mark that data as the current rendered snapshot before
  // the tree layout pass so Base does not rebuild this node's text subtree on
  // mouseup.  The render is still required to reposition relatives and lines;
  // only the redundant content reconstruction is skipped.
  this.nodeDataSnapshot = JSON.stringify(this.getData())
  this.mindMap.render(() => syncActiveRichTextEditor.call(this))
  this.mindMap.emit('dragModifyNodeWidthEnd', this)
}

// 插件拖拽手柄元素
function createDragHandleNode() {
  const list = [new Rect(), new Rect()]
  list.forEach((node, index) => {
    node
      .size(this.dragHandleWidth, this.height)
      .fill({
        color: 'transparent'
      })
      .css({
        cursor: 'ew-resize'
      })
    node.on('mousedown', e => {
      e.stopPropagation()
      e.preventDefault()
      this.dragHandleMousedownX = e.clientX
      this.dragHandleIndex = index
      this.dragHandleMousedownCustomTextWidth =
        this.customTextWidth === undefined
          ? this._textData
            ? this._textData.width
            : this.width
          : this.customTextWidth
      this.dragHandleMousedownBodyCursor = document.body.style.cursor
      this.dragHandleMousedownLeft = this.left
      this.isDragHandleMousedown = true
    })
  })
  return list
}

// 更新拖拽按钮的显隐和位置尺寸
function updateDragHandle() {
  if (!this.checkEnableDragModifyNodeWidth()) return
  if (!this._dragHandleNodes) {
    this._dragHandleNodes = this.createDragHandleNode()
  }
  if (this.getData('isActive')) {
    this._dragHandleNodes.forEach(node => {
      node.height(this.height)
      this.group.add(node)
    })
    this._dragHandleNodes[1].x(this.width - this.dragHandleWidth)
  } else {
    this._dragHandleNodes.forEach(node => {
      node.remove()
    })
  }
}

export default {
  initDragHandle,
  onDragMousemoveHandle,
  onDragMouseupHandle,
  createDragHandleNode,
  updateDragHandle
}
