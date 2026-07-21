import { describe, expect, it, vi } from 'vitest';
import { RichTextToolbar } from '../src/editor/RichTextToolbar';

function commands() {
  return {
    formatText: vi.fn(),
    clearTextFormat: vi.fn(),
    setCloze: vi.fn(),
    toggleInlineCode: vi.fn(),
  } as any;
}

describe('RichTextToolbar', () => {
  it('shows at a rich-text selection and applies native text formats', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const actions = commands();
    const toolbar = new RichTextToolbar(root, actions);

    toolbar.update(true, { left: 100, top: 100, right: 160, bottom: 120, width: 60 }, {});
    document.body.querySelector<HTMLButtonElement>('[data-rich-action="bold"]')!.click();
    document.body.querySelector<HTMLButtonElement>('[data-rich-action="inline-code"]')!.click();
    expect(actions.formatText).toHaveBeenCalledWith({ bold: true });
    expect(actions.toggleInlineCode).toHaveBeenCalledOnce();

    toolbar.destroy();
    root.remove();
  });

  it('opens link and code-block editors through focused callbacks', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const onLink = vi.fn();
    const onCodeBlock = vi.fn();
    const toolbar = new RichTextToolbar(root, commands(), { onLink, onCodeBlock });
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    document.body.querySelector<HTMLButtonElement>('[data-rich-action="link"]')!.click();
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    document.body.querySelector<HTMLButtonElement>('[data-rich-action="code-block"]')!.click();
    expect(onLink).toHaveBeenCalledOnce();
    expect(onCodeBlock).toHaveBeenCalledOnce();
    toolbar.destroy();
    root.remove();
  });

  it('hides when disabled or when the selection collapses', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const toolbar = new RichTextToolbar(root, commands());
    toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
    toolbar.setEnabled(false);
    expect(document.body.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(true);
    toolbar.destroy();
    root.remove();
  });
});
