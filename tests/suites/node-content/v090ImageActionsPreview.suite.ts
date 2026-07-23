import { describe, expect, it, vi } from 'vitest';
import YeMindNodeImgAdjust, { calculateImageResizeRect } from '../../../src/core/YeMindNodeImgAdjust';
import { createImageDeleteGuard } from '../../../src/core/createMindMap';
import { ImageLightbox, nextImagePreviewScale } from '../../../src/ui/imageLightbox';
import { readFileSync } from 'node:fs';

function fakeMindMap(host: HTMLElement) {
  return {
    opt: {
      imgResizeBtnSize: 24,
      customInnerElsAppendTo: host,
      beforeDeleteNodeImg: vi.fn(async () => false),
      minImgResizeWidth: 12,
      minImgResizeHeight: 12,
      maxImgResizeWidth: 1200,
      maxImgResizeHeight: 1200,
      maxImgResizeWidthInheritTheme: false,
      readonly: false,
    },
    draw: { transform: vi.fn(() => ({ scaleX: 1, scaleY: 1 })) },
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    execCommand: vi.fn(),
    getThemeConfig: vi.fn(() => 1200),
  } as any;
}

describe('v0.9.0 node image actions and preview', () => {
  it('uses a direct selection frame with eight resize handles, a close button and replace/delete toolbar', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const mindMap = fakeMindMap(host);
    const adjust = new (YeMindNodeImgAdjust as any)({ mindMap });
    adjust.createResizeBtnEl();

    expect(host.querySelectorAll('.ymz-node-image-resize-handle')).toHaveLength(8);
    expect(host.querySelector('[data-image-action="replace"]')).not.toBeNull();
    expect(host.querySelector('[data-image-action="delete"]')).not.toBeNull();
    expect(host.querySelector('.ymz-node-image-delete')?.textContent).toBe('×');
    expect(host.querySelector('.ymz-node-image-preview')).toBeNull();
    expect(host.querySelector('.node-image-resize')).toBeNull();
    host.remove();
  });

  it('keeps side handles free by default and proportional with Shift while corners are always proportional', () => {
    const start = { left: 100, top: 100, width: 80, height: 40 };
    expect(calculateImageResizeRect(start, 'e', 20, 30, false)).toEqual({
      left: 100,
      top: 100,
      width: 100,
      height: 40,
    });
    expect(calculateImageResizeRect(start, 'e', 20, 30, true)).toEqual({
      left: 100,
      top: 95,
      width: 100,
      height: 50,
    });
    expect(calculateImageResizeRect(start, 'se', 20, 1, false)).toEqual({
      left: 100,
      top: 100,
      width: 100,
      height: 50,
    });
  });

  it('requires confirmation before image deletion may continue', async () => {
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
    expect(source).toContain('commands.setImage({ url: null });');
  });
});
