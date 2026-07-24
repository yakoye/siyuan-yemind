import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const source = readFileSync('src/ui/contextMenu.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');

describe('node context menu organization', () => {
  it('uses a menu-sized node-style svg aligned with its text', () => {
    expect(source).toMatch(/import \{[^}]*nodeStyleIcon[^}]*\} from '\.\.\/editor\/projectControls';/);
    expect(source).toContain("iconHTML: nodeStyleIcon()");
    expect(source).not.toContain("icon: 'iconTheme', label: '节点样式'");
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__icon\{[^}]*align-items:center/s);
  });

  it('keeps edit and insertion direct while grouping optional node content under 添加', () => {
    expect(source).toContain("label: '编辑节点'");
    expect(source).toContain("label: '插入同级节点'");
    expect(source).toContain("label: '插入下级节点'");
    expect(source).toContain("label: '插入上级节点'");
    expect(source).toContain("type: 'submenu', icon: 'iconAdd', label: '添加'");
    expect(source).toContain("label: hasOuterFrame ? '删除外框' : '外框'");
  });

  it('assigns scrolling only to the menu items container', () => {
    expect(css).toMatch(/\.ymz-context-menu--node\s*\{[^}]*overflow\s*:\s*hidden/);
    expect(css).toMatch(/\.ymz-context-menu--node\s+\.b3-menu__items\s*\{[^}]*overflow-y\s*:\s*auto/);
    expect(css).not.toMatch(/\.ymz-context-menu--node\s*\{[^}]*overflow-y\s*:\s*auto/);
  });
});
