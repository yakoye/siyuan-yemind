import { describe, expect, it } from 'vitest';
import { NODE_CONTENT_MENU_LABELS } from '../src/ui/nodeContentMenu';

describe('node context menu content', () => {
  it('exposes all requested node-content actions as separate entries', () => {
    expect(NODE_CONTENT_MENU_LABELS).toEqual(expect.arrayContaining([
      '待办',
      '批注',
      '备注',
      '标签',
      '图标',
      '链接',
      '图片',
      '公式',
      '概要',
      '关联线',
    ]));
  });
});
