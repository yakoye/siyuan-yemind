import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const adjust = readFileSync(resolve(process.cwd(), 'src/core/YeMindNodeImgAdjust.ts'), 'utf8');

describe('v0.9.29 image editing state across views', () => {
  it('keeps canvas resource editing alive when the outline pane is open', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(adjust).toContain('clearSelectionForViewChange');
    expect(editor).not.toContain("if (mode === 'outline') {\n      (this.map as any)?.nodeImgAdjust?.clearSelectionForViewChange?.();");
    expect(styles).not.toContain('.ymz-editor[data-view="outline"] .ymz-node-image-frame');
    expect(editor).toMatch(/this\.rootEl\.dataset\.view = mode;[\s\S]{0,500}this\.scheduleSafeResize\(\);/);
    expect(editor).toContain('if (mode === this.studyMode) return;');
  });

  it('keeps the canvas image selection and controls available in split view', () => {
    const styles = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(editor).not.toContain("if (mode !== 'map' || this.viewMode !== 'map')");
    expect(styles).not.toContain('[data-view="split"] .ymz-node-image-frame');
  });

  it('routes outline image preview through the shared lightbox', () => {
    expect(editor).toMatch(/onImagePreview:[\s\S]*imageLightbox\?\.show\(source, title\)/);
  });
});
