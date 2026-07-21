import { describe, expect, it } from 'vitest';
import {
  flattenOutline,
  patchOutlineTree,
  pruneOutlineCollapsedUids,
  renderOutlineHtml,
  resolveOutlineKeyAction,
} from '../src/editor/outline';

function tree(options: { rootExpand?: boolean; parentExpand?: boolean } = {}) {
  return {
    data: {
      uid: 'root',
      text: 'Root',
      expand: options.rootExpand ?? true,
    },
    children: [
      {
        data: {
          uid: 'parent',
          text: 'Parent',
          expand: options.parentExpand ?? true,
        },
        children: [
          { data: { uid: 'child', text: 'Child' }, children: [] },
        ],
      },
      { data: { uid: 'sibling', text: 'Sibling' }, children: [] },
    ],
  } as any;
}

describe('v0.5.19 empty outline deletion', () => {
  const base = {
    empty: true,
    isRoot: false,
    readonly: false,
    hasChildren: false,
    expanded: true,
    atStart: true,
    atEnd: true,
  };

  it('turns Backspace/Delete into structural deletion only for an empty non-root row', () => {
    expect(resolveOutlineKeyAction({ ...base, key: 'Backspace' })).toBe('delete-empty');
    expect(resolveOutlineKeyAction({ ...base, key: 'Delete' })).toBe('delete-empty');
    expect(resolveOutlineKeyAction({ ...base, key: 'Backspace', empty: false })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Delete', isRoot: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Backspace', composing: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Backspace', ctrlKey: true })).toBe('none');
  });
});

describe('v0.5.19 outline-local collapse', () => {
  it('does not inherit the map node expand flag', () => {
    const rows = flattenOutline(tree({ rootExpand: false, parentExpand: false }), new Set());
    expect(rows.map((row) => row.uid)).toEqual(['root', 'parent', 'child', 'sibling']);
    expect(rows.find((row) => row.uid === 'root')?.expanded).toBe(true);
    expect(rows.find((row) => row.uid === 'parent')?.expanded).toBe(true);
  });

  it('hides descendants only through the outline-local collapsed set', () => {
    expect(flattenOutline(tree(), new Set(['parent'])).map((row) => row.uid)).toEqual([
      'root',
      'parent',
      'sibling',
    ]);
    expect(flattenOutline(tree(), new Set(['root'])).map((row) => row.uid)).toEqual([
      'root',
    ]);
  });

  it('keeps the root disclosure button reusable after collapse and expansion', () => {
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(tree(), false, new Set(['root']));
    const rootRow = container.querySelector<HTMLElement>('[data-outline-uid="root"]')!;
    const toggle = rootRow.querySelector<HTMLButtonElement>('[data-outline-toggle]')!;
    expect(toggle.textContent).toBe('▸');
    expect(container.querySelector('[data-outline-uid="parent"]')).toBeNull();

    patchOutlineTree(container, tree(), false, null, new Set());

    expect(container.querySelector('[data-outline-uid="root"]')).toBe(rootRow);
    expect(toggle.textContent).toBe('▾');
    expect(container.querySelector('[data-outline-uid="parent"]')).not.toBeNull();
  });

  it('prunes collapsed UIDs that no longer exist', () => {
    const collapsed = new Set(['parent', 'missing']);
    pruneOutlineCollapsedUids(tree(), collapsed);
    expect([...collapsed]).toEqual(['parent']);
  });
});


describe('v0.5.19 keyboard interception contract', () => {
  it('captures non-editor delete shortcuts before the upstream map shortcut handler', async () => {
    const source = await Promise.all([import('node:fs'), import('node:path')]).then(
      ([{ readFileSync }, { resolve }]) =>
        readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8'),
    );
    expect(source).toContain('addEventListener("keydown", this.onRootKeydown, true)');
    expect(source).toContain('removeEventListener("keydown", this.onRootKeydown, true)');
    expect(source).toContain('this.commands.remove();');
  });
});
