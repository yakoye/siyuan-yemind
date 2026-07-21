import { beforeEach, describe, expect, it } from 'vitest';
import { configureNodeDecorations, createNodePostfixContent } from '../src/core/nodeDecorations';

function node(data: Record<string, unknown>) {
  return { getData: (key: string) => data[key] };
}

describe('node decorations settings', () => {
  beforeEach(() => configureNodeDecorations({ showTodoBadge: true, showCommentBadge: true }));

  it('can hide todo and comment badges independently', () => {
    const source = node({
      yemindTodo: { checked: false, text: 'task' },
      yemindComments: [{ id: 'c', text: 'note', createdAt: 1, updatedAt: 1 }],
    });
    configureNodeDecorations({ showTodoBadge: false, showCommentBadge: true });
    expect(createNodePostfixContent(source)?.el.textContent).toBe('批1');
    configureNodeDecorations({ showTodoBadge: true, showCommentBadge: false });
    expect(createNodePostfixContent(source)?.el.textContent).toBe('○');
  });
});
