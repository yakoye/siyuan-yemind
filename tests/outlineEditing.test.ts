import { describe, expect, it } from 'vitest';
import { renderOutlineHtml, resolveOutlineKeyAction } from '../src/editor/outline';

const tree = {
  data: { text: '<b>Root</b>', richText: true, uid: 'r', expand: true },
  children: [
    { data: { text: 'Child A', uid: 'a', expand: false }, children: [
      { data: { text: 'Hidden', uid: 'hidden' }, children: [] },
    ] },
  ],
};

describe('editable outline', () => {
  it('renders semantic editable controls while preserving hierarchy metadata', () => {
    const html = renderOutlineHtml(tree, false);
    expect(html).toContain('role="treeitem"');
    expect(html).toContain('data-outline-uid="r"');
    expect(html).toContain('data-outline-root="true"');
    expect(html).toContain('data-outline-expanded="true"');
    expect(html).toContain('data-outline-editor');
    expect(html).toContain('<b>Root</b></div>');
    expect(html).toContain('data-outline-rich-text="true"');
    expect(html).not.toContain('aria-readonly="true"');
  });

  it('hides descendants of collapsed nodes from the continuous outline', () => {
    const html = renderOutlineHtml(tree, false);
    expect(html).toContain('data-outline-uid="a"');
    expect(html).not.toContain('data-outline-uid="hidden"');
  });

  it('renders readonly outline controls in readonly mode', () => {
    expect(renderOutlineHtml(tree, true)).toContain('aria-readonly="true"');
  });

  it('matches official keyboard semantics and ignores IME composition', () => {
    const base = { empty: false, isRoot: false, readonly: false, hasChildren: true, expanded: true, atStart: true, atEnd: true };
    expect(resolveOutlineKeyAction({ ...base, key: 'Enter' })).toBe('insert-sibling');
    expect(resolveOutlineKeyAction({ ...base, key: 'Enter', isRoot: true })).toBe('insert-child');
    expect(resolveOutlineKeyAction({ ...base, key: 'Enter', shiftKey: true })).toBe('hard-break');
    expect(resolveOutlineKeyAction({ ...base, key: 'Tab' })).toBe('indent');
    expect(resolveOutlineKeyAction({ ...base, key: 'Tab', shiftKey: true })).toBe('outdent');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowLeft' })).toBe('collapse');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowRight', expanded: false })).toBe('expand');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowRight', expanded: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Backspace', empty: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Delete', empty: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Escape' })).toBe('cancel');
    expect(resolveOutlineKeyAction({ ...base, key: 'Enter', composing: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'Enter', readonly: true })).toBe('none');
  });

  it('only collapses or expands at the relevant caret boundary', () => {
    const base = { empty: false, isRoot: false, readonly: false, hasChildren: true, expanded: true };
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowLeft', atStart: false, atEnd: true })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowLeft', atStart: true, atEnd: false })).toBe('collapse');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowRight', expanded: false, atStart: true, atEnd: false })).toBe('none');
    expect(resolveOutlineKeyAction({ ...base, key: 'ArrowRight', expanded: false, atStart: false, atEnd: true })).toBe('expand');
  });
});
