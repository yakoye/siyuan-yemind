import { describe, expect, it } from 'vitest';
import {
  applyOutlineImport,
  OUTLINE_IMPORT_AUTO_WIDTH,
  parseOutlineTreeText,
  repairImportedAutoWidthTree,
} from '../../../src/editor/outlineTreeImport';
import type { MindMapTree } from '../../../src/model/types';

const base: MindMapTree = {
  data: { uid: 'root', text: '中心主题' },
  children: [{ data: { uid: 'target', text: '目标' }, children: [] }],
};

describe('v0.9.26 imported geometry repair', () => {
  it('uses customTextWidth without persisting a conflicting node width', () => {
    const longText = '这是一个超过二十个汉字而且需要稳定换行但不能改变原始内容的节点标题';
    const parsed = parseOutlineTreeText(longText, 'plain');
    const next = applyOutlineImport(base, 'target', parsed, 'append-under-current');
    const imported = next.children[0].children[0].data;
    expect(imported.customTextWidth).toBe(OUTLINE_IMPORT_AUTO_WIDTH);
    expect(imported.width).toBeUndefined();
    expect(imported.text).toBe(longText);
  });

  it('repairs only legacy auto-width nodes and preserves user-defined widths', () => {
    const tree: MindMapTree = {
      data: { uid: 'root', text: 'root' },
      children: [
        {
          data: {
            uid: 'legacy-auto', text: 'legacy', width: 280, customTextWidth: 280,
            yemindImportedAutoWidth: true,
          },
          children: [],
        },
        {
          data: {
            uid: 'user-width', text: 'user', width: 360, customTextWidth: 360,
            yemindImportedAutoWidth: false,
          },
          children: [],
        },
      ],
    };
    const repaired = repairImportedAutoWidthTree(tree);
    expect(repaired.changed).toBe(true);
    expect(repaired.repaired).toBe(1);
    expect(repaired.tree.children[0].data.width).toBeUndefined();
    expect(repaired.tree.children[0].data.customTextWidth).toBe(280);
    expect(repaired.tree.children[1].data.width).toBe(360);
  });
});
