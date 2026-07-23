import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const menuSource = readFileSync(resolve(process.cwd(), 'src/ui/contextMenu.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.11 menus and anchored panels', () => {
  it('anchors project and node style panels beside the invoking control', () => {
    expect(editorSource).toContain('this.nodeStylePanel?.show(button)');
    expect(editorSource).toContain('this.projectStylePanel?.show(button)');
    expect(editorSource).toContain('this.nodeStylePanel?.show({ x: event.clientX, y: event.clientY })');
    expect(css).toContain('height:min(440px,70vh)!important');
    expect(css).toContain('width:min(400px,calc(100% - 16px))!important');
  });

  it('separates node-level and inline links in the add submenu', () => {
    const nodeLink = menuSource.indexOf("label: '链接'");
    const formula = menuSource.indexOf("label: '公式'");
    const inlineLink = menuSource.indexOf("label: '行内链接'");
    expect(nodeLink).toBeGreaterThanOrEqual(0);
    expect(formula).toBeGreaterThan(nodeLink);
    expect(inlineLink).toBeGreaterThan(formula);
  });
});
