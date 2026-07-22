import { describe, expect, it, vi } from 'vitest';
import { StructuredOutlineEditorController } from '../../../src/editor/StructuredOutlineEditorController';
import type { MindMapTree } from '../../../src/model/types';

function tree(): MindMapTree {
  return {
    data: { uid: 'root', text: 'Root', expand: true, tag: ['root-meta'] },
    children: [
      {
        data: { uid: 'a', text: 'Alpha', expand: true, tag: ['keep-a'] },
        children: [{ data: { uid: 'a1', text: 'Old child', note: 'keep-note' }, children: [] }],
      },
      { data: { uid: 'b', text: 'Beta', expand: false }, children: [{ data: { uid: 'b1', text: 'Hidden' }, children: [] }] },
      { data: { uid: 'c', text: 'Gamma', expand: true }, children: [] },
    ],
  };
}

function pointAt(editor: HTMLElement, offset: number): [Node, number] {
  const walker = document.createTreeWalker(editor, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let node = walker.nextNode();
  let last: Node | null = null;
  while (node) {
    last = node;
    const length = node.nodeValue?.length ?? 0;
    if (remaining <= length) return [node, remaining];
    remaining -= length;
    node = walker.nextNode();
  }
  return last ? [last, last.nodeValue?.length ?? 0] : [editor, 0];
}

function select(root: HTMLElement, startUid: string, start: number, endUid = startUid, end = start): void {
  const editor = (uid: string) => root.querySelector<HTMLElement>(`[data-outline-uid="${uid}"] [data-outline-editor]`)!;
  const [startNode, startOffset] = pointAt(editor(startUid), start);
  const [endNode, endOffset] = pointAt(editor(endUid), end);
  const range = document.createRange();
  range.setStart(startNode, startOffset);
  range.setEnd(endNode, endOffset);
  const selection = window.getSelection()!;
  selection.removeAllRanges();
  selection.addRange(range);
  editor(startUid).dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
}

function key(root: HTMLElement, value: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true, ...init });
  root.dispatchEvent(event);
  return event;
}

function clipboardEvent(type: 'copy' | 'paste', values: Record<string, string>): { event: Event; values: Record<string, string> } {
  const store = { ...values };
  const data = {
    getData: (format: string) => store[format] ?? '',
    setData: (format: string, value: string) => { store[format] = value; },
    items: [],
  };
  const event = new Event(type, { bubbles: true, cancelable: true });
  Object.defineProperty(event, 'clipboardData', { value: data });
  return { event, values: store };
}

function mount(apply = true, readonly = false) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  let current = tree();
  const onApply = vi.fn((next: MindMapTree) => {
    if (apply) current = next;
    return apply;
  });
  const controller = new StructuredOutlineEditorController({
    root,
    getTree: () => current,
    isReadonly: () => readonly,
    onApply,
    onActivate: vi.fn(),
    onToggle: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSelectionChange: vi.fn(),
    debounceMs: 10_000,
  });
  return { root, controller, onApply, current: () => current };
}

describe('v0.9.4 unified structured outline editor', () => {
  it('uses staged Ctrl+A and promotes a cross-node range directly to the whole outline', () => {
    const { root, controller } = mount();
    select(root, 'a', 2);
    key(root, 'a', { ctrlKey: true });
    expect(window.getSelection()?.toString()).toBe('Alpha');
    key(root, 'a', { ctrlKey: true });
    const copied = clipboardEvent('copy', {});
    root.dispatchEvent(copied.event);
    expect(copied.values['text/plain']).toContain('        Hidden');

    select(root, 'a', 1, 'c', 2);
    key(root, 'a', { ctrlKey: true });
    const copiedCross = clipboardEvent('copy', {});
    root.dispatchEvent(copiedCross.event);
    expect(copiedCross.values['text/plain']).toBe(copied.values['text/plain']);
    controller.destroy();
    root.remove();
  });

  it('resets a stale whole-outline state before applying the next current-node Ctrl+A', () => {
    const { root, controller } = mount();
    select(root, 'a', 1);
    key(root, 'a', { ctrlKey: true });
    key(root, 'a', { ctrlKey: true });
    select(root, 'b', 1);
    key(root, 'a', { ctrlKey: true });
    expect(window.getSelection()?.toString()).toBe('Beta');
    controller.destroy();
    root.remove();
  });

  it('replaces the live single-node selection instead of restoring an obsolete whole-outline range', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 2);
    key(root, 'a', { ctrlKey: true });
    key(root, 'a', { ctrlKey: true });
    select(root, 'a', 0, 'a', 5);
    const paste = clipboardEvent('paste', { 'text/plain': 'Omega' });
    root.dispatchEvent(paste.event);
    controller.flush('test-inline');
    expect(current().children[0].data).toMatchObject({ uid: 'a', text: 'Omega', tag: ['keep-a'] });
    expect(current().children[0].children[0].data).toMatchObject({ uid: 'a1', note: 'keep-note' });
    controller.destroy();
    root.remove();
  });

  it('keeps the reused node subtree when multiline paste also creates siblings', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 1);
    key(root, 'a', { ctrlKey: true });
    const paste = clipboardEvent('paste', { 'text/plain': 'Parent\n    New child\nSibling' });
    root.dispatchEvent(paste.event);
    expect(current().children.map((node) => node.data.text)).toEqual(['Parent', 'Sibling', 'Beta', 'Gamma']);
    expect(current().children[0].data).toMatchObject({ uid: 'a', tag: ['keep-a'] });
    expect(current().children[0].children.map((node) => node.data.text)).toEqual(['New child', 'Old child']);
    expect(current().children[0].children[1].data).toMatchObject({ uid: 'a1', note: 'keep-note' });
    expect(controller.isDirty).toBe(false);
    controller.destroy();
    root.remove();
  });

  it('rolls the DOM projection back when the whole-tree transaction is rejected', () => {
    const { root, controller, onApply } = mount(false);
    select(root, 'a', 1);
    key(root, 'a', { ctrlKey: true });
    const paste = clipboardEvent('paste', { 'text/plain': 'Rejected\n    Child' });
    root.dispatchEvent(paste.event);
    expect(onApply).toHaveBeenCalledOnce();
    expect(root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')?.textContent).toBe('Alpha');
    expect(root.textContent).not.toContain('Rejected');
    controller.destroy();
    root.remove();
  });

  it('keeps staged selection and copying available in readonly mode without allowing edit commands', () => {
    const { root, controller, onApply } = mount(true, true);
    expect(root.contentEditable).toBe('false');
    expect(root.tabIndex).toBe(0);
    select(root, 'a', 2);
    key(root, 'a', { ctrlKey: true });
    expect(window.getSelection()?.toString()).toBe('Alpha');
    key(root, 'a', { ctrlKey: true });
    const copied = clipboardEvent('copy', {});
    root.dispatchEvent(copied.event);
    expect(copied.values['text/plain']).toContain('        Hidden');
    key(root, 'z', { ctrlKey: true });
    const paste = clipboardEvent('paste', { 'text/plain': 'Blocked' });
    root.dispatchEvent(paste.event);
    expect(onApply).not.toHaveBeenCalled();
    expect(root.textContent).not.toContain('Blocked');
    controller.destroy();
    root.remove();
  });

  it('defers reconciliation during IME composition', () => {
    const { root, controller, onApply } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    editor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }));
    editor.textContent = '输入中';
    editor.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertCompositionText', data: '输入中', isComposing: true }));
    expect(controller.flush('during-ime')).toBe(false);
    expect(onApply).not.toHaveBeenCalled();
    editor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: '输入中' }));
    expect(controller.flush('after-ime')).toBe(true);
    expect(onApply).toHaveBeenCalledOnce();
    controller.destroy();
    root.remove();
  });
});
