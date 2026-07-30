import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust';
import { resourceActionIcon } from '../ui/resourceActionIcons';
import {
  writeImageResourceToClipboard,
  type ClipboardImageResource,
} from '../editor/clipboardCopyIntent';
import { clearNodeClipboard } from '../editor/nodeClipboard';

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
const CLIPART_SINGLE_CLICK_DELAY = 380;
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

export default class YeMindNodeImgAdjust extends BaseNodeImgAdjust {
  private imageSelected = false;
  private hoverVisible = false;
  private resizeHandle: ImageResizeHandle | null = null;
  private resizeStartPoint = { x: 0, y: 0 };
  private resizeStartRect: ImageResizeRect | null = null;
  private resizeCurrentRect: ImageResizeRect | null = null;
  private clipartClickTimer: number | null = null;
  private refreshFrame: number | null = null;
  private refreshFramesRemaining = 0;
  private selectionFollowFrame: number | null = null;
  private hostResizeObserver: ResizeObserver | null = null;
  private overlayLayer: HTMLElement | null = null;
  private selectedAssetKind: 'image' | 'clipart' = 'image';
  private onImageClickBound: (node: any, img: any, event: MouseEvent) => void;
  private onImageDoubleClickBound: (node: any, event: MouseEvent, img: any) => void;
  private onNodeClickBound: (node: any, event: MouseEvent) => void;
  private onNodeActiveBound: (node: any) => void;
  private onCanvasInteractionBound: () => void;
  private onTranslateBound: () => void;
  private onViewportResizeBound: () => void;
  private onKeydownCaptureBound: (event: KeyboardEvent) => void;

  constructor(options: any) {
    super(options);
    this.onImageClickBound = this.onImageClick.bind(this);
    this.onImageDoubleClickBound = this.onImageDoubleClick.bind(this);
    this.onNodeClickBound = this.onNodeClick.bind(this);
    this.onNodeActiveBound = this.onNodeActive.bind(this);
    this.onCanvasInteractionBound = this.onCanvasInteraction.bind(this);
    this.onTranslateBound = this.onTranslate.bind(this);
    this.onViewportResizeBound = this.onViewportResize.bind(this);
    this.onKeydownCaptureBound = this.onKeydownCapture.bind(this);
    this.bindYeMindEvents();
    this.observeEditorHost();
  }

  private bindYeMindEvents(): void {
    this.mindMap.on('node_img_click', this.onImageClickBound);
    this.mindMap.on('node_img_dblclick', this.onImageDoubleClickBound);
    this.mindMap.on('node_click', this.onNodeClickBound);
    this.mindMap.on('node_active', this.onNodeActiveBound);
    this.mindMap.on('draw_click', this.onCanvasInteractionBound);
    this.mindMap.on('translate', this.onTranslateBound);
    this.mindMap.on('view_data_change', this.onTranslateBound);
    window.addEventListener('resize', this.onViewportResizeBound);
    window.addEventListener('keydown', this.onKeydownCaptureBound, true);
  }

  private unbindYeMindEvents(): void {
    this.mindMap.off('node_img_click', this.onImageClickBound);
    this.mindMap.off('node_img_dblclick', this.onImageDoubleClickBound);
    this.mindMap.off('node_click', this.onNodeClickBound);
    this.mindMap.off('node_active', this.onNodeActiveBound);
    this.mindMap.off('draw_click', this.onCanvasInteractionBound);
    this.mindMap.off('translate', this.onTranslateBound);
    this.mindMap.off('view_data_change', this.onTranslateBound);
    window.removeEventListener('resize', this.onViewportResizeBound);
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
    this.rect = this.readImageViewportRect(img);
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
    this.scheduleRefreshRect(2);
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
    this.handleEl.dataset.assetKind = this.selectedAssetKind;
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
    handle.dataset.toolbarPlacement = 'top';
    handle.style.position = 'absolute';
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
      <button type="button" data-image-action="replace">${resourceActionIcon('replace')}<span>替换</span></button>
      <button type="button" data-image-action="delete">${resourceActionIcon('delete')}<span>删除</span></button>
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
    const target = this.resolveOverlayTarget();
    const overlay = document.createElement('div');
    overlay.className = 'ymz-node-image-overlay-layer';
    overlay.style.position = 'absolute';
    overlay.style.inset = '0';
    overlay.style.overflow = 'hidden';
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '14';
    target.appendChild(overlay);
    overlay.appendChild(handle);
    this.overlayLayer = overlay;
  }

  onMousemove(event: MouseEvent): void {
    if (!this.isMousedown) {
      if (this.imageSelected) this.scheduleRefreshRect();
      return;
    }
    if (!this.resizeStartRect || !this.resizeHandle) return;
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
    if (this.clipartClickTimer !== null) window.clearTimeout(this.clipartClickTimer);
    this.clipartClickTimer = null;
    this.cancelScheduledRefresh();
    this.stopSelectionFollow();
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = null;
    this.unbindYeMindEvents();
    super.beforePluginRemove();
    this.handleEl?.remove?.();
    this.handleEl = null;
    this.overlayLayer?.remove();
    this.overlayLayer = null;
  }

  beforePluginDestroy(): void {
    if (this.clipartClickTimer !== null) window.clearTimeout(this.clipartClickTimer);
    this.clipartClickTimer = null;
    this.cancelScheduledRefresh();
    this.stopSelectionFollow();
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = null;
    this.unbindYeMindEvents();
    super.beforePluginDestroy();
    this.handleEl?.remove?.();
    this.handleEl = null;
    this.overlayLayer?.remove();
    this.overlayLayer = null;
  }

  private onImageClick(node: any, img: any, event: MouseEvent): void {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!node || !img) return;
    const kind = node.getData?.('yemindClipartId') ? 'clipart' : 'image';
    this.selectImage(node, img, kind);
    if (kind === 'clipart') {
      if (this.clipartClickTimer !== null) window.clearTimeout(this.clipartClickTimer);
      this.clipartClickTimer = null;
      if (event?.detail > 1) return;
      this.clipartClickTimer = window.setTimeout(() => {
        this.clipartClickTimer = null;
        this.mindMap.emit('yemind_node_clipart_edit', node, event, img);
      }, CLIPART_SINGLE_CLICK_DELAY);
      return;
    }
    this.mindMap.emit('yemind_node_image_selected', node);
  }

  private selectImage(node: any, img: any, kind: 'image' | 'clipart'): void {
    this.node = node;
    this.img = img;
    this.rect = this.readImageViewportRect(img);
    if (!this.rect) return;
    this.selectedAssetKind = kind;
    this.imageSelected = true;
    this.hoverVisible = false;
    this.showHandleEl();
    if (this.handleEl) this.handleEl.dataset.assetKind = kind;
    this.setMode('selected');
    this.startSelectionFollow();
  }

  private onImageDoubleClick(node: any, event: MouseEvent, img: any): void {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (!node) return;
    if (this.clipartClickTimer !== null) window.clearTimeout(this.clipartClickTimer);
    this.clipartClickTimer = null;
    if (img) this.selectImage(node, img, node.getData?.('yemindClipartId') ? 'clipart' : 'image');
    this.mindMap.emit('yemind_node_image_preview', node);
  }

  private onNodeClick(): void {
    this.closeImageSelection();
  }

  private onNodeActive(node: any): void {
    if (this.imageSelected && node && node !== this.node) this.closeImageSelection();
  }

  private clipboardResourceForNode(node: any): ClipboardImageResource | null {
    if (!node) return null;
    const source = String(node.getData?.('image') ?? '').trim();
    if (!source) return null;
    return {
      kind: node.getData?.('yemindClipartId') ? 'clipart' : 'image',
      source,
      title: String(node.getData?.('imageTitle') ?? '').trim(),
    };
  }

  getSelectedClipboardResource(): ClipboardImageResource | null {
    return this.imageSelected ? this.clipboardResourceForNode(this.node) : null;
  }

  getClipboardResourceForTarget(
    target: EventTarget | null,
    node: any = this.node,
  ): ClipboardImageResource | null {
    if (!node || !target) return null;
    const element = target instanceof Element ? target : null;
    const nodeImage = node?._imgData?.node?.node;
    const renderedImage = nodeImage instanceof Element
      ? nodeImage
      : node === this.node && this.img?.node instanceof Element
        ? this.img.node
        : null;
    const frame = node === this.node ? this.handleEl : null;
    const directlyTargetsImage = Boolean(
      renderedImage && element && (element === renderedImage || renderedImage.contains(element)),
    );
    const directlyTargetsFrame = Boolean(
      frame && element && (element === frame || frame.contains(element)),
    );
    return directlyTargetsImage || directlyTargetsFrame
      ? this.clipboardResourceForNode(node)
      : null;
  }

  private onCanvasInteraction(): void {
    this.closeImageSelection();
  }

  private onTranslate(): void {
    this.scheduleRefreshRect();
  }

  private onViewportResize(): void {
    // Window snapping, side-panel changes and host reflow can move the SVG
    // for several frames after the first resize event. Keep measuring until
    // the short layout transition settles instead of pinning the overlay to
    // an intermediate viewport rectangle.
    this.scheduleRefreshRect(12);
  }

  private observeEditorHost(): void {
    const host = this.mindMap.opt.customInnerElsAppendTo;
    if (!(host instanceof Element) || typeof ResizeObserver === 'undefined') return;
    this.hostResizeObserver = new ResizeObserver(() => {
      this.scheduleRefreshRect(12);
    });
    this.hostResizeObserver.observe(host);
  }

  private onKeydownCapture(event: KeyboardEvent): void {
    if (!this.imageSelected || this.mindMap.opt.readonly) return;
    const host = this.mindMap.opt.customInnerElsAppendTo;
    if (host instanceof Element && !host.isConnected) return;
    const editor = this.handleEl?.closest?.('.ymz-editor') as HTMLElement | null;
    if (editor && editor.getClientRects().length === 0) return;
    const target = event.target as HTMLElement | null;
    const editableTarget = Boolean(target?.closest?.('input,textarea,select,[contenteditable="true"],.ql-editor'));
    const command = event.ctrlKey || event.metaKey;
    if (command && !event.altKey && event.key.toLowerCase() === 'c' && !editableTarget) {
      const resource = this.getSelectedClipboardResource();
      if (!resource) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation?.();
      clearNodeClipboard();
      void writeImageResourceToClipboard(resource);
      return;
    }
    if (event.key !== 'Delete' && event.key !== 'Backspace') return;
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (editableTarget) return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    void this.deleteSelectedImage();
  }

  private startResize(direction: ImageResizeHandle, event: MouseEvent): void {
    if (!this.imageSelected || this.mindMap.opt.readonly || !this.img || !this.node) return;
    this.rect = this.readImageViewportRect(this.img) ?? this.rect;
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
    const hostRect = this.readOverlayHostViewportRect();
    const localLeft = rect.left - hostRect.left;
    const localTop = rect.top - hostRect.top;
    this.handleEl.style.left = `${localLeft}px`;
    this.handleEl.style.top = `${localTop}px`;
    this.handleEl.style.width = `${rect.width}px`;
    this.handleEl.style.height = `${rect.height}px`;
    const intersectsViewport = hostRect.width <= 0
      || hostRect.height <= 0
      || (
        localLeft + rect.width > 0
        && localTop + rect.height > 0
        && localLeft < hostRect.width
        && localTop < hostRect.height
      );
    this.handleEl.style.visibility = intersectsViewport ? 'visible' : 'hidden';
    this.positionFloatingImageControls({
      left: localLeft,
      top: localTop,
      width: rect.width,
      height: rect.height,
    }, hostRect);
  }

  private readOverlayHostViewportRect(): { left: number; top: number; width: number; height: number } {
    const overlay = this.overlayLayer ?? this.handleEl?.parentElement;
    const overlayRect = overlay?.getBoundingClientRect?.();
    const fallbackHost = overlay?.parentElement ?? this.mindMap.opt.customInnerElsAppendTo;
    const fallbackRect = fallbackHost?.getBoundingClientRect?.();
    const rect = Number(overlayRect?.width) > 0 && Number(overlayRect?.height) > 0
      ? overlayRect
      : fallbackRect;
    const left = Number(rect?.left ?? rect?.x);
    const top = Number(rect?.top ?? rect?.y);
    const width = Number(rect?.width);
    const height = Number(rect?.height);
    return {
      left: Number.isFinite(left) ? left : 0,
      top: Number.isFinite(top) ? top : 0,
      width: Number.isFinite(width) && width > 0 ? width : 0,
      height: Number.isFinite(height) && height > 0 ? height : 0,
    };
  }

  private resolveOverlayTarget(): HTMLElement {
    const configuredHost = this.mindMap.opt.customInnerElsAppendTo as HTMLElement | null | undefined;
    const editor = configuredHost?.matches?.('.ymz-editor')
      ? configuredHost
      : configuredHost?.closest?.<HTMLElement>('.ymz-editor');
    const canvas = editor?.querySelector<HTMLElement>('[data-role="canvas"]');
    const mapElement = this.mindMap.el as HTMLElement | null | undefined;
    return canvas ?? mapElement ?? configuredHost ?? document.body;
  }

  private positionFloatingImageControls(
    image: ImageResizeRect,
    viewport: { width: number; height: number },
  ): void {
    if (!this.handleEl) return;
    const toolbar = this.handleEl.querySelector('.ymz-node-image-toolbar') as HTMLElement | null;
    const remove = this.handleEl.querySelector('.ymz-node-image-delete') as HTMLElement | null;
    const margin = 8;
    const gap = 6;

    if (toolbar) {
      const measured = toolbar.getBoundingClientRect();
      const toolbarWidth = finitePositive(measured.width, 128);
      const toolbarHeight = finitePositive(measured.height, 44);
      const centeredLeft = image.left + image.width / 2 - toolbarWidth / 2;
      const toolbarLeft = viewport.width > 0
        ? clamp(centeredLeft, margin, Math.max(margin, viewport.width - toolbarWidth - margin))
        : centeredLeft;
      const above = image.top - toolbarHeight - gap;
      const below = image.top + image.height + gap;
      let toolbarTop = above;
      let placement: 'top' | 'bottom' | 'clamped' = 'top';
      if (viewport.height > 0 && above < margin) {
        if (below + toolbarHeight <= viewport.height - margin) {
          toolbarTop = below;
          placement = 'bottom';
        } else {
          toolbarTop = clamp(
            image.top + (image.height - toolbarHeight) / 2,
            margin,
            Math.max(margin, viewport.height - toolbarHeight - margin),
          );
          placement = 'clamped';
        }
      }
      this.handleEl.dataset.toolbarPlacement = placement;
      toolbar.style.left = `${toolbarLeft - image.left}px`;
      toolbar.style.top = `${toolbarTop - image.top}px`;
      toolbar.style.right = 'auto';
      toolbar.style.bottom = 'auto';
      toolbar.style.transform = 'none';
    }

    if (remove && viewport.width > 0 && viewport.height > 0) {
      const size = finitePositive(remove.getBoundingClientRect().width, 18);
      const centerX = clamp(image.left + image.width, size / 2, viewport.width - size / 2);
      const centerY = clamp(image.top, size / 2, viewport.height - size / 2);
      remove.style.left = `${centerX - image.left - size / 2}px`;
      remove.style.top = `${centerY - image.top - size / 2}px`;
      remove.style.right = 'auto';
    }
  }

  private setMode(mode: 'hidden' | 'hover' | 'selected'): void {
    if (!this.handleEl) return;
    this.handleEl.dataset.mode = mode;
  }

  private refreshRect(): void {
    if (!this.img || (!this.imageSelected && !this.hoverVisible) || this.isMousedown) return;
    try {
      this.rect = this.readImageViewportRect(this.img);
    } catch {
      const nextImage = this.node?._imgData?.node;
      if (!nextImage) return;
      this.img = nextImage;
      this.rect = this.readImageViewportRect(nextImage);
    }
    if (!this.rect) return;
    this.showHandleEl();
    this.setMode(this.imageSelected ? 'selected' : 'hover');
  }

  private readImageViewportRect(img: any): any {
    const element = img?.node;
    if (element && typeof element.getBoundingClientRect === 'function') {
      const live = element.getBoundingClientRect();
      const width = Number(live.width);
      const height = Number(live.height);
      const x = Number(live.x ?? live.left);
      const y = Number(live.y ?? live.top);
      if (
        Number.isFinite(x)
        && Number.isFinite(y)
        && Number.isFinite(width)
        && Number.isFinite(height)
        && width > 0
        && height > 0
      ) {
        return {
          x,
          y,
          x2: x + width,
          y2: y + height,
          width,
          height,
        };
      }
    }
    return img?.rbox?.() ?? null;
  }

  private scheduleRefreshRect(frameCount = 1): void {
    this.refreshFramesRemaining = Math.max(
      this.refreshFramesRemaining,
      Math.max(1, Math.floor(frameCount)),
    );
    if (this.refreshFrame !== null) return;
    this.refreshFrame = window.requestAnimationFrame(() => {
      this.refreshFrame = null;
      this.refreshRect();
      this.refreshFramesRemaining -= 1;
      if (this.refreshFramesRemaining > 0) this.scheduleRefreshRect(this.refreshFramesRemaining);
    });
  }

  private cancelScheduledRefresh(): void {
    if (this.refreshFrame !== null) window.cancelAnimationFrame(this.refreshFrame);
    this.refreshFrame = null;
    this.refreshFramesRemaining = 0;
  }

  private startSelectionFollow(): void {
    if (this.selectionFollowFrame !== null) return;
    this.selectionFollowFrame = window.requestAnimationFrame(() => {
      this.selectionFollowFrame = null;
      if (!this.imageSelected) return;
      this.refreshRect();
      this.startSelectionFollow();
    });
  }

  private stopSelectionFollow(): void {
    if (this.selectionFollowFrame !== null) {
      window.cancelAnimationFrame(this.selectionFollowFrame);
    }
    this.selectionFollowFrame = null;
  }

  clearSelectionForViewChange(): void {
    this.isMousedown = false;
    this.closeImageSelection();
  }

  private closeImageSelection(): void {
    if (this.isMousedown) return;
    this.cancelScheduledRefresh();
    this.stopSelectionFollow();
    this.imageSelected = false;
    this.hoverVisible = false;
    this.hideHandleEl(true);
    this.node = null;
    this.img = null;
    this.rect = null;
    this.selectedAssetKind = 'image';
    if (this.handleEl) delete this.handleEl.dataset.assetKind;
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
