import { describe, expect, it } from 'vitest';
import { NODE_CONTENT_MENU_LABELS, createTodoMenuDescriptor } from '../../../src/ui/nodeContentMenu';

describe('node context menu content', () => {
  it('exposes all requested node-content actions and keeps inline link after formula', () => {
    expect(NODE_CONTENT_MENU_LABELS).toEqual(expect.arrayContaining([
      '添加待办', '删除待办', '备注', '批注', '标签', '图标',
      '链接', '图片', '代码块', '公式', '行内链接', '概要',
      '关联线', '添加外框',
    ]));
    const formula = NODE_CONTENT_MENU_LABELS.indexOf('公式');
    const inlineLink = NODE_CONTENT_MENU_LABELS.indexOf('行内链接');
    expect(inlineLink).toBe(formula + 1);
  });

  it('creates a direct todo menu descriptor without opening a dialog', () => {
    const pending = createTodoMenuDescriptor({ checked: false });
    expect(pending.label).toBe('删除待办');
    expect(pending.next).toBeNull();

    const completed = createTodoMenuDescriptor({ checked: true });
    expect(completed.label).toBe('删除待办');
    expect(completed.warning).toBe(true);
  });
});
