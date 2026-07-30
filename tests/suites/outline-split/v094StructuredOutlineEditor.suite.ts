import { describe, expect, it, vi } from 'vitest';
import { StructuredOutlineEditorController } from '../../../src/editor/StructuredOutlineEditorController';
import {
  clearNodeClipboard,
  createNodeClipboardPayload,
  nodeClipboardToOutline,
  publishNodeClipboard,
  readNodeClipboard,
} from '../../../src/editor/nodeClipboard';
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

function mount(
  apply = true,
  readonly = false,
  initialTree: MindMapTree = tree(),
  documentId = 'doc-a',
  onPasteNodes?: (targetUid: string, nodes: MindMapTree[]) => boolean,
  onCopyResource = vi.fn(async () => undefined),
) {
  const root = document.createElement('div');
  document.body.appendChild(root);
  let current = structuredClone(initialTree);
  const onApply = vi.fn((next: MindMapTree) => {
    if (apply) current = next;
    return apply;
  });
  const controller = new StructuredOutlineEditorController({
    root,
    getDocumentId: () => documentId,
    getTree: () => current,
    isReadonly: () => readonly,
    onPasteNodes,
    onCopyResource,
    onApply,
    onActivate: vi.fn(),
    onToggle: vi.fn(),
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onSelectionChange: vi.fn(),
    debounceMs: 10_000,
  });
  return { root, controller, onApply, onCopyResource, current: () => current };
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

  it.skip('rolls the DOM projection back when the whole-tree transaction is rejected', () => {
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

  it('applies and removes a visible cloze without losing the selected outline text', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 0, 'a', 5);

    controller.setCloze(true);
    expect(root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-yemind-cloze]')?.textContent).toBe('Alpha');
    expect(String(current().children[0].data.text)).toContain('data-yemind-cloze');

    controller.setCloze(false);
    expect(root.querySelector('[data-outline-uid="a"] [data-yemind-cloze]')).toBeNull();
    expect(String(current().children[0].data.text)).not.toContain('data-yemind-cloze');
    controller.destroy();
    root.remove();
  });

  it('reports cloze as active when a browser full-row selection includes the editor boundary', () => {
    const { root, controller } = mount();
    select(root, 'a', 0, 'a', 5);
    controller.setCloze(true);

    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);

    expect((controller as unknown as { currentFormat(): Record<string, unknown> }).currentFormat())
      .toMatchObject({ cloze: true });
    controller.destroy();
    root.remove();
  });

  it('recognizes and removes a canvas-created style cloze after switching to the outline', () => {
    const initial = tree();
    initial.children[0].data.text = '<span style="background-color: rgb(245, 223, 160); color: transparent;">Alpha</span>';
    initial.children[0].data.richText = true;
    const { root, controller, current } = mount(true, false, initial);
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    const range = document.createRange();
    range.selectNodeContents(editor);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect((controller as unknown as { currentFormat(): Record<string, unknown> }).currentFormat())
      .toMatchObject({ cloze: true });
    controller.setCloze(false);

    expect(editor.textContent).toBe('Alpha');
    expect(editor.innerHTML).not.toContain('transparent');
    expect(String(current().children[0].data.text)).not.toContain('transparent');
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

  it('commits a same-row text edit as a UID patch instead of a whole-tree transaction', () => {
    const { root, controller, onApply, current } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    editor.textContent = 'Alpha updated';
    editor.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: ' updated',
    }));

    expect(controller.flush('same-row-input')).toBe(true);
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0]?.[1]).toMatchObject({
      transaction: 'text',
      patches: [{
        uid: 'a',
        text: 'Alpha updated',
        richText: false,
      }],
    });
    expect(current().children[0].data.text).toBe('Alpha updated');
    controller.destroy();
    root.remove();
  });

  it('commits Shift+Enter as one plain-text patch without changing sibling nodes', () => {
    const initial = tree();
    initial.children[0].data.text = 'Detect ↓ Polling ↓ Configuration ↓ Recovery ↓ L0';
    const { root, controller, onApply, current } = mount(true, false, initial);
    select(root, 'a', 7);

    const event = key(root, 'Enter', { shiftKey: true });

    expect(event.defaultPrevented).toBe(true);
    expect(onApply).toHaveBeenCalledOnce();
    expect(onApply.mock.calls[0]?.[1]).toMatchObject({
      transaction: 'text',
      patches: [{
        uid: 'a',
        text: 'Detect \n↓ Polling ↓ Configuration ↓ Recovery ↓ L0',
        richText: false,
      }],
    });
    expect(current().children[0].data.text).toBe(
      'Detect \n↓ Polling ↓ Configuration ↓ Recovery ↓ L0',
    );
    expect(String(current().children[0].data.text)).not.toContain('<br>');
    expect(current().children[1].data).toMatchObject({ uid: 'b', text: 'Beta' });
    expect(current().children[2].data).toMatchObject({ uid: 'c', text: 'Gamma' });
    controller.destroy();
    root.remove();
  });

  it('normalizes a whitespace-only outline row to one stable empty-node patch', () => {
    const { root, controller, onApply, current } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    editor.innerHTML = '&nbsp; ';
    editor.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'insertText',
      data: ' ',
    }));

    expect(controller.flush('whitespace-row')).toBe(true);
    expect(onApply.mock.calls[0]?.[1]).toMatchObject({
      transaction: 'text',
      patches: [{ uid: 'a', text: '', richText: false }],
    });
    expect(current().children[0].data.text).toBe('');
    expect(current().children).toHaveLength(3);
    controller.destroy();
    root.remove();
  });

  it('treats browser soft line wraps as one inline paragraph instead of new outline nodes', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 5);
    const paste = clipboardEvent('paste', {
      'text/plain': ' 对建链、LTSSM、\n配置空间、AER、EQ、Reset 等比较熟悉',
      'text/html': '<p> 对建链、LTSSM、 配置空间、AER、EQ、Reset 等比较熟悉</p>',
    });
    root.dispatchEvent(paste.event);
    controller.flush('browser-paragraph-paste');

    expect(current().children.map((node) => node.data.text)).toEqual([
      'Alpha 对建链、LTSSM、 配置空间、AER、EQ、Reset 等比较熟悉',
      'Beta',
      'Gamma',
    ]);
    expect(current().children[0].children[0].data.uid).toBe('a1');
    controller.destroy();
    root.remove();
  });

  it('trims clipboard boundary blank lines before committing a browser paragraph', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 0, 'a', 5);
    const paste = clipboardEvent('paste', {
      'text/plain': '\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再\n\n',
      'text/html': '<p>\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再</p>',
    });
    root.dispatchEvent(paste.event);
    controller.flush('browser-boundary-blank-lines');

    expect(current().children[0].data).toMatchObject({
      text: '这表示该计划范围已落地，但不等于 YeMind 后续不会再',
      richText: false,
    });
    expect(current().children).toHaveLength(3);
    controller.destroy();
    root.remove();
  });

  it('removes ChatGPT StartFragment comments before inline paste is stored or rendered', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 0, 'a', 5);
    const paste = clipboardEvent('paste', {
      'text/plain': '梳理 PCIe Bring-up checklist 和 test plan',
      'text/html': '<!--StartFragment--><p>梳理 PCIe Bring-up checklist 和 test plan</p><!--EndFragment-->',
    });
    root.dispatchEvent(paste.event);
    controller.flush('chatgpt-fragment-paste');

    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    expect(editor.textContent).toBe('梳理 PCIe Bring-up checklist 和 test plan');
    expect(editor.innerHTML).not.toContain('StartFragment');
    expect(editor.innerHTML).not.toContain('EndFragment');
    expect(String(current().children[0].data.text)).not.toContain('Fragment');
    controller.destroy();
    root.remove();
  });

  it('drops cross-document presentation styles while preserving semantic formatting', () => {
    const sourceTree = tree();
    sourceTree.children[0].data.text = '<p><span style="background-color: rgb(187, 247, 208); color: rgb(21, 128, 61); font-size: 22px"><b>Alpha</b></span></p>';
    sourceTree.children[0].data.richText = true;
    const source = mount(true, false, sourceTree, 'doc-a');
    select(source.root, 'a', 0, 'a', 5);
    const copied = clipboardEvent('copy', {});
    source.root.dispatchEvent(copied.event);

    const destination = mount(true, false, tree(), 'doc-b');
    select(destination.root, 'a', 0, 'a', 5);
    const pasted = clipboardEvent('paste', copied.values);
    destination.root.dispatchEvent(pasted.event);
    destination.controller.flush('cross-document-node-paste');

    const stored = String(destination.current().children[0].data.text);
    expect(stored).toContain('<b>Alpha</b>');
    expect(stored).not.toContain('background');
    expect(stored).not.toContain('color:');
    expect(stored).not.toContain('font-size');
    expect(destination.current().children[0].data.richText).toBe(true);

    source.controller.destroy();
    destination.controller.destroy();
    source.root.remove();
    destination.root.remove();
  });

  it('accepts a hierarchical canvas clipboard in another file without canvas presentation styles', () => {
    clearNodeClipboard();
    const sourceTree = tree().children[0];
    sourceTree.data.fillColor = '#ef4444';
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'canvas-doc',
      sourceSurface: 'canvas',
      nodes: [sourceTree],
    });
    publishNodeClipboard(payload);
    const plain = nodeClipboardToOutline(payload).text;

    const destinationTree = tree();
    destinationTree.children[0].children = [];
    const destination = mount(true, false, destinationTree, 'outline-doc');
    select(destination.root, 'a', 0, 'a', 5);
    const pasted = clipboardEvent('paste', { 'text/plain': plain });
    destination.root.dispatchEvent(pasted.event);
    destination.controller.flush('canvas-to-outline-cross-document');

    expect(destination.current().children[0].data.text).toBe('Alpha');
    expect(destination.current().children[0].data).not.toHaveProperty('fillColor');
    expect(destination.current().children[0].children[0].data.text).toBe('Old child');
    destination.controller.destroy();
    destination.root.remove();
  });

  it('commits node clipboard payloads through one native tree transaction at the caret target', () => {
    clearNodeClipboard();
    const sourceTree = tree().children[0];
    sourceTree.data.fillColor = '#ef4444';
    sourceTree.data.yemindNote = { html: '<p>完整备注</p>', createdAt: 1, updatedAt: 1 };
    const payload = createNodeClipboardPayload({
      sourceDocumentId: 'canvas-doc',
      sourceSurface: 'canvas',
      nodes: [sourceTree],
    });
    publishNodeClipboard(payload);
    const plain = nodeClipboardToOutline(payload).text;
    const onPasteNodes = vi.fn(() => true);

    const destination = mount(true, false, tree(), 'outline-doc', onPasteNodes);
    select(destination.root, 'b', 2);
    const pasted = clipboardEvent('paste', { 'text/plain': plain });
    destination.root.dispatchEvent(pasted.event);

    expect(onPasteNodes).toHaveBeenCalledOnce();
    const [targetUid, pastedNodes] = onPasteNodes.mock.calls[0];
    expect(targetUid).toBe('b');
    expect(pastedNodes[0].data).not.toHaveProperty('uid');
    expect(pastedNodes[0].data).not.toHaveProperty('fillColor');
    expect(pastedNodes[0].data.yemindNote).toMatchObject({ html: '<p>完整备注</p>' });
    expect(pastedNodes[0].children[0].data.text).toBe('Old child');
    expect(destination.onApply).not.toHaveBeenCalled();

    destination.controller.destroy();
    destination.root.remove();
  });

  it('copies the active outline block structurally when the caret is collapsed', () => {
    clearNodeClipboard();
    const source = mount(true, false, tree(), 'outline-source');
    select(source.root, 'a', 2);
    const copied = clipboardEvent('copy', {});

    source.root.dispatchEvent(copied.event);

    expect(copied.event.defaultPrevented).toBe(true);
    expect(copied.values['text/plain']).toContain('Alpha');
    const payload = readNodeClipboard();
    expect(payload?.sourceSurface).toBe('outline');
    expect(payload?.nodes).toHaveLength(1);
    expect(payload?.nodes[0].data.text).toBe('Alpha');
    expect(payload?.nodes[0].children[0].data.text).toBe('Old child');

    source.controller.destroy();
    source.root.remove();
  });

  it('clears a previous node payload when copy comes from a partial outline text selection', () => {
    clearNodeClipboard();
    publishNodeClipboard(createNodeClipboardPayload({
      sourceDocumentId: 'old-map',
      sourceSurface: 'canvas',
      nodes: [{ data: { uid: 'old-node', text: 'Al' }, children: [] }],
    }));
    const source = mount(true, false, tree(), 'outline-map');
    select(source.root, 'a', 0, 'a', 2);
    const copied = clipboardEvent('copy', {});

    source.root.dispatchEvent(copied.event);

    expect(copied.values['text/plain']).toBe('Al');
    expect(readNodeClipboard()).toBeNull();
    source.controller.destroy();
    source.root.remove();
  });

  it('forces a history projection over dirty focused DOM after Undo restores the model', () => {
    const { root, controller } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    editor.textContent = '';
    editor.dispatchEvent(new InputEvent('input', {
      bubbles: true,
      inputType: 'deleteContentBackward',
    }));
    expect(controller.isDirty).toBe(true);

    const restored = tree();
    restored.children[0].data.text = 'Alpha restored by undo';
    controller.syncFromTree(restored, { source: 'history' });

    expect(editor.textContent).toBe('Alpha restored by undo');
    expect(controller.isDirty).toBe(false);
    controller.destroy();
    root.remove();
  });

  it('deletes selected pasted text without retaining hidden paragraph whitespace', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 0, 'a', 5);
    const paste = clipboardEvent('paste', {
      'text/plain': '\n\nPages 部署均通过',
      'text/html': '<p>\n\nPages 部署均通过</p>',
    });
    root.dispatchEvent(paste.event);
    controller.flush('paste-before-delete');

    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    select(root, 'a', 0, 'a', editor.textContent?.length ?? 0);
    document.dispatchEvent(new Event('selectionchange'));
    const event = key(root, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(current().children[0].data).toMatchObject({ text: '', richText: false });
    expect(editor.innerHTML).toBe('');
    controller.destroy();
    root.remove();
  });

  it('restores the last valid outline range so Delete behaves like a text editor after toolbar focus', () => {
    const { root, controller, current } = mount();
    select(root, 'a', 1, 'a', 4);
    document.dispatchEvent(new Event('selectionchange'));
    window.getSelection()?.removeAllRanges();

    const event = key(root, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(current().children[0].data.text).toBe('Aa');
    expect(current().children[0].data.uid).toBe('a');
    controller.destroy();
    root.remove();
  });

  it('deletes a right-to-left text range saved while the pointer still ends inside text', () => {
    const { root, controller, current } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    editor.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    select(root, 'a', 1, 'a', 5);
    document.dispatchEvent(new Event('selectionchange'));
    editor.dispatchEvent(new Event('pointerup', { bubbles: true }));
    window.getSelection()?.removeAllRanges();

    const event = key(root, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(current().children[0].data.text).toBe('A');
    controller.destroy();
    root.remove();
  });

  it('deletes a saved text range when a fast reverse drag ends over the left outline grip', () => {
    const { root, controller, current } = mount();
    const editor = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-editor]')!;
    const grip = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-drag-handle]')!;
    editor.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    const [endNode, endOffset] = pointAt(editor, 5);
    const range = document.createRange();
    range.setStartBefore(grip);
    range.setEnd(endNode, endOffset);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event('selectionchange'));
    grip.dispatchEvent(new Event('pointerup', { bubbles: true }));

    const event = key(root, 'Delete');

    expect(event.defaultPrevented).toBe(true);
    expect(current().children[0].data.text).toBe('');
    controller.destroy();
    root.remove();
  });

  it.each([
    ['leaf square', 'a1', '.ymz-outline-row__leaf-square'],
    ['rainbow branch marker', 'a', '.ymz-outline-row__branch'],
    ['six-dot drag handle', 'a', '[data-outline-drag-handle]'],
  ])('deletes a reverse text selection whose pointer ends over the %s', (_label, uid, selector) => {
    const { root, controller, current } = mount();
    const editor = root.querySelector<HTMLElement>(`[data-outline-uid="${uid}"] [data-outline-editor]`)!;
    const target = root.querySelector<HTMLElement>(`[data-outline-uid="${uid}"] ${selector}`)!;
    editor.dispatchEvent(new Event('pointerdown', { bubbles: true }));

    const [textNode, textOffset] = pointAt(editor, editor.textContent?.length ?? 0);
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    if (typeof selection.setBaseAndExtent === 'function') {
      selection.setBaseAndExtent(textNode, textOffset, target.parentNode ?? target, 0);
    } else {
      const range = document.createRange();
      range.setStartBefore(target);
      range.setEnd(textNode, textOffset);
      selection.addRange(range);
    }
    document.dispatchEvent(new Event('selectionchange'));
    target.dispatchEvent(new Event('pointerup', { bubbles: true }));

    const event = key(root, 'Backspace');

    expect(event.defaultPrevented).toBe(true);
    const edited = uid === 'a1' ? current().children[0].children[0] : current().children[0];
    expect(edited.data.text).toBe('');
    controller.destroy();
    root.remove();
  });

  it('clears a selected outline image when another editing surface takes ownership', () => {
    const { root, controller, current } = mount();
    current().children[0].data.image = 'data:image/png;base64,AAAA';
    controller.syncFromTree(current(), true);
    const image = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-image-action]')!;

    image.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    expect(image.classList.contains('is-selected')).toBe(true);

    (controller as any).clearMediaSelection?.();

    expect(image.classList.contains('is-selected')).toBe(false);
    controller.destroy();
    root.remove();
  });

  it('copies a selected outline image instead of the owning node on Ctrl+C', () => {
    const { root, controller, current, onCopyResource } = mount();
    current().children[0].data.image = 'data:image/png;base64,AAAA';
    current().children[0].data.imageTitle = '流程图片';
    controller.syncFromTree(current(), true);
    const image = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-image-action]')!;

    image.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }));
    const copy = key(root, 'c', { ctrlKey: true });

    expect(copy.defaultPrevented).toBe(true);
    expect(onCopyResource).toHaveBeenCalledWith({
      kind: 'image',
      source: 'data:image/png;base64,AAAA',
      title: '流程图片',
    });
    controller.destroy();
    root.remove();
  });

  it('freezes a directly right-clicked outline image for the context menu copy action', () => {
    const onContextMenu = vi.fn();
    const { root, controller, current } = mount();
    (controller as any).options.onContextMenu = onContextMenu;
    current().children[0].data.image = 'data:image/png;base64,AAAA';
    current().children[0].data.imageTitle = '流程图片';
    controller.syncFromTree(current(), true);
    const image = root.querySelector<HTMLElement>('[data-outline-uid="a"] [data-outline-image-action]')!;

    image.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true }));

    expect(controller.getSelectedClipboardResource()).toEqual({
      kind: 'image',
      source: 'data:image/png;base64,AAAA',
      title: '流程图片',
    });
    expect(onContextMenu).toHaveBeenCalled();
    controller.destroy();
    root.remove();
  });
});
