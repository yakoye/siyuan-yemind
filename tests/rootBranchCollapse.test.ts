import { describe, expect, it } from 'vitest';
import { renderOutlineHtml } from '../src/editor/outline';

const tree = {
  data: { uid: 'root', text: 'Root', expand: true },
  children: [{
    data: { uid: 'branch', text: 'Branch', expand: true },
    children: [{ data: { uid: 'leaf', text: 'Leaf' }, children: [] }],
  }],
};

describe('root branch disclosure', () => {
  it('keeps Root itself fixed while allowing its first-level branches to fold', () => {
    const host = document.createElement('div');
    host.innerHTML = renderOutlineHtml(tree as never);
    expect(host.querySelector('[data-outline-uid="root"] [data-outline-toggle]')).toBeNull();
    expect(host.querySelector('[data-outline-uid="branch"] [data-outline-toggle]')).not.toBeNull();
  });
});
