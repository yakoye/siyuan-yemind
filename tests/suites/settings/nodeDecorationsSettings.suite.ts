import { beforeEach, describe, expect, it } from 'vitest';
import {
  configureNodeDecorations,
  createNodePrefixContent,
  createNodePostfixContent,
} from '../../../src/core/nodeDecorations';

function node(data: Record<string, unknown>) {
  return { getData: (key: string) => data[key] };
}

describe('node decorations settings', () => {
  beforeEach(() => configureNodeDecorations({ showTodoBadge: true, showCommentBadge: true }));

  it('can hide todo and comment decorations independently', () => {
    const source = node({
      yemindTodo: { checked: false, text: 'task' },
      yemindComments: [{ id: 'c', text: 'note', createdAt: 1, updatedAt: 1 }],
    });

    configureNodeDecorations({ showTodoBadge: false, showCommentBadge: true });
    expect(createNodePrefixContent(source)).toBeNull();
    expect(createNodePostfixContent(source)?.el.querySelector('.ymz-node-comment-badge')).not.toBeNull();

    configureNodeDecorations({ showTodoBadge: true, showCommentBadge: false });
    expect(createNodePrefixContent(source)?.el.querySelector('.ymz-node-todo-checkbox')).not.toBeNull();
    expect(createNodePostfixContent(source)).toBeNull();
  });
});
