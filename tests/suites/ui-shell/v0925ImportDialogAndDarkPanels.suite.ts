import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const dialog = readFileSync('src/ui/textToMapDialog.ts', 'utf8');
const css = readFileSync('src/styles/index.css', 'utf8');
const template = readFileSync('src/editor/editorTemplate.ts', 'utf8');
const editor = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
const menu = readFileSync('src/ui/contextMenu.ts', 'utf8');

describe('v0.9.25 import dialog and dark project panels', () => {
  it('bounds the dialog and renders processed preview rows instead of copying source glyphs', () => {
    expect(dialog).toContain("height: 'min(700px, calc(100vh - 64px))'");
    expect(dialog).toContain('previewRowsHtml');
    expect(dialog).toContain('ymz-text-map-dialog__preview-row');
    expect(css).toMatch(/\.ymz-text-map-dialog__body\{[^}]*min-height:0[^}]*overflow:hidden/s);
    expect(css).toMatch(/\.ymz-text-map-dialog__input[^}]*overflow:auto/s);
    expect(css).toMatch(/\.ymz-text-map-dialog__preview[^}]*overflow:auto/s);
  });

  it('uses custom theme and line panels with one dark interaction palette', () => {
    expect(template).toContain('data-action="theme-gallery"');
    expect(template).toContain('data-role="theme-choice-panel"');
    expect(template).toContain('data-action="line-style-gallery"');
    expect(template).toContain('data-role="line-style-choice-panel"');
    expect(editor).toContain('ProjectChoicePanel');
    expect(css).toContain('.ymz-project-choice-panel');
    expect(css).toMatch(/\.ymz-editor\[data-appearance="dark"\] \.ymz-topbar[^}]*color:var\(--b3-theme-on-background/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__item\.is-selected[^}]*background:var\(--ymz-accent-soft-strong/s);
    expect(css).toMatch(/\.ymz-project-choice-panel__item:hover[^}]*background:var\(--ymz-control-hover-bg/s);
  });

  it('adds outline content actions for icons, clipart and images', () => {
    expect(menu).toContain("label: '添加'");
    expect(menu).toContain("label: '图标'");
    expect(menu).toContain("label: '剪贴图'");
    expect(menu).toContain("label: '图片'");
  });
});
