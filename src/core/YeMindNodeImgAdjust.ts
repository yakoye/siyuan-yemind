import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust';

export type ImageResizeHandle = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw';

export interface ImageResizeRect {
  left: number;
  top: number;
  width: number;
  height: number;
}

export interface ImageResizeLimits {
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
}

const RESIZE_HANDLES: ImageResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const BaseNodeImgAdjust = NodeImgAdjust as any;

function finitePositive(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function rounded(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Calculates the live image rectangle in viewport coordinates.
 * Corner handles always preserve the current aspect ratio. Edge handles resize
 * one axis freely, unless Shift is held, in which case the opposite edge centre
 * remains anchored while the aspect ratio is preserved.
 */
export function calculateImageResizeRect(
  start: ImageResizeRect,
  handle: ImageResizeHandle,
  deltaX: number,
  deltaY: number,
  shiftKey = false,
  limits: ImageResizeLimits = {},
): ImageResizeRect {
  const startWidth = finitePositive(start.width, 1);
  const startHeight = finitePositive(start.height, 1);
  const minWidth = finitePositive(limits.minWidth, 1);
  const minHeight = finitePositive(limits.minHeight, 1);
  const maxWidth = finitePositive(limits.maxWidth, Number.MAX_SAFE_INTEGER);
  const maxHeight = finitePositive(limits.maxHeight, Number.MAX_SAFE_INTEGER);
  const hasWest = handle.includes('w');
  const hasEast = handle.includes('e');
  const hasNorth = handle.includes('n');
  const hasSouth = handle.includes('s');
  const isCorner = (hasWest || hasEast) && (hasNorth || hasSouth);
  const preserveAspect = isCorner || shiftKey;
  const right = start.left + startWidth;
  const bottom = start.top + startHeight;
  const centerX = start.left + startWidth / 2;
  const centerY = start.top + startHeight / 2;

  if (!preserveAspect) {
    let width = startWidth;
    let height = startHeight;
    if (hasEast) width = clamp(startWidth + deltaX, minWidth, maxWidth);
    if (hasWest) width = clamp(startWidth - deltaX, minWidth, maxWidth);
    if (hasSouth) height = clamp(startHeight + deltaY, minHeight, maxHeight);
    if (hasNorth) height = clamp(startHeight - deltaY, minHeight, maxHeight);
    return {
      left: rounded(hasWest ? right - width : start.left),
      top: rounded(hasNorth ? bottom - height : start.top),
      width: rounded(width),
      height: rounded(height),
    };
  }

  const horizontalScale = hasWest
    ? (startWidth - deltaX) / startWidth
    : hasEast
      ? (startWidth + deltaX) / startWidth
      : 1;
  const verticalScale = hasNorth
    ? (startHeight - deltaY) / startHeight
    : hasSouth
      ? (startHeight + deltaY) / startHeight
      : 1;
  let scale = isCorner
    ? (Math.abs(horizontalScale - 1) >= Math.abs(verticalScale - 1) ? horizontalScale : verticalScale)
    : (hasWest || hasEast ? horizontalScale : verticalScale);
  const minScale = Math.max(minWidth / startWidth, minHeight / startHeight);
  const maxScale = Math.min(maxWidth / startWidth, maxHeight / startHeight);
  scale = clamp(Number.isFinite(scale) ? scale : 1, minScale, maxScale);
  const width = startWidth * scale;
  const height = startHeight * scale;

  let left = start.left;
  let top = start.top;
  if (isCorner) {
    if (hasWest) left = right - width;
    if (hasNorth) top = bottom - height;
  } else if (hasWest || hasEast) {
    if (hasWest) left = right - width;
    top = centerY - height / 2;
  } else {
    if (hasNorth) top = bottom - height;
    left = centerX - width / 2;
  }

  return {
    left: rounded(left),
    top: rounded(top),
    width: rounded(width),
    height: rounded(height),
  };
}

function toolbarIcon(name: 'replace' | 'delete'): string {
  if (name === 'replace') {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7zM4 10V4h6M20 14v6h-6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.8h6V7M8 10v7M12 10v7M16 10v7M6.5 7l.8 13h9.4l.8-13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export default class YeMindNodeImgAdjust extends BaseNodeImgAdjust {
  private imageSelected = false;
  private hoverVisible = false;
  private resizeHandle: ImageResizeHandle | null = null;
  private resizeStartPoint = { x: 0, y: 0 };
  private resizeStartRect: ImageResizeRect | null = null;
  private resizeCurrentRect: ImageResizeRect | null = null;
  private onImageClickBound: (node: any, img: any, event: MouseEvent) => void;
  private onImageDoubleClickBound: (node: any, event: MouseEvent, img: any) => void;
  private onNodeClickBound: (node: any, event: MouseEvent) => void;
  private onNodeActiveBound: (node: any) => void;
  private onCanvasInteractionBound: () => void;
  private onTranslateBound: () => void;
  private onKeydownCaptureBound: (event: KeyboardEvent) => void;

  constructor(options: any) {
    super(options);
    this.onImageClickBound = this.onImageClick.bind(this);
    this.onImageDoubleClickBound = this.onImageDoubleClick.bind(this);
    this.onNodeClickBound = this.onNodeClick.bind(this);
    this.onNodeActiveBound = this.onNodeActive.bind(this);
    this.onCanvasInteractionBound = this.onCanvasInteraction.bind(this);
    this.onTranslateBound = this.onTranslate.bind(this);
    this.onKeydownCaptureBound = this.onKeydownCapture.bind(this);
    this.bindYeMindEvents();
  }

  private bindYeMindEvents(): void {
    this.mindMap.on('node_img_click', this.onImageClickBound);
    this.mindMap.on('node_img_dblclick', this.onImageDoubleClickBound);
    this.mindMap.on('node_click', this.onNodeClickBound);
    this.mindMap.on('node_active', this.onNodeActiveBound);
    this.mindMap.on('draw_click', this.onCanvasInteractionBound);
    this.mindMap.on('svg_mousedown', this.onCanvasInteractionBound);
    this.mindMap.on('translate', this.onTranslateBound);
    window.addEventListener('keydown', this.onKeydownCaptureBound, true);
  }

  private unbindYeMindEvents(): void {
    this.mindMap.off('node_img_click', this.onImageClickBound);
    this.mindMap.off('node_img_dblclick', this.onImageDoubleClickBound);
    this.mindMap.off('node_click', this.onNodeClickBound);
    this.mindMap.off('node_active', this.onNodeActiveBound);
    this.mindMap.off('draw_click', this.onCanvasInteractionBound);
    this.mindMap.off('svg_mousedown', this.onCanvasInteractionBound);
    this.mindMap.off('translate', this.onTranslateBound);
    window.removeEventListener('keydown', this.onKeydownCaptureBound, true);
    window.removeEventListener('mousemove', this.onMousemove, true);
    window.removeEventListener('mouseup', this.onMouseup, true);
  }

  onNodeImgMousemove(node: any, img: any): void {
    if (this.isMousedown || this.isAdjusted) return;
    if (this.imageSelected && this.node?.uid === node?.uid) {
      this.node = node;
      this.img = img;
      this.refreshRect();
      return;
    }
    if (this.imageSelected) return;
    this.node = node;
    this.img = img;
    this.rect = img?.rbox?.() ?? null;
    if (!this.rect) return;
    this.hoverVisible = true;
    this.showHandleEl();
    this.setMode('hover');
  }

  onNodeImgMouseleave(): void {
    if (this.isMousedown || this.imageSelected) return;
    this.hoverVisible = false;
    this.hideHandleEl();
  }

  onScale(): void {
    this.refreshRect();
  }

  onRenderEnd(): void {
    if (this.isMousedown) return;
    if (this.node?.getData?.('image')) {
      const nextImage = this.node?._imgData?.node;
      if (nextImage) this.img = nextImage;
    } else if (this.imageSelected) {
      this.closeImageSelection();
      return;
    }
    this.isAdjusted = false;
    this.refreshRect();
  }

  showHandleEl(): void {
    if (!this.handleEl) this.createResizeBtnEl();
    if (!this.handleEl || !this.rect) return;
    this.setHandleElRect();
    this.handleEl.style.display = 'block';
    this.isShowHandleEl = true;
  }

  hideHandleEl(force = false): void {
    if (this.imageSelected && !force) return;
    if (!this.handleEl) return;
    this.isShowHandleEl = false;
    this.handleEl.style.display = 'none';
    this.handleEl.style.backgroundImage = '';
    this.handleEl.classList.remove('is-resizing');
    this.setMode('hidden');
  }

  setHandleElRect(): void {
    if (!this.handleEl || !this.rect) return;
    const { width, height, x, y } = this.rect;
    this.currentImgWidth = width;
    this.currentImgHeight = height;
    this.applyHandleRect({ left: x, top: y, width, height });
  }

  updateHandleElSize(): void {
    if (!this.handleEl) return;
    const rect = this.resizeCurrentRect ?? {
      left: Number.parseFloat(this.handleEl.style.left) || 0,
      top: Number.parseFloat(this.handleEl.style.top) || 0,
      width: this.currentImgWidth,
      height: this.currentImgHeight,
    };
    this.applyHandleRect(rect);
  }

  createResizeBtnEl(): void {
    if (this.handleEl) return;
    const handle = document.createElement('div');
    handle.className = 'node-img-handle ymz-node-image-frame';
    handle.dataset.mode = 'hidden';
    handle.style.display = 'none';

    RESIZE_HANDLES.forEach((direction) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ymz-node-image-resize-handle';
      button.dataset.handle = direction;
      button.setAttribute('aria-label', `调整图片大小 ${direction}`);
      button.addEventListener('mousedown', (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.startResize(direction, event);
      });
      button.addEventListener('click', (event) => event.stopPropagation());
      handle.appendChild(button);
    });

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'ymz-node-image-delete';
    remove.setAttribute('aria-label', '删除节点图片');
    remove.title = '删除图片';
    remove.textContent = '×';
    remove.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    remove.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      void this.deleteSelectedImage();
    });
    handle.appendChild(remove);

    const toolbar = document.createElement('div');
    toolbar.className = 'ymz-node-image-toolbar';
    toolbar.setAttribute('role', 'toolbar');
    toolbar.setAttribute('aria-label', '图片工具');
    toolbar.innerHTML = `
      <button type="button" data-image-action="replace">${toolbarIcon('replace')}<span>替换</span></button>
      <button type="button" data-image-action="delete">${toolbarIcon('delete')}<span>删除</span></button>
    `;
    toolbar.addEventListener('mousedown', (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    toolbar.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      const action = (event.target as Element | null)?.closest<HTMLElement>('[data-image-action]')?.dataset.imageAction;
      if (action === 'replace') this.replaceSelectedImage();
      if (action === 'delete') void this.deleteSelectedImage();
    });
    handle.appendChild(toolbar);

    this.handleEl = handle;
    const target = this.mindMap.opt.customInnerElsAppendTo || document.body;
    target.appendChild(handle);
  }

  onMousemove(event: MouseEvent): void {
    if (!this.isMousedown || !this.resizeStartRect || !this.resizeHandle) return;
    event.preventDefault();
    const limits = this.resizeLimits();
    const rect = calculateImageResizeRect(
      this.resizeStartRect,
      this.resizeHandle,
      event.clientX - this.resizeStartPoint.x,
      event.clientY - this.resizeStartPoint.y,
      event.shiftKey,
      limits,
    );
    this.resizeCurrentRect = rect;
    this.currentImgWidth = rect.width;
    this.currentImgHeight = rect.height;
    this.applyHandleRect(rect);
  }

  onMouseup(event?: MouseEvent): void {
    if (!this.isMousedown) return;
    event?.preventDefault?.();
    window.removeEventListener('mousemove', this.onMousemove, true);
    window.removeEventListener('mouseup', this.onMouseup, true);
    this.showNodeImage();
    this.handleEl?.classList.remove('is-resizing');

    const current = this.resizeCurrentRect ?? this.resizeStartRect;
    const transform = this.mousedownDrawTransform ?? { scaleX: 1, scaleY: 1 };
    const scaleX = finitePositive(transform.scaleX, 1);
    const scaleY = finitePositive(transform.scaleY, 1);
    if (current && this.node) {
      const newWidth = current.width / scaleX;
      const newHeight = current.height / scaleY;
      const startWidth = finitePositive(this.resizeStartRect?.width, current.width) / scaleX;
      const startHeight = finitePositive(this.resizeStartRect?.height, current.height) / scaleY;
      if (Math.abs(newWidth - startWidth) > 0.5 || Math.abs(newHeight - startHeight) > 0.5) {
        const { image, imageTitle } = this.node.getData();
        this.mindMap.execCommand('SET_NODE_IMAGE', this.node, {
          url: image,
          title: imageTitle,
          width: rounded(newWidth),
          height: rounded(newHeight),
          custom: true,
        });
        this.isAdjusted = true;
      }
    }

    this.isMousedown = false;
    this.resizeHandle = null;
    this.resizeStartRect = null;
    this.resizeCurrentRect = null;
    this.mousedownDrawTransform = null;
    this.setMode('selected');
    requestAnimationFrame(() => this.refreshRect());
  }

  beforePluginRemove(): void {
    this.unbindYeMindEvents();
    super.beforePluginRemove();
    this.handleEl?.remove?.();
    this.handleEl = null;
  }

  beforePluginDestroy(): void {
    this.unbindYeMindEvents();
    super.beforePluginDestroy();
    this.handleEl?.remove?.();
    this.handleEl = null;
  }

  private onImageClick(node: any, img: any, event: MouseEvent): void {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!node || !img) return;
    this.node = node;
    this.img = img;
    this.rect = img.rbox?.() ?? null;
    if (!this.rect) return;
    this.imageSelected = true;
    this.hoverVisible = false;
    this.showHandleEl();
    this.setMode('selected');
    this.mindMap.emit('yemind_node_image_selected', node);
  }

  private onImageDoubleClick(node: any, event: MouseEvent, img: any): void {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!node) return;
    if (img) this.onImageClick(node, img, event);
    this.mindMap.emit('yemind_node_image_preview', node);
  }

  private onNodeClick(): void {
    this.closeImageSelection();
  }

  private onNodeActive(node: any): void {
    if (this.imageSelected && node !== this.node) this.closeImageSelection();
  }

  private onCanvasInteraction(): void {
    this.closeImageSelection();
  }

  private onTranslate(): void {
    this.refreshRect();
  }

  private onKeydownCapture(event: KeyboardEvent): void {
    if (!this.imageSelected || this.mindMap.opt.readonly) return;
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target as HTMLElement | null;
    if (target?.closest?.('input,textarea,select,[contenteditable="true"],.ql-editor')) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    void this.deleteSelectedImage();
  }

  private startResize(direction: ImageResizeHandle, event: MouseEvent): void {
    if (!this.imageSelected || this.mindMap.opt.readonly || !this.img || !this.node) return;
    this.rect = this.img.rbox?.() ?? this.rect;
    if (!this.rect) return;
    this.resizeHandle = direction;
    this.resizeStartPoint = { x: event.clientX, y: event.clientY };
    this.resizeStartRect = {
      left: this.rect.x,
      top: this.rect.y,
      width: this.rect.width,
      height: this.rect.height,
    };
    this.resizeCurrentRect = { ...this.resizeStartRect };
    this.isMousedown = true;
    this.mousedownDrawTransform = this.mindMap.draw.transform();
    this.hideNodeImage();
    this.handleEl.style.backgroundImage = `url(${this.node.getData('image')})`;
    this.handleEl.classList.add('is-resizing');
    this.mindMap.emit('node_img_adjust_btn_mousedown', this.node);
    window.addEventListener('mousemove', this.onMousemove, true);
    window.addEventListener('mouseup', this.onMouseup, true);
  }

  private resizeLimits(): ImageResizeLimits {
    const transform = this.mousedownDrawTransform ?? this.mindMap.draw.transform();
    const scaleX = finitePositive(transform?.scaleX, 1);
    const scaleY = finitePositive(transform?.scaleY, 1);
    const options = this.mindMap.opt ?? {};
    let maxWidth = finitePositive(options.maxImgResizeWidth, Number.MAX_SAFE_INTEGER);
    let maxHeight = finitePositive(options.maxImgResizeHeight, Number.MAX_SAFE_INTEGER);
    if (options.maxImgResizeWidthInheritTheme) {
      maxWidth = finitePositive(this.mindMap.getThemeConfig?.('imgMaxWidth'), maxWidth);
      maxHeight = finitePositive(this.mindMap.getThemeConfig?.('imgMaxHeight'), maxHeight);
    }
    const directMinWidth = Math.min(finitePositive(options.minImgResizeWidth, 12), 12);
    const directMinHeight = Math.min(finitePositive(options.minImgResizeHeight, 12), 12);
    return {
      minWidth: directMinWidth * scaleX,
      minHeight: directMinHeight * scaleY,
      maxWidth: maxWidth * scaleX,
      maxHeight: maxHeight * scaleY,
    };
  }

  private applyHandleRect(rect: ImageResizeRect): void {
    if (!this.handleEl) return;
    this.handleEl.style.left = `${rect.left}px`;
    this.handleEl.style.top = `${rect.top}px`;
    this.handleEl.style.width = `${rect.width}px`;
    this.handleEl.style.height = `${rect.height}px`;
  }

  private setMode(mode: 'hidden' | 'hover' | 'selected'): void {
    if (!this.handleEl) return;
    this.handleEl.dataset.mode = mode;
  }

  private refreshRect(): void {
    if (!this.img || (!this.imageSelected && !this.hoverVisible) || this.isMousedown) return;
    try {
      this.rect = this.img.rbox();
    } catch {
      const nextImage = this.node?._imgData?.node;
      if (!nextImage) return;
      this.img = nextImage;
      this.rect = nextImage.rbox();
    }
    if (!this.rect) return;
    this.showHandleEl();
    this.setMode(this.imageSelected ? 'selected' : 'hover');
  }

  private closeImageSelection(): void {
    if (this.isMousedown) return;
    this.imageSelected = false;
    this.hoverVisible = false;
    this.hideHandleEl(true);
    this.node = null;
    this.img = null;
    this.rect = null;
  }

  private replaceSelectedImage(): void {
    if (!this.node || this.mindMap.opt.readonly) return;
    const node = this.node;
    this.closeImageSelection();
    this.mindMap.emit('yemind_node_image_replace', node);
  }

  private async deleteSelectedImage(): Promise<void> {
    if (!this.node || this.mindMap.opt.readonly) return;
    const node = this.node;
    let stop = false;
    if (typeof this.mindMap.opt.beforeDeleteNodeImg === 'function') {
      stop = await this.mindMap.opt.beforeDeleteNodeImg(node);
    }
    if (stop) return;
    this.closeImageSelection();
    this.mindMap.execCommand('SET_NODE_IMAGE', node, { url: null });
    this.mindMap.emit('delete_node_img_from_delete_btn', node);
  }
}

(YeMindNodeImgAdjust as any).instanceName = 'nodeImgAdjust';
