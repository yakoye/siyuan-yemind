import { describe, expect, it } from 'vitest';
import {
  applyOutlineImport,
  outlineImportDisplayUnits,
  OUTLINE_IMPORT_AUTO_WIDTH,
  OUTLINE_IMPORT_WRAP_UNITS,
  parseOutlineTreeText,
} from '../../../src/editor/outlineTreeImport';
import type { MindMapTree } from '../../../src/model/types';

const base: MindMapTree = {
  data: { uid: 'root', text: '中心主题' },
  children: [{ data: { uid: 'target', text: '目标' }, children: [] }],
};

describe('v0.9.25 imported node width policy', () => {
  it('counts CJK as full units and ASCII as half units', () => {
    expect(outlineImportDisplayUnits('一二三四')).toBe(4);
    expect(outlineImportDisplayUnits('ABCDEFGH')).toBe(4);
    expect(OUTLINE_IMPORT_WRAP_UNITS).toBe(20);
    expect(OUTLINE_IMPORT_AUTO_WIDTH).toBe(280);
  });

  it('sets width only for long imported text without inserting line breaks', () => {
    const shortText = '短节点';
    const longText = '这是一个超过二十个汉字但不应该修改原始文字内容的节点标题';
    const parsed = parseOutlineTreeText(`${shortText}\n${longText}`, 'plain');
    const next = applyOutlineImport(base, 'target', parsed, 'append-under-current');
    const imported = next.children[0].children;
    expect(imported[0].data.width).toBeUndefined();
    expect(imported[1].data.width).toBe(OUTLINE_IMPORT_AUTO_WIDTH);
    expect(imported[1].data.text).toBe(longText);
    expect(imported[1].data.text).not.toContain('\n');
  });
});
