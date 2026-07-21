import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/ui/contextMenu.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

describe('v0.6.3 node context menu organization', () => {
  it('uses the same node-style svg as the top toolbar', () => {
    expect(source).toMatch(/import \{[^}]*nodeStyleIcon[^}]*\} from '\.\.\/editor\/projectControls';/);
    expect(source).toContain("iconHTML: nodeStyleIcon()");
    expect(source).not.toContain("icon: 'iconTheme', label: '节点样式'");
  });

  it('groups secondary actions into clear submenus while keeping edit, add and delete direct', () => {
    ['剪贴板', '节点内容', '样式与关系', '排列与折叠'].forEach((label) => {
      expect(source).toContain(`label: '${label}'`);
    });
    expect(source).toContain("label: '编辑节点'");
    expect(source).toContain("label: '添加子节点'");
    expect(source).toContain("label: '删除节点和子树'");
  });

  it('assigns scrolling only to the menu items container', () => {
    expect(css).toMatch(/\.ymz-context-menu--node\s*\{[^}]*overflow\s*:\s*hidden/);
    expect(css).toMatch(/\.ymz-context-menu--node\s+\.b3-menu__items\s*\{[^}]*overflow-y\s*:\s*auto/);
    expect(css).not.toMatch(/\.ymz-context-menu--node\s*\{[^}]*overflow-y\s*:\s*auto/);
  });
});
