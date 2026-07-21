import { describe, expect, it } from 'vitest';
import { renderOutlineHtml, resolveOutlineKeyAction } from '../src/editor/outline';

const tree = {
  data: { text: '<b>Root</b>', richText: true, uid: 'r' },
  children: [
    { data: { text: 'Child A', uid: 'a' }, children: [] },
  ],
};

describe('editable outline', () => {
  it('renders semantic editable controls while preserving hierarchy metadata', () => {
    const html = renderOutlineHtml(tree, false);
    expect(html).toContain('role="treeitem"');
    expect(html).toContain('data-outline-uid="r"');
    expect(html).toContain('data-outline-root="true"');
    expect(html).toContain('data-outline-editor');
    expect(html).toContain('>Root</textarea>');
    expect(html).not.toContain('readonly');
  });

  it('renders readonly outline controls in readonly mode', () => {
    expect(renderOutlineHtml(tree, true)).toContain('readonly');
  });

  it('maps editing keys to native outline actions', () => {
    expect(resolveOutlineKeyAction({ key: 'Enter', empty: false, isRoot: false, readonly: false })).toBe('insert-sibling');
    expect(resolveOutlineKeyAction({ key: 'Enter', empty: false, isRoot: true, readonly: false })).toBe('insert-child');
    expect(resolveOutlineKeyAction({ key: 'Tab', empty: false, isRoot: false, readonly: false })).toBe('insert-child');
    expect(resolveOutlineKeyAction({ key: 'Tab', empty: false, isRoot: false, readonly: false, shiftKey: true })).toBe('none');
    expect(resolveOutlineKeyAction({ key: 'Backspace', empty: true, isRoot: false, readonly: false })).toBe('remove');
    expect(resolveOutlineKeyAction({ key: 'Delete', empty: true, isRoot: false, readonly: false })).toBe('remove');
    expect(resolveOutlineKeyAction({ key: 'Backspace', empty: true, isRoot: true, readonly: false })).toBe('none');
    expect(resolveOutlineKeyAction({ key: 'ArrowUp', empty: false, isRoot: false, readonly: false })).toBe('previous');
    expect(resolveOutlineKeyAction({ key: 'ArrowDown', empty: false, isRoot: false, readonly: false })).toBe('next');
    expect(resolveOutlineKeyAction({ key: 'Escape', empty: false, isRoot: false, readonly: false })).toBe('cancel');
    expect(resolveOutlineKeyAction({ key: 'Enter', empty: false, isRoot: false, readonly: true })).toBe('none');
  });
});
