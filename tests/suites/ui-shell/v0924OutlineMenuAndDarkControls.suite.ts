import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const menu = readFileSync('src/ui/contextMenu.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');
const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');

describe('v0.9.24 outline menu and dark controls', () => {
  it('declares the requested outline menu in exact order', () => {
    const labels = ['编辑节点','插入上级节点','插入同级节点','插入下级节点','文本转导图…','复制（当前行）','剪切（当前行）','粘贴（当前光标处）','粘贴（纯文本）','上移节点','下移节点','展开/折叠（下级节点）','删除当前行和子级','仅删除当前行'];
    let previous = -1;
    for (const label of labels) {
      const index = menu.indexOf(label);
      expect(index).toBeGreaterThan(previous);
      previous = index;
    }
  });

  it('promotes an empty row on Enter and makes theme/line native lists dark-aware', () => {
    expect(controller).toContain('promoteEmptyRowOnEnter');
    expect(css).toMatch(/\.ymz-editor\[data-appearance="dark"\][^}]*\.ymz-project-control/s);
    expect(css).toMatch(/\.ymz-project-control select[^}]*color-scheme/s);
    expect(css).toMatch(/\.ymz-project-control select option/s);
  });
});
