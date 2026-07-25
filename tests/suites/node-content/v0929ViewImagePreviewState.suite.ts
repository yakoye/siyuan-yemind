import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const editor = readFileSync(new URL('../../../src/editor/YeMindEditor.ts', import.meta.url), 'utf8');
const adjust = readFileSync(new URL('../../../src/core/YeMindNodeImgAdjust.ts', import.meta.url), 'utf8');

describe('v0.9.29 image editing state across views', () => {
  it('clears resource resize overlays when leaving the canvas view', () => {
    expect(adjust).toContain('clearSelectionForViewChange');
    expect(editor).toContain("nodeImgAdjust?.clearSelectionForViewChange?.()");
  });

  it('routes outline image preview through the shared lightbox', () => {
    expect(editor).toMatch(/onImagePreview:[\s\S]*imageLightbox\?\.show\(source, title\)/);
  });
});
