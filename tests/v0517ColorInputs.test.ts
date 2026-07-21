import { describe, expect, it, vi } from 'vitest';
import { parseEditableColor, presentColor } from '../src/editor/colorPresentation';
import { RichTextToolbar } from '../src/editor/RichTextToolbar';

function target() {
  return {
    formatText: vi.fn(), clearTextFormat: vi.fn(), setCloze: vi.fn(), toggleInlineCode: vi.fn(),
    getSelectedText: vi.fn(() => ''), getSelectedInlineLink: vi.fn(() => ''), setInlineLink: vi.fn(),
    getCodeBlock: vi.fn(() => null), saveCodeBlock: vi.fn(), removeCodeBlockFormat: vi.fn(),
    deleteCodeBlock: vi.fn(), insertFormula: vi.fn(),
  } as any;
}

function mount() {
  const root = document.createElement('div');
  Object.defineProperty(root, 'clientWidth', { value: 900 });
  Object.defineProperty(root, 'clientHeight', { value: 600 });
  document.body.append(root);
  return root;
}

describe('editable color values', () => {
  it('converts HEX and RGB in both directions', () => {
    expect(parseEditableColor('#f43')).toEqual({ hex: '#FF4433', rgb: '255, 68, 51' });
    expect(parseEditableColor('255, 77, 61')).toEqual({ hex: '#FF4D3D', rgb: '255, 77, 61' });
    expect(parseEditableColor('rgb(1, 2, 3)')).toEqual({ hex: '#010203', rgb: '1, 2, 3' });
    expect(parseEditableColor('256, 0, 0')).toBeNull();
    expect(parseEditableColor('#12')).toBeNull();
    expect(presentColor('#ff4d3d')).toEqual({ hex: '#FF4D3D', rgb: 'RGB(255, 77, 61)' });
  });

  it('keeps manual input open, synchronizes both fields and isolates keyboard/input events', () => {
    const root = mount();
    const actions = target();
    const toolbar = new RichTextToolbar(root, actions);
    toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, { color: '#FF4D3D' });
    root.querySelector<HTMLButtonElement>('[data-rich-action="color-menu"]')!.click();

    const hex = root.querySelector<HTMLInputElement>('[data-color-input="hex"]')!;
    const rgb = root.querySelector<HTMLInputElement>('[data-color-input="rgb"]')!;
    expect(hex.value).toBe('#FF4D3D');
    expect(rgb.value).toBe('255, 77, 61');

    const parentKey = vi.fn();
    root.addEventListener('keydown', parentKey);
    hex.focus();
    hex.value = '#00ff80';
    hex.dispatchEvent(new Event('input', { bubbles: true }));
    hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Backspace', bubbles: true }));

    expect(actions.formatText).toHaveBeenCalledWith({ color: '#00FF80' });
    expect(rgb.value).toBe('0, 255, 128');
    expect(root.querySelector<HTMLElement>('.ymz-color-popover')!.hidden).toBe(false);
    expect(parentKey).not.toHaveBeenCalled();

    rgb.value = '999, 1, 2';
    rgb.dispatchEvent(new Event('input', { bubbles: true }));
    expect(rgb.getAttribute('aria-invalid')).toBe('true');
    expect(actions.formatText).toHaveBeenCalledTimes(1);

    hex.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(actions.formatText).toHaveBeenLastCalledWith({ color: '#FF4D3D' });
    expect(root.querySelector<HTMLElement>('.ymz-color-popover')!.hidden).toBe(true);

    toolbar.destroy();
    root.remove();
  });

  it('uses 模糊/取消模糊 and π labels', () => {
    const root = mount();
    const toolbar = new RichTextToolbar(root, target());
    expect(root.querySelector('[data-rich-action="cloze"]')?.textContent).toBe('模糊');
    expect(root.querySelector('[data-rich-action="formula"]')?.textContent).toBe('π');
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2 }, { color: 'transparent', background: '#f5dfa0' });
    expect(root.querySelector('[data-rich-action="cloze"]')?.textContent).toBe('取消模糊');
    toolbar.destroy();
    root.remove();
  });
});
