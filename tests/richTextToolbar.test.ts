import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from '../src/editor/RichTextToolbar';

function commands() {
  return {
    formatText: vi.fn(),
    clearTextFormat: vi.fn(),
    setCloze: vi.fn(),
  } as any;
}

describe('RichTextToolbar', () => {
  it('shows at a rich-text selection and applies a boolean format without losing the selection', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);

    toolbar.update(true, { left: 100, top: 100, right: 160, bottom: 120, width: 60 }, {});
    const bold = document.body.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!;
    expect(bold.closest('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(false);
    bold.click();
    expect(actions.formatText).toHaveBeenCalledWith({ bold: true });

    toolbar.destroy();
    root.remove();
  });

  it('hides when the selection collapses', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    toolbar.update(false, null, null);
    expect(document.body.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    toolbar.destroy();
    root.remove();
  });
});
