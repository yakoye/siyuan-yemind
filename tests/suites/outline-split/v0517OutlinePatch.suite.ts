import { describe, expect, it } from 'vitest';
import { patchOutlineTree, renderOutlineHtml } from '../../../src/editor/outline';

function make(text: string, childText = 'Child') {
  return {
    data: { text, uid: 'root', richText: false, expand: true },
    children: [{ data: { text: childText, uid: 'child', richText: false }, children: [] }],
  };
}

describe('stable outline patching', () => {
  it('keeps the active row and editor DOM while patching other rows', () => {
    const host = document.createElement('div');
    host.innerHTML = renderOutlineHtml(make('Root'), false);
    const activeRow = host.querySelector<HTMLElement>('[data-outline-uid="root"]')!;
    const activeEditor = activeRow.querySelector<HTMLElement>('[data-outline-editor]')!;
    activeEditor.classList.add('is-editing');
    activeEditor.innerHTML = '<p>Local draft</p>';

    patchOutlineTree(host, make('Root from model', 'Changed child'), false, 'root');

    expect(host.querySelector('[data-outline-uid="root"]')).toBe(activeRow);
    expect(host.querySelector('[data-outline-uid="root"] [data-outline-editor]')).toBe(activeEditor);
    expect(activeEditor.innerHTML).toBe('<p>Local draft</p>');
    expect(host.querySelector('[data-outline-uid="child"] [data-outline-editor]')?.textContent).toBe('Changed child');
  });

  it('removes missing rows and preserves order', () => {
    const host = document.createElement('div');
    host.innerHTML = renderOutlineHtml(make('Root'), false);
    patchOutlineTree(host, { data: { text: 'Root', uid: 'root' }, children: [] }, false, null);
    expect(host.querySelector('[data-outline-uid="child"]')).toBeNull();
    expect(host.children).toHaveLength(1);
  });
});
