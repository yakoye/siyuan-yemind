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

it('keeps the toolbar open while a color or select control temporarily owns focus', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const toolbar = new RichTextToolbar(root, commands());
  toolbar.update(true, { left: 1, top: 1, right: 2, bottom: 2, width: 1 }, {});
  const size = document.body.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
  size.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  toolbar.update(false, null, null);
  expect(document.body.querySelector('.ymz-rich-toolbar')?.hasAttribute('hidden')).toBe(false);
  toolbar.destroy();
  root.remove();
});

it('routes every visible formatting control to the command adapter', () => {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const actions = commands();
  const onFormula = vi.fn();
  const toolbar = new RichTextToolbar(root, actions, { onFormula });
  toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});

  const color = document.body.querySelector<HTMLInputElement>('[data-rich-field="color"]')!;
  color.value = '#123456';
  color.dispatchEvent(new Event('input', { bubbles: true }));
  const background = document.body.querySelector<HTMLInputElement>('[data-rich-field="background"]')!;
  background.value = '#abcdef';
  background.dispatchEvent(new Event('input', { bubbles: true }));
  const size = document.body.querySelector<HTMLSelectElement>('[data-rich-field="size"]')!;
  size.value = '18px';
  size.dispatchEvent(new Event('change', { bubbles: true }));
  const font = document.body.querySelector<HTMLSelectElement>('[data-rich-field="font"]')!;
  font.value = 'serif';
  font.dispatchEvent(new Event('change', { bubbles: true }));
  document.body.querySelector<HTMLButtonElement>('[data-rich-action="cloze"]')!.click();
  document.body.querySelector<HTMLButtonElement>('[data-rich-action="clear"]')!.click();
  toolbar.update(true, { left: 20, top: 20, right: 80, bottom: 40, width: 60 }, {});
  document.body.querySelector<HTMLButtonElement>('[data-rich-action="formula"]')!.click();

  expect(actions.formatText).toHaveBeenCalledWith({ color: '#123456' });
  expect(actions.formatText).toHaveBeenCalledWith({ background: '#abcdef' });
  expect(actions.formatText).toHaveBeenCalledWith({ size: '18px' });
  expect(actions.formatText).toHaveBeenCalledWith({ font: 'serif' });
  expect(actions.setCloze).toHaveBeenCalledWith(true);
  expect(actions.clearTextFormat).toHaveBeenCalledOnce();
  expect(onFormula).toHaveBeenCalledOnce();

  toolbar.destroy();
  root.remove();
});
