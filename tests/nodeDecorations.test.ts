import { describe, expect, it, vi } from 'vitest';
import { createNodePostfixContent, YEMIND_ICON_LIST } from '../src/core/nodeDecorations';

describe('node content decorations', () => {
  it('exposes YeMind custom node icons', () => {
    expect(YEMIND_ICON_LIST[0].type).toBe('yemind');
    expect(YEMIND_ICON_LIST[0].list.map((item) => item.name)).toEqual(expect.arrayContaining([
      'star', 'flag', 'question', 'idea', 'check', 'warning',
    ]));
  });

  it('renders clickable todo and comment badges from node data', () => {
    const emit = vi.fn();
    const values = {
      yemindTodo: { checked: false, text: 'verify link' },
      yemindComments: [{ id: 'c1', text: 'review', createdAt: 1, updatedAt: 1 }],
    };
    const node = {
      getData: (key: keyof typeof values) => values[key],
      mindMap: { emit },
    };

    const result = createNodePostfixContent(node);
    expect(result?.el.textContent).toContain('○');
    expect(result?.el.textContent).toContain('批1');

    result?.el.querySelector<HTMLButtonElement>('.ymz-node-badge--comments')?.click();
    expect(emit).toHaveBeenCalledWith('yemind_badge_click', 'comments', node);
  });
});
