import { describe, expect, it } from 'vitest';
import * as outline from '../src/editor/outline';
import { patchOutlineTree, renderOutlineHtml } from '../src/editor/outline';

function tree(expand: boolean) {
  return {
    data: { uid: 'root', text: 'Root', expand: true },
    children: [{
      data: { uid: 'parent', text: 'Parent', expand },
      children: [{ data: { uid: 'child', text: 'Child' }, children: [] }],
    }],
  } as any;
}

describe('v0.5.18 repeatable outline collapse', () => {
  it('updates the same toggle from expanded to collapsed and back to expanded', () => {
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(tree(true), false);
    const row = container.querySelector<HTMLElement>('[data-outline-uid="parent"]')!;
    const toggle = row.querySelector<HTMLButtonElement>('[data-outline-toggle]')!;

    patchOutlineTree(container, tree(true), false, null, new Set(['parent']));
    expect(container.querySelector('[data-outline-uid="parent"]')).toBe(row);
    expect(toggle.textContent).toBe('▸');
    expect(toggle.disabled).toBe(false);
    expect(container.querySelector('[data-outline-uid="child"]')).toBeNull();

    patchOutlineTree(container, tree(true), false, null, new Set());
    expect(container.querySelector('[data-outline-uid="parent"]')).toBe(row);
    expect(toggle.textContent).toBe('▾');
    expect(toggle.disabled).toBe(false);
    expect(container.querySelector('[data-outline-uid="child"]')).not.toBeNull();
  });

  it('exposes an explicit toggle resolver that always uses the latest expanded state', () => {
    const resolve = (outline as any).resolveOutlineToggleState;
    expect(typeof resolve).toBe('function');
    expect(resolve({ hasChildren: true, expanded: true })).toBe(false);
    expect(resolve({ hasChildren: true, expanded: false })).toBe(true);
    expect(resolve({ hasChildren: false, expanded: false })).toBeNull();
  });
});
