import { describe, expect, it } from 'vitest';
import {
  addComment,
  editComment,
  removeComment,
  toggleTodo,
  getTodoMenuState,
  normalizeStringList,
} from '../src/content/nodeContentState';

describe('node content state', () => {
  it('toggles todo between pending, completed and absent', () => {
    const pending = toggleTodo(undefined);
    expect(pending).toMatchObject({ checked: false });

    const completed = toggleTodo(pending);
    expect(completed).toMatchObject({ checked: true });

    expect(toggleTodo(completed)).toBeNull();
  });


  it('resolves the direct todo context-menu action for every state', () => {
    expect(getTodoMenuState(undefined)).toEqual({
      label: '添加待办',
      next: { checked: false },
      warning: false,
    });
    expect(getTodoMenuState({ checked: false })).toEqual({
      label: '待办完成',
      next: { checked: true },
      warning: false,
    });
    expect(getTodoMenuState({ checked: true })).toEqual({
      label: '删除待办',
      next: null,
      warning: true,
    });
  });

  it('adds, edits and removes comments without mutating the input', () => {
    const source = [{ id: 'c1', text: 'first', createdAt: 1, updatedAt: 1 }];
    const added = addComment(source, 'second', 2, 'c2');
    expect(source).toHaveLength(1);
    expect(added.map((item) => item.text)).toEqual(['first', 'second']);

    const edited = editComment(added, 'c2', 'changed', 3);
    expect(edited[1]).toMatchObject({ text: 'changed', updatedAt: 3 });

    expect(removeComment(edited, 'c1').map((item) => item.id)).toEqual(['c2']);
  });

  it('normalizes tags and icons by trimming, removing blanks and deduplicating', () => {
    expect(normalizeStringList([' PCIe ', '', 'ATS', 'PCIe', '  '])).toEqual(['PCIe', 'ATS']);
  });
});
