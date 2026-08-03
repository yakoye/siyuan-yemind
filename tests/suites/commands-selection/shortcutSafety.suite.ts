import { describe, expect, it, vi } from 'vitest';
import {
  createMindMapShortcutScope,
  disableUpstreamStructuralInsertShortcuts,
  resolveUpstreamShortcutAction,
  shouldBlockUpstreamShortcut,
} from '../../../src/editor/shortcutSafety';

describe('upstream shortcut safety', () => {
  it('blocks mutation shortcuts in readonly mode but keeps copy and view commands', () => {
    expect(shouldBlockUpstreamShortcut('Control+x', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Control+v', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Tab', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Control+c', [], true)).toBe(false);
    expect(shouldBlockUpstreamShortcut('Control+=', [], true)).toBe(false);
    expect(shouldBlockUpstreamShortcut('/', [], true)).toBe(false);
  });

  it('routes destructive shortcuts through the safe-delete adapter', () => {
    expect(resolveUpstreamShortcutAction('Backspace', [{ isRoot: true }], false)).toBe('block');
    expect(resolveUpstreamShortcutAction('Shift+Backspace', [{ isRoot: true }], false)).toBe('block');
    expect(resolveUpstreamShortcutAction('Backspace', [{ isRoot: false }], false)).toBe('safe-delete');
    expect(resolveUpstreamShortcutAction('Delete', [{ isRoot: true }, { isRoot: false }], false)).toBe('safe-delete');
    expect(resolveUpstreamShortcutAction('Control+c', [{ isRoot: false }], false)).toBe('allow');
  });

  it('keeps the boolean compatibility helper aligned with the resolver', () => {
    expect(shouldBlockUpstreamShortcut('Backspace', [{ isRoot: true }], false)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Backspace', [{ isRoot: false }], false)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Control+c', [{ isRoot: false }], false)).toBe(false);
  });

  it('removes upstream Tab and Enter insertion so YeMind owns one focus transaction', () => {
    const removeShortcut = vi.fn();

    disableUpstreamStructuralInsertShortcuts({ removeShortcut });

    expect(removeShortcut.mock.calls).toEqual([
      ['Tab'],
      ['Enter'],
    ]);
  });

  it('scopes upstream shortcuts to the map that owns the active Quill editor', () => {
    const hostA = document.createElement('div');
    const hostB = document.createElement('div');
    const editorA = document.createElement('div');
    const editorB = document.createElement('div');
    editorA.className = 'ql-editor';
    editorB.className = 'ql-editor';
    document.body.append(hostA, hostB, editorA, editorB);

    const scopeA = createMindMapShortcutScope(hostA, () => editorA);
    const scopeB = createMindMapShortcutScope(hostB, () => editorB);
    scopeA.activate();

    const currentEditorEvent = { target: editorB } as unknown as KeyboardEvent;
    expect(scopeA.check(currentEditorEvent)).toBe(false);
    expect(scopeB.check(currentEditorEvent)).toBe(true);

    scopeB.activate();
    const hostOwnedEvent = { target: document.body } as unknown as KeyboardEvent;
    expect(scopeA.check(hostOwnedEvent)).toBe(false);
    expect(scopeB.check(hostOwnedEvent)).toBe(true);

    scopeA.destroy();
    scopeB.destroy();
    hostA.remove();
    hostB.remove();
    editorA.remove();
    editorB.remove();
  });

  it('does not let a broad inactive host capture another map editor', () => {
    const sharedHost = document.createElement('div');
    const mapBHost = document.createElement('div');
    const editorA = document.createElement('div');
    const editorB = document.createElement('div');
    editorA.className = 'smm-richtext-node-edit-wrap';
    editorB.className = 'smm-richtext-node-edit-wrap';
    const editorBRoot = document.createElement('div');
    editorBRoot.className = 'ql-editor';
    editorBRoot.contentEditable = 'true';
    editorB.append(editorBRoot);
    sharedHost.append(mapBHost, editorA, editorB);
    document.body.append(sharedHost);

    const scopeA = createMindMapShortcutScope(sharedHost, () => editorA);
    const scopeB = createMindMapShortcutScope(mapBHost, () => editorB);

    const activeEditorEvent = { target: editorBRoot } as unknown as KeyboardEvent;
    expect(scopeA.check(activeEditorEvent)).toBe(false);
    expect(scopeB.check(activeEditorEvent)).toBe(true);

    scopeA.destroy();
    scopeB.destroy();
    sharedHost.remove();
  });
});
