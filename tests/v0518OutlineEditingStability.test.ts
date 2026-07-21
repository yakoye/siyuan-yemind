import { describe, expect, it, vi } from 'vitest';
import { OutlineRichTextController } from '../src/editor/OutlineRichTextController';
import { patchOutlineTree, renderOutlineHtml } from '../src/editor/outline';

function tree(text = 'ABCDE') {
  return { data: { uid: 'root', text, richText: false, expand: true }, children: [] } as any;
}

describe('v0.5.18 outline editing stability', () => {
  it('does not move or blur the active editor during a text-only model patch', () => {
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(tree(), false);
    document.body.appendChild(container);
    const row = container.querySelector<HTMLElement>('[data-outline-uid="root"]')!;
    const host = row.querySelector<HTMLElement>('[data-outline-editor]')!;
    host.tabIndex = 0;
    host.focus();
    expect(document.activeElement).toBe(host);

    patchOutlineTree(container, tree('ABCD'), false, 'root');

    expect(container.querySelector('[data-outline-uid="root"]')).toBe(row);
    expect(document.activeElement).toBe(host);
    container.remove();
  });

  it('keeps one Quill session focused through consecutive Delete-style commits', () => {
    const model = tree();
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(model, false);
    document.body.appendChild(container);
    const host = container.querySelector<HTMLElement>('[data-outline-editor]')!;
    const diagnostics: string[] = [];
    const controller = new OutlineRichTextController({
      root: container,
      isReadonly: () => false,
      onCommit: (_uid, html) => {
        model.data.text = html;
        model.data.richText = true;
        patchOutlineTree(container, model, false, 'root');
        return true;
      },
      onDiagnostic: (action) => diagnostics.push(action),
      onSelectionChange: vi.fn(),
    });

    controller.activate(host, 'root', { placement: 'end' });
    const quill = (controller as any).quill;
    quill.root.focus();
    quill.setSelection(4, 1, 'silent');
    quill.deleteText(4, 1, 'user');
    controller.flush();
    expect(document.activeElement).toBe(quill.root);
    expect(controller.activeHost).toBe(host);

    quill.setSelection(3, 1, 'silent');
    quill.deleteText(3, 1, 'user');
    controller.flush();
    expect(document.activeElement).toBe(quill.root);
    expect(controller.activeHost).toBe(host);
    expect(diagnostics.filter((item) => item === 'editor-destroy')).toHaveLength(0);

    controller.destroy();
    container.remove();
  });

  it('does not recursively commit while a synchronous model update is being applied', () => {
    const root = document.createElement('div');
    const host = document.createElement('div');
    host.dataset.outlineOriginal = encodeURIComponent('<p>Text</p>');
    root.appendChild(host);
    document.body.appendChild(root);
    let controller: OutlineRichTextController;
    const onCommit = vi.fn(() => {
      // A synchronous data_change/render callback may ask the controller to flush again.
      controller.flush();
      return true;
    });
    controller = new OutlineRichTextController({
      root,
      isReadonly: () => false,
      onCommit,
      onSelectionChange: vi.fn(),
    });
    controller.activate(host, 'node');
    const quill = (controller as any).quill;
    quill.insertText(4, '!', 'user');

    controller.flush();

    expect(onCommit).toHaveBeenCalledTimes(1);
    controller.destroy();
    root.remove();
  });
});
