import { afterEach, describe, expect, it, vi } from 'vitest';
import { ResourceActionPopover } from '../../../src/editor/resourceActionPopover';
import { RICH_TEXT_ACTIONS } from '../../../src/editor/richTextActions';
import { sanitizeAssociativeLines } from '../../../src/core/relationData';
import { ImageLightbox } from '../../../src/ui/imageLightbox';
import { Menu } from '../../../web/src/siyuanAdapter';

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('v1.3.0 content and menu matrix', () => {
  it.each([
    [1366, 768, 1358, 760],
    [800, 600, 796, 596],
    [390, 844, 388, 842],
  ])('keeps the web context menu inside a %sx%s viewport', (width, height, x, y) => {
    vi.stubGlobal('innerWidth', width);
    vi.stubGlobal('innerHeight', height);
    const menu = new Menu('viewport-test');
    menu.addItem({ label: '编辑' });
    vi.spyOn(menu.element, 'getBoundingClientRect').mockReturnValue({
      x: 0, y: 0, left: 0, top: 0, right: 240, bottom: 360, width: 240, height: 360,
      toJSON: () => ({}),
    });
    menu.open({ x, y });
    expect(Number.parseFloat(menu.element.style.left)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(menu.element.style.top)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(menu.element.style.left) + 240).toBeLessThanOrEqual(width - 8);
    expect(Number.parseFloat(menu.element.style.top) + 360).toBeLessThanOrEqual(height - 8);
    menu.destroy();
  });

  it('offers formula for selected text and exposes identifiable replace/delete media actions', () => {
    expect(RICH_TEXT_ACTIONS).toContainEqual(expect.objectContaining({ id: 'formula', title: '插入公式' }));
    const root = document.createElement('div');
    document.body.append(root);
    const popover = new ResourceActionPopover(root);
    popover.show({
      kind: 'clipart',
      anchorRect: new DOMRect(20, 20, 30, 20),
      onReplace: vi.fn(),
      onDelete: vi.fn(),
    });
    expect(root.querySelector('[data-resource-action="replace"] svg')).not.toBeNull();
    expect(root.querySelector('[data-resource-action="delete"] svg')).not.toBeNull();
    expect(root.querySelector('[data-resource-action="replace"]')?.textContent).toContain('替换');
    expect(root.querySelector('[data-resource-action="delete"]')?.textContent).toContain('删除');
    popover.destroy();
  });

  it('closes image preview by Escape and rejects relations with missing endpoints', () => {
    const root = document.createElement('div');
    document.body.append(root);
    const lightbox = new ImageLightbox(root);
    lightbox.show('data:image/png;base64,AA==', '预览');
    expect(root.querySelector('.ymz-image-lightbox')).not.toBeNull();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(root.querySelector<HTMLElement>('.ymz-image-lightbox')?.hidden).toBe(true);
    lightbox.destroy();

    const sanitized = sanitizeAssociativeLines({
      data: {
        uid: 'a',
        associativeLineTargets: ['b', 'missing'],
        associativeLineText: { b: '有效', missing: '失效' },
      },
      children: [{ data: { uid: 'b', text: '目标' }, children: [] }],
    });
    expect(sanitized.changed).toBe(true);
    expect(sanitized.tree.data.associativeLineTargets).toEqual(['b']);
    expect(sanitized.tree.data.associativeLineText).toEqual({ b: '有效' });
  });
});
