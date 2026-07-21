import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from '../../../src/editor/RichTextToolbar';

function commands() {
  return {
    formatText: vi.fn(),
    clearTextFormat: vi.fn(),
    setCloze: vi.fn(),
    toggleInlineCode: vi.fn(),
    getSelectedText: vi.fn(() => 'selected'),
    getSelectedInlineLink: vi.fn(() => ''),
    setInlineLink: vi.fn(),
    getCodeBlock: vi.fn(() => null),
    saveCodeBlock: vi.fn(),
    removeCodeBlockFormat: vi.fn(),
    deleteCodeBlock: vi.fn(),
    insertFormula: vi.fn(),
  } as any;
}

function setup() {
  const root = document.createElement('div');
  root.style.width = '900px';
  root.style.height = '600px';
  document.body.appendChild(root);
  return root;
}

describe('RichTextToolbar', () => {
  it('stays inside the editor stacking context and applies native text formats', () => {
    const root = setup();
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);

    toolbar.update(true, { left: 100, top: 100, right: 160, bottom: 120, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-rich-action="inline-code"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ bold: true });
    expect(actions.toggleInlineCode).toHaveBeenCalledOnce();
    expect(root.querySelector('.ymz-rich-toolbar')).not.toBeNull();
    expect(document.body.children).toContain(root);

    toolbar.destroy();
    root.remove();
  });

  it('opens link and code-block editors with the active formatting target', () => {
    const root = setup();
    const target = commands();
    const onLink = vi.fn();
    const onCodeBlock = vi.fn();
    const toolbar = new RichTextToolbar(root, target, { onLink, onCodeBlock });
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="link"]')!.click();
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="code-block"]')!.click();
    expect(onLink).toHaveBeenCalledWith(target);
    expect(onCodeBlock).toHaveBeenCalledWith(target);
    toolbar.destroy();
    root.remove();
  });

  it('hides when disabled or when the selection collapses', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    toolbar.setEnabled(false);
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    toolbar.destroy();
    root.remove();
  });

  it('keeps the toolbar open while a select control temporarily owns focus', () => {
    const root = setup();
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    const size = root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
    size.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    toolbar.update(false, null, null);
    expect(root.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(false);
    toolbar.destroy();
    root.remove();
  });

  it('uses a palette with HEX/RGB readouts, reset and native custom color', () => {
    const root = setup();
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});

    expect(root.querySelector('[data-rich-action="clear-color"]')).toBeNull();
    expect(root.querySelector('[data-rich-action="clear-background"]')).toBeNull();
    root.querySelector<HTMLButtonElement>('[data-rich-action="color-menu"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-color-value="#ff4d3d"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ color: '#ff4d3d' });

    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="background-menu"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-color-action="reset"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ background: false });
    expect(root.querySelector('[data-color-action="custom"]')).not.toBeNull();
    expect(root.querySelector('[data-color-action="eyedropper"]')).toBeNull();
    expect(root.querySelector('[data-color-readout="hex"]')?.textContent).toBe('默认');
    expect(root.querySelector('[data-color-readout="rgb"]')?.textContent).toBe('继承节点颜色');

    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, { color: '#ff4d3d' });
    root.querySelector<HTMLButtonElement>('[data-rich-action="color-menu"]')!.click();
    expect(root.querySelector('[data-color-readout="hex"]')?.textContent).toBe('#FF4D3D');
    expect(root.querySelector('[data-color-readout="rgb"]')?.textContent).toBe('RGB(255, 77, 61)');

    toolbar.destroy();
    root.remove();
  });

  it('routes size, font, cloze, clear and formula to the active target', () => {
    const root = setup();
    const actions = commands();
    const onFormula = vi.fn();
    const toolbar = new RichTextToolbar(root, actions, { onFormula });
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});

    const size = root.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
    size.value = '18px';
    size.dispatchEvent(new Event('change', { bubbles: true }));
    const font = root.querySelector<HTMLSelectElement>('[data-rich-field="font"]')!;
    font.value = 'serif';
    font.dispatchEvent(new Event('change', { bubbles: true }));
    root.querySelector<HTMLButtonElement>('[data-rich-action="cloze"]')!.click();
    root.querySelector<HTMLButtonElement>('[data-rich-action="clear"]')!.click();
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});
    root.querySelector<HTMLButtonElement>('[data-rich-action="formula"]')!.click();

    expect(actions.formatText).toHaveBeenCalledWith({ size: '18px' });
    expect(actions.formatText).toHaveBeenCalledWith({ font: 'serif' });
    expect(actions.setCloze).toHaveBeenCalledWith(true);
    expect(actions.clearTextFormat).toHaveBeenCalledOnce();
    expect(onFormula).toHaveBeenCalledWith(actions);

    toolbar.destroy();
    root.remove();
  });
});
