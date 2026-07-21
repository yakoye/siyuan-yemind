import { describe, expect, it } from 'vitest';
import * as outlineDrag from '../src/editor/outlineDrag';
import { renderOutlineHtml } from '../src/editor/outline';

const tree = {
  data: { uid: 'root', text: 'Root', expand: true },
  children: [{ data: { uid: 'a', text: 'A' }, children: [] }],
} as any;

describe('v0.5.18 whole-row pointer drag', () => {
  it('removes the six-dot HTML5 drag handle from every outline row', () => {
    const html = renderOutlineHtml(tree, false);
    expect(html).not.toContain('data-outline-drag-handle');
    expect(html).not.toContain('⋮⋮');
    expect(html).not.toContain('draggable="true"');
    expect(html).toContain('data-outline-drag-source="true"');
  });

  it('starts immediately from row chrome, uses long press for inactive labels, and never drags active text editing', () => {
    const resolve = (outlineDrag as any).shouldStartOutlinePointerDrag;
    expect(typeof resolve).toBe('function');
    expect(resolve({ interactive: true, fromEditor: false, editing: false, elapsedMs: 500, distancePx: 20 })).toBe(false);
    expect(resolve({ interactive: false, fromEditor: false, editing: false, elapsedMs: 20, distancePx: 7 })).toBe(true);
    expect(resolve({ interactive: false, fromEditor: true, editing: false, elapsedMs: 120, distancePx: 10 })).toBe(false);
    expect(resolve({ interactive: false, fromEditor: true, editing: false, elapsedMs: 280, distancePx: 7 })).toBe(true);
    expect(resolve({ interactive: false, fromEditor: true, editing: true, elapsedMs: 500, distancePx: 20 })).toBe(false);
  });

  it('uses horizontal movement to choose child or lower-level placement', () => {
    const resolve = (outlineDrag as any).resolveOutlinePointerDropIntent;
    expect(typeof resolve).toBe('function');
    const base = {
      sourceUid: 'source',
      targetUid: 'target',
      clientY: 120,
      clientX: 120,
      rect: { top: 100, height: 40 },
      targetTextLeft: 120,
      targetDepth: 2,
      indentWidth: 22,
      targetAncestors: [
        { uid: 'root', depth: 0 },
        { uid: 'parent', depth: 1 },
        { uid: 'target', depth: 2 },
      ],
    };

    expect(resolve({ ...base, clientX: 154 })).toEqual({ targetUid: 'target', position: 'inside', desiredDepth: 3 });
    expect(resolve({ ...base, clientX: 120, clientY: 103 })).toEqual({ targetUid: 'target', position: 'before', desiredDepth: 2 });
    expect(resolve({ ...base, clientX: 96, clientY: 138 })).toEqual({ targetUid: 'parent', position: 'after', desiredDepth: 1 });
    expect(resolve({ ...base, clientX: 96, clientY: 120 })).toEqual({ targetUid: 'parent', position: 'after', desiredDepth: 1 });
    expect(resolve({ ...base, sourceUid: 'target' })).toBeNull();
  });
});
