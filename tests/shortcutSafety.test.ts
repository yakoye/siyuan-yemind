import { describe, expect, it } from 'vitest';
import { shouldBlockUpstreamShortcut } from '../src/editor/shortcutSafety';

describe('upstream shortcut safety', () => {
  it('blocks mutation shortcuts in readonly mode but keeps copy and view commands', () => {
    expect(shouldBlockUpstreamShortcut('Control+x', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Control+v', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Tab', [], true)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Control+c', [], true)).toBe(false);
    expect(shouldBlockUpstreamShortcut('Control+=', [], true)).toBe(false);
    expect(shouldBlockUpstreamShortcut('/', [], true)).toBe(false);
  });

  it('blocks root destructive deletion in edit mode', () => {
    expect(shouldBlockUpstreamShortcut('Backspace', [{ isRoot: true }], false)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Shift+Backspace', [{ isRoot: true }], false)).toBe(true);
    expect(shouldBlockUpstreamShortcut('Backspace', [{ isRoot: false }], false)).toBe(false);
  });
});
