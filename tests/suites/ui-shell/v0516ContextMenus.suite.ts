import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const menuSource = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.5.16 official-style context menus', () => {
  it('provides separate canvas and node context menus', () => {
    expect(menuSource).toContain('openCanvasContextMenu');
    expect(menuSource).toContain("label: '定位到中心主题'");
    expect(menuSource).toContain("label: '适配全部节点'");
    expect(menuSource).toContain("options.zen ? '退出禅模式' : '进入禅模式'");
    expect(menuSource).toContain("options.readonly ? '退出只读模式' : '进入只读模式'");
    expect(editorSource).toMatch(/this\.map\.on\(["']contextmenu["']/);
  });

  it('marks the long node menu with a narrow scroll surface', () => {
    expect(menuSource).toContain("menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--node')");
    expect(menuSource).toContain("menu.element.classList.add('ymz-context-menu', 'ymz-context-menu--canvas')");
    expect(css).toContain('.ymz-context-menu--node');
    expect(css).toContain('scrollbar-width:thin');
  });
});
