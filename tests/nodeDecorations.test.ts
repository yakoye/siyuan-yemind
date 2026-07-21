import { describe, expect, it, vi } from 'vitest';
import { createNodePrefixContent, createNodePostfixContent, YEMIND_ICON_LIST } from '../src/core/nodeDecorations';

describe('node content decorations', () => {
  it('exposes YeMind custom node icons', () => {
    expect(YEMIND_ICON_LIST[0].type).toBe('yemind');
    expect(YEMIND_ICON_LIST[0].list.map((item) => item.name)).toEqual(expect.arrayContaining([
      'star', 'flag', 'question', 'idea', 'check', 'warning',
    ]));
  });

  it('renders todo before the node text and comments after it', () => {
    const emit = vi.fn();
    const values = {
      yemindTodo: { checked: false, text: 'verify link' },
      yemindComments: [{ id: 'c1', text: 'review', createdAt: 1, updatedAt: 1 }],
    };
    const node = {
      getData: (key: keyof typeof values) => values[key],
      mindMap: { emit },
    };

    const prefix = createNodePrefixContent(node);
    const postfix = createNodePostfixContent(node);

    expect(prefix?.el.querySelector('.ymz-node-todo-checkbox')).not.toBeNull();
    expect(prefix?.el.querySelector('.ymz-node-todo-checkbox')?.classList.contains('is-checked')).toBe(false);
    expect(postfix?.el.querySelector('.ymz-node-comment-badge')).not.toBeNull();

    prefix?.el.querySelector<HTMLButtonElement>('.ymz-node-todo-checkbox')?.click();
    expect(emit).toHaveBeenCalledWith('yemind_todo_toggle', node);

    postfix?.el.querySelector<HTMLButtonElement>('.ymz-node-comment-badge')?.click();
    expect(emit).toHaveBeenCalledWith('yemind_badge_click', 'comments', node);
  });
  it('renders a green checked todo state before the node text', () => {
    const node = {
      getData: (key: string) => key === 'yemindTodo' ? { checked: true, text: 'done' } : [],
      mindMap: { emit: vi.fn() },
    };

    const prefix = createNodePrefixContent(node);
    const checkbox = prefix?.el.querySelector<HTMLButtonElement>('.ymz-node-todo-checkbox');
    expect(checkbox?.classList.contains('is-checked')).toBe(true);
    expect(checkbox?.textContent).toBe('✓');
  });

});
