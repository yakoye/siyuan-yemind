import { describe, expect, it, vi } from 'vitest';
import { OutlineRichTextController } from '../src/editor/OutlineRichTextController';

describe('OutlineRichTextController', () => {
  it('formats only the selected characters and persists rich HTML through the shared target', async () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    host.dataset.outlineOriginal = encodeURIComponent('<p>Hello world</p>');
    root.appendChild(host);
    document.body.appendChild(root);
    const onCommit = vi.fn(() => true);
    const controller = new OutlineRichTextController({
      root,
      isReadonly: () => false,
      onCommit,
      onSelectionChange: vi.fn(),
    });

    controller.activate(host, 'node-1');
    const quill = (controller as any).quill;
    quill.setSelection(0, 5, 'silent');
    controller.formatText({ bold: true, color: '#ff0000' });
    controller.flush();

    expect(onCommit).toHaveBeenCalledOnce();
    const html = onCommit.mock.calls[0][1];
    expect(html).toContain('<strong');
    expect(html).toContain('color: rgb(255, 0, 0)');
    expect(html).toContain('Hello');
    expect(html).toContain(' world');

    controller.destroy();
    root.remove();
  });

  it('commits an intentionally emptied row without deleting the node structure', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    host.dataset.outlineOriginal = encodeURIComponent('<p>Delete me</p>');
    root.appendChild(host);
    document.body.appendChild(root);
    const onCommit = vi.fn(() => true);
    const controller = new OutlineRichTextController({
      root,
      isReadonly: () => false,
      onCommit,
      onSelectionChange: vi.fn(),
    });

    controller.activate(host, 'node-1');
    const quill = (controller as any).quill;
    quill.setText('');
    expect(controller.flush()).toBe(true);
    expect(onCommit).toHaveBeenCalledWith('node-1', '');

    controller.destroy();
    root.remove();
  });

});
