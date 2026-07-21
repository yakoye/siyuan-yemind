import { describe, expect, it, vi } from 'vitest';
import { createNodePrefixContent, createNodePostfixContent, YEMIND_ICON_LIST } from '../../../src/core/nodeDecorations';

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
    const commentIcon = postfix?.el.querySelector('.ymz-node-comment-badge svg');
    expect(commentIcon?.querySelector('path')).not.toBeNull();
    expect(commentIcon?.querySelector('use')).toBeNull();
    expect(commentIcon?.getAttribute('viewBox')).toBe('0 0 24 24');
    expect(postfix?.el.querySelector('.ymz-node-comment-badge')?.hasAttribute('title')).toBe(false);
    expect(postfix?.el.querySelector('.ymz-node-comment-badge')?.getAttribute('aria-label')).toBe('批注');

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

  it('keeps note and comment hover badges free of browser title tooltips', () => {
    const node = {
      getData: (key: string) => key === 'yemindNote'
        ? { html: '<p>Long note</p>', updatedAt: 1 }
        : key === 'yemindComments'
          ? [{ id: 'c1', text: 'Comment', createdAt: 1, updatedAt: 1 }]
          : null,
      mindMap: { emit: vi.fn() },
    };
    const postfix = createNodePostfixContent(node)!;
    const note = postfix.el.querySelector('.ymz-node-note-badge')!;
    const comments = postfix.el.querySelector('.ymz-node-comment-badge')!;
    expect(note.hasAttribute('title')).toBe(false);
    expect(comments.hasAttribute('title')).toBe(false);
    expect(note.getAttribute('aria-label')).toBe('备注');
    expect(comments.getAttribute('aria-label')).toBe('批注');
  });

});
