import { describe, expect, it, vi } from 'vitest';
import { OutlineTextEditorController } from '../../../src/editor/OutlineTextEditorController';
import type { MindMapTree } from '../../../src/model/types';

const tree: MindMapTree = {
  data: { uid: 'root', text: 'Root' },
  children: [{ data: { uid: 'a', text: 'A' }, children: [] }],
};

describe('v0.9.3 continuous outline editor', () => {
  it('applies a pasted multiline document as one whole-tree transaction', () => {
    const textarea = document.createElement('textarea');
    const status = document.createElement('span');
    const onApply = vi.fn(() => true);
    const controller = new OutlineTextEditorController({
      textarea,
      status,
      getTree: () => tree,
      isReadonly: () => false,
      onApply,
      debounceMs: 10_000,
    });
    controller.activate(tree);
    textarea.value = 'Root\n    A\n    B\n        B.1';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(controller.flush('test')).toBe(true);
    expect(onApply).toHaveBeenCalledOnce();
    const next = onApply.mock.calls[0][0];
    expect(next.children.map((node: MindMapTree) => node.data.text)).toEqual(['A', 'B']);
    expect(next.children[1].children[0].data.text).toBe('B.1');
    expect(status.textContent).toContain('已同步');
    controller.destroy();
  });

  it('keeps native multiline selection available and performs Tab indentation', () => {
    const textarea = document.createElement('textarea');
    const controller = new OutlineTextEditorController({
      textarea,
      status: document.createElement('span'),
      getTree: () => tree,
      isReadonly: () => false,
      onApply: () => true,
      debounceMs: 10_000,
    });
    controller.activate(tree);
    textarea.value = 'Root\nA\nB';
    textarea.setSelectionRange(5, textarea.value.length);
    textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }));
    expect(textarea.value).toBe('Root\n    A\n    B');
    expect(textarea.selectionEnd).toBe(textarea.value.length);
    controller.destroy();
  });

  it('does not reconcile partial IME composition and applies after composition ends', () => {
    const textarea = document.createElement('textarea');
    const onApply = vi.fn(() => true);
    const controller = new OutlineTextEditorController({
      textarea,
      status: document.createElement('span'),
      getTree: () => tree,
      isReadonly: () => false,
      onApply,
      debounceMs: 100,
    });
    controller.activate(tree);
    textarea.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    textarea.value = 'Root\n    输入';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    expect(controller.flush('during-composition')).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
    textarea.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }));
    expect(controller.flush('after-composition')).toBe(true);
    expect(onApply).toHaveBeenCalledOnce();
    controller.destroy();
  });

  it('does not overwrite a dirty focused document during an intermediate map event', () => {
    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    const controller = new OutlineTextEditorController({
      textarea,
      status: document.createElement('span'),
      getTree: () => tree,
      isReadonly: () => false,
      onApply: () => true,
      debounceMs: 10_000,
    });
    controller.activate(tree);
    textarea.focus();
    textarea.value = 'Root\n    Draft';
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
    controller.syncFromTree({ data: { uid: 'root', text: 'External' }, children: [] });
    expect(textarea.value).toBe('Root\n    Draft');
    controller.destroy();
    textarea.remove();
  });
});
