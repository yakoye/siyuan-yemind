import { describe, expect, it } from 'vitest';
import {
  flattenOutline,
  patchOutlineTree,
  renderOutlineHtml,
  resolveOutlineKeyAction,
} from '../../../src/editor/outline';

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

describe('v0.5.20 synchronized outline collapse', () => {
  it('inherits persisted map expansion state', () => {
    const rows = flattenOutline(tree({ rootExpand: true, parentExpand: false }));
    expect(rows.map((row) => row.uid)).toEqual(['root', 'parent', 'sibling']);
    expect(rows.find((row) => row.uid === 'parent')?.expanded).toBe(false);
  });

  it('updates the same disclosure button from persisted data', () => {
    const container = document.createElement('div');
    container.innerHTML = renderOutlineHtml(tree({ parentExpand: false }), false);
    const parentRow = container.querySelector<HTMLElement>('[data-outline-uid="parent"]')!;
    const toggle = parentRow.querySelector<HTMLButtonElement>('[data-outline-toggle]')!;
    expect(toggle.textContent).toBe('▸');
    expect(container.querySelector('[data-outline-uid="child"]')).toBeNull();

    patchOutlineTree(container, tree({ parentExpand: true }), false, null);

    expect(container.querySelector('[data-outline-uid="parent"]')).toBe(parentRow);
    expect(toggle.textContent).toBe('▾');
    expect(container.querySelector('[data-outline-uid="child"]')).not.toBeNull();
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
