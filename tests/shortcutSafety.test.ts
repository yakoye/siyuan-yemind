import { describe, expect, it } from 'vitest';
import { resolveUpstreamShortcutAction, shouldBlockUpstreamShortcut } from '../src/editor/shortcutSafety';

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
});
