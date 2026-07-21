import { describe, expect, it, vi } from 'vitest';
import { promoteNodeToPrimary } from '../src/editor/selectionPresentation';

describe('right-click primary node selection', () => {
  it('keeps multi-selection but moves the clicked node to the primary position', () => {
    const a = { id: 'a' };
    const b = { id: 'b' };
    const c = { id: 'c' };
    const renderer = {
      activeNodeList: [a, b, c],
      emitNodeActiveEvent: vi.fn(),
    };

    expect(promoteNodeToPrimary(renderer, c)).toBe(true);
    expect(renderer.activeNodeList).toEqual([c, a, b]);
    expect(renderer.emitNodeActiveEvent).toHaveBeenCalledOnce();
  });
});

import { shouldBlockRootDeleteShortcut } from '../src/editor/selectionPresentation';

describe('root keyboard deletion protection', () => {
  it('blocks destructive delete shortcuts whenever the root is selected', () => {
    expect(shouldBlockRootDeleteShortcut('Backspace', [{ isRoot: true }])).toBe(true);
    expect(shouldBlockRootDeleteShortcut('Delete', [{ isRoot: true }, { isRoot: false }])).toBe(true);
    expect(shouldBlockRootDeleteShortcut('Enter', [{ isRoot: true }])).toBe(false);
    expect(shouldBlockRootDeleteShortcut('Backspace', [{ isRoot: false }])).toBe(false);
  });
});
