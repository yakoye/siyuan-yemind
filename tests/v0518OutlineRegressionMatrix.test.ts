import { describe, expect, it } from 'vitest';
import {
  outlineStructureSignature,
  patchOutlineTree,
  renderOutlineHtml,
  resolveOutlineKeyAction,
} from '../src/editor/outline';

function branch(children: any[], text = 'Parent', expand = true): any {
  return {
    data: { uid: 'root', text: 'Root', expand: true },
    children: [{ data: { uid: 'parent', text, richText: false, expand }, children }],
  };
}

describe('v0.5.18 outline regression matrix', () => {
  it('treats text changes as non-structural but detects collapse and order changes', () => {
    const a = { data: { uid: 'a', text: 'A' }, children: [] };
    const b = { data: { uid: 'b', text: 'B' }, children: [] };
    const initial = branch([a, b]);
    const textOnly = branch([
      { data: { uid: 'a', text: '<b>Changed</b>', richText: true }, children: [] },
      b,
    ], 'Renamed');
    const reordered = branch([b, a]);
    expect(outlineStructureSignature(textOnly)).toBe(outlineStructureSignature(initial));
    expect(outlineStructureSignature(reordered)).not.toBe(outlineStructureSignature(initial));
    expect(outlineStructureSignature(initial, new Set(['parent']))).not.toBe(
      outlineStructureSignature(initial),
    );
  });

  it('routes only an empty non-root row into structural deletion', () => {
    for (const key of ['Backspace', 'Delete']) {
      expect(resolveOutlineKeyAction({ key, empty: false, isRoot: false, readonly: false })).toBe('none');
      expect(resolveOutlineKeyAction({ key, empty: true, isRoot: false, readonly: false })).toBe('delete-empty');
      expect(resolveOutlineKeyAction({ key, empty: true, isRoot: true, readonly: false })).toBe('none');
    }
  });

  it('keeps the active row and focus while siblings are patched around it', () => {
    const a = { data: { uid: 'a', text: 'A' }, children: [] };
    const b = { data: { uid: 'b', text: 'B' }, children: [] };
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(branch([a, b]), false);
    document.body.appendChild(container);
    const activeRow = container.querySelector<HTMLElement>('[data-outline-uid="a"]')!;
    const activeEditor = activeRow.querySelector<HTMLElement>('[data-outline-editor]')!;
    activeEditor.focus();

    patchOutlineTree(container, branch([
      { data: { uid: 'new', text: 'New' }, children: [] },
      { data: { uid: 'a', text: 'Model echo should not overwrite active' }, children: [] },
      b,
    ]), false, 'a');

    expect(container.querySelector('[data-outline-uid="a"]')).toBe(activeRow);
    expect(document.activeElement).toBe(activeEditor);
    expect(activeEditor.textContent).toBe('A');
    container.remove();
  });

  it('uses a noninteractive alignment placeholder for leaf rows', () => {
    const html = renderOutlineHtml({ data: { uid: 'root', text: 'Leaf' }, children: [] } as any, false);
    expect(html).toContain('ymz-outline-row__branch--placeholder');
    expect(html).not.toContain('data-outline-toggle');
    expect(html).not.toContain('>•<');
  });
});
