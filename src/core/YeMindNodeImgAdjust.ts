import NodeImgAdjust from 'simple-mind-map/src/plugins/NodeImgAdjust';

export function imageDeleteIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 7h14M9 7V4.8h6V7M8 10v7M12 10v7M16 10v7M6.5 7l.8 13h9.4l.8-13" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

export function imagePreviewIcon(): string {
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="5.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="m14.4 14.4 4.7 4.7M10.5 7.8v5.4M7.8 10.5h5.4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';
}

const BaseNodeImgAdjust = NodeImgAdjust as any;

export default class YeMindNodeImgAdjust extends BaseNodeImgAdjust {
  private pinnedUid = '';

  pin(node: any, img: any): void {
    if (!node || !img || this.mindMap?.opt?.readonly) return;
    this.pinnedUid = String(node?.getData?.('uid') ?? node?.uid ?? '');
    this.node = node;
    this.img = img;
    this.rect = img.rbox?.() ?? null;
    if (this.rect) {
      if (this.isShowHandleEl) this.setHandleElRect();
      else this.showHandleEl();
      this.handleEl?.setAttribute?.('data-yemind-image-pinned', 'true');
    }
  }

  unpin(): void {
    this.pinnedUid = '';
    this.handleEl?.removeAttribute?.('data-yemind-image-pinned');
    if (!this.isMousedown) (BaseNodeImgAdjust.prototype as any).hideHandleEl.call(this);
  }

  hideHandleEl(): void {
    if (this.pinnedUid && !this.isMousedown) return;
    (BaseNodeImgAdjust.prototype as any).hideHandleEl.call(this);
  }

  onNodeImgMousemove(node: any, img: any): void {
    const uid = String(node?.getData?.('uid') ?? node?.uid ?? '');
    const active = Array.isArray(this.mindMap?.renderer?.activeNodeList)
      && this.mindMap.renderer.activeNodeList.includes(node);
    if (!active && this.pinnedUid !== uid) return;
    (BaseNodeImgAdjust.prototype as any).onNodeImgMousemove.call(this, node, img);
  }

  onNodeImgMouseleave(): void {
    if (this.pinnedUid) return;
    (BaseNodeImgAdjust.prototype as any).onNodeImgMouseleave.call(this);
  }

  createResizeBtnEl(): void {
    super.createResizeBtnEl();
    if (!this.handleEl || this.handleEl.querySelector('.ymz-node-image-preview')) return;
    const remove = (this.handleEl as HTMLElement).querySelector<HTMLElement>('.node-image-remove');
    if (remove) {
      remove.setAttribute('role', 'button');
      remove.setAttribute('aria-label', '删除节点图片');
      remove.setAttribute('title', '删除图片');
      remove.setAttribute('tabindex', '0');
      remove.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        remove.click();
      });
    }
    const size = Number(this.mindMap?.opt?.imgResizeBtnSize) || 24;
    const preview = document.createElement('button');
    preview.type = 'button';
    preview.className = 'ymz-node-image-preview';
    preview.setAttribute('aria-label', '放大预览图片');
    preview.title = '放大预览';
    preview.innerHTML = imagePreviewIcon();
    preview.style.cssText = `position:absolute;left:0;top:0;pointer-events:auto;width:${size}px;height:${size}px;display:flex;align-items:center;justify-content:center;border:0;padding:3px;background:rgba(0,0,0,.52);color:#fff;cursor:zoom-in;`;
    preview.addEventListener('mouseenter', () => this.showHandleEl());
    preview.addEventListener('mouseleave', () => { if (!this.isMousedown) this.hideHandleEl(); });
    preview.addEventListener('mousedown', (event) => { event.preventDefault(); event.stopPropagation(); });
    preview.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      this.mindMap.emit('yemind_node_image_preview', this.node);
    });
    this.handleEl.appendChild(preview);
  }
}

(YeMindNodeImgAdjust as any).instanceName = 'nodeImgAdjust';
