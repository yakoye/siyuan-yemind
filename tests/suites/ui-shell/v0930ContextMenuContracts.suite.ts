import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const contextMenu = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.30 context menu contracts', () => {
  it('places text-to-map immediately before the single-node 添加 submenu', () => {
    const textIndex = contextMenu.indexOf("label: '文本转导图…'");
    const addIndex = contextMenu.indexOf("type: 'submenu', icon: 'iconAdd', label: '添加'");
    expect(textIndex).toBeGreaterThan(0);
    expect(addIndex).toBeGreaterThan(textIndex);
    expect(editor).toContain('onTextToMap: () => this.openTextToMapForUid');
    expect(editor).toContain('private openTextToMapForUid');
    expect(editor).toContain('openTextToMapDialog({');
  });

  it('uses full subtree and full-map labels for right-click menus', () => {
    expect(contextMenu).toContain('展开全部下级节点');
    expect(contextMenu).toContain('折叠全部下级节点');
    expect(contextMenu).toContain('展开全部节点');
    expect(contextMenu).toContain('折叠全部节点');
  });
});
