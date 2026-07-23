import { describe, expect, it, vi } from 'vitest';
import { imageDeleteIcon, imagePreviewIcon } from '../../../src/core/YeMindNodeImgAdjust';
import YeMindNodeImgAdjust from '../../../src/core/YeMindNodeImgAdjust';
import { createImageDeleteGuard } from '../../../src/core/createMindMap';
import { ImageLightbox, nextImagePreviewScale } from '../../../src/ui/imageLightbox';
import { readFileSync } from 'node:fs';

function fakeMindMap(host: HTMLElement) {
  return {
    opt: {
      imgResizeBtnSize: 24,
      customDeleteBtnInnerHTML: imageDeleteIcon(),
      customInnerElsAppendTo: host,
      beforeDeleteNodeImg: vi.fn(async () => true),
    },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    execCommand: vi.fn(),
  } as any;
}

describe('v0.9.0 node image actions and preview', () => {
  it('uses a trash-can delete symbol and a magnifier preview symbol', () => {
    expect(imageDeleteIcon()).toContain('<svg');
    expect(imageDeleteIcon()).toContain('M5 7h14');
    expect(imageDeleteIcon()).not.toContain('×');
    expect(imagePreviewIcon()).toContain('<circle');
    expect(imagePreviewIcon()).toContain('m14.4 14.4 4.7 4.7');
  });

  it('keeps the image action boxes unchanged while matching trash and magnifier visual weight', () => {
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(css).toContain('.node-img-handle .node-image-remove svg{\n  width:12px!important;\n  height:12px!important;');
    expect(css).toContain('.node-img-handle .ymz-node-image-preview svg{\n  width:12px!important;\n  height:12px!important;');
    expect(css).not.toContain('.node-img-handle .node-image-remove{width:18px');
  });

  it('places preview at the top-left and deletion at the top-right', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const mindMap = fakeMindMap(host);
    const adjust = new (YeMindNodeImgAdjust as any)({ mindMap });
    const node = { uid: 'image-node' };
    adjust.node = node;
    adjust.createResizeBtnEl();

    const preview = host.querySelector<HTMLButtonElement>('.ymz-node-image-preview')!;
    const remove = host.querySelector<HTMLElement>('.node-image-remove')!;
    expect(preview.style.left).toBe('0px');
    expect(preview.style.top).toBe('0px');
    expect(remove.style.right).toBe('0px');
    expect(remove.style.top).toBe('0px');
    expect(remove.getAttribute('aria-label')).toBe('删除节点图片');

    preview.click();
    expect(mindMap.emit).toHaveBeenCalledWith('yemind_node_image_preview', node);
    host.remove();
  });

  it('requires confirmation before the upstream image-delete command may continue', async () => {
    const confirmDelete = vi.fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    const guard = createImageDeleteGuard(confirmDelete);
    expect(await guard({ uid: 'n1' })).toBe(true);
    expect(await guard({ uid: 'n1' })).toBe(false);
    expect(confirmDelete).toHaveBeenCalledTimes(2);
    expect(await createImageDeleteGuard()({ uid: 'n1' })).toBe(false);
  });

  it('opens an in-editor lightbox, zooms with the wheel and closes outside or with Escape', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const lightbox = new ImageLightbox(root);
    lightbox.show('data:image/png;base64,AAAA', 'Diagram');
    const overlay = root.querySelector<HTMLElement>('.ymz-image-lightbox')!;
    const scale = root.querySelector<HTMLElement>('[data-role="scale"]')!;
    expect(overlay.hidden).toBe(false);
    expect(scale.textContent).toBe('100%');
    overlay.dispatchEvent(new WheelEvent('wheel', { deltaY: -100, bubbles: true, cancelable: true }));
    expect(scale.textContent).toBe('112%');
    expect(nextImagePreviewScale(1.12, 100)).toBe(1);

    root.querySelector<HTMLElement>('.ymz-image-lightbox__stage')!.click();
    expect(overlay.hidden).toBe(true);
    lightbox.show('data:image/png;base64,BBBB');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    expect(overlay.hidden).toBe(true);
    lightbox.destroy();
    root.remove();
  });

  it('also confirms removal from the image dialog', () => {
    const source = readFileSync('src/ui/nodeContentDialogs.ts', 'utf8');
    expect(source).toContain("confirm(\n      '删除节点图片'");
    expect(source).toContain("commands.setImage({ url: null });");
  });
});
