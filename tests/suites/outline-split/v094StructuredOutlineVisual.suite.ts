import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';

describe('v0.9.4 structured outline visual contract', () => {
  it('exposes one unified outline surface without text/tree mode controls', () => {
    const html = createEditorTemplate('Map');
    expect(html).toContain('data-role="outline-tree"');
    expect(html).toContain('ymz-structured-outline');
    expect(html).not.toContain('data-outline-mode-button');
    expect(html).not.toContain('data-role="outline-text-editor"');
  });

  it('keeps flat hover/active rows, equal black markers and rainbow guides', () => {
    const css = readFileSync('index.css', 'utf8');
    expect(css).toContain('.ymz-outline-row:hover{background:#ececec}');
    expect(css).toContain('background:#deeae6!important');
    expect(css).toContain('.ymz-outline-row__triangle,\n.ymz-outline-row__leaf-square');
    expect(css).toContain('width:7px;');
    expect(css).toContain('height:7px;');
    expect(css).toContain('background:#000;');
    expect(css).toContain('var(--ymz-outline-guide-1)');
    expect(css).toContain('var(--ymz-outline-drop-depth');
    expect(css).toContain('border:0!important');
    expect(css).toContain('box-shadow:none!important');
  });
});
