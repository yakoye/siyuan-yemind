import { describe, expect, it } from 'vitest';
import { flattenOutline, patchOutlineTree, renderOutlineHtml } from '../../../src/editor/outline';

function tree(rootExpand: boolean) {
  return {
    data: { uid: 'root', text: 'Root', expand: rootExpand },
    children: [{
      data: { uid: 'branch', text: 'Branch', expand: true },
      children: [{ data: { uid: 'leaf', text: 'Leaf' }, children: [] }],
    }],
  } as any;
}

describe('root disclosure', () => {
  it('renders a repeatable disclosure control for Root when it has children', () => {
    const host = document.createElement('div');
    host.innerHTML = renderOutlineHtml(tree(true));
    const row = host.querySelector<HTMLElement>('[data-outline-uid="root"]')!;
    const toggle = row.querySelector<HTMLButtonElement>('[data-outline-toggle]')!;
    expect(toggle.textContent).toBe('▾');

    patchOutlineTree(host, tree(false), false, null);
    expect(row.dataset.outlineExpanded).toBe('false');
    expect(toggle.textContent).toBe('▸');
    expect(host.querySelector('[data-outline-uid="branch"]')).toBeNull();

    patchOutlineTree(host, tree(true), false, null);
    expect(row.dataset.outlineExpanded).toBe('true');
    expect(toggle.textContent).toBe('▾');
    expect(host.querySelector('[data-outline-uid="branch"]')).not.toBeNull();
  });

  it('uses persisted Root expand state when flattening the outline', () => {
    expect(flattenOutline(tree(false)).map((row) => row.uid)).toEqual(['root']);
    expect(flattenOutline(tree(false))[0].expanded).toBe(false);
  });
});
