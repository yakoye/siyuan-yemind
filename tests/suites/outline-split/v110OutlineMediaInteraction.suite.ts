import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';

const css = readFileSync('src/styles/index.css', 'utf8');
const controller = readFileSync('src/editor/StructuredOutlineEditorController.ts', 'utf8');

describe('v1.1.0 compact outline drag and media selection', () => {
  it('removes the presentation gutter and exposes a six-dot drag handle', () => {
    expect(css).toContain('--ymz-outline-drag-width:16px');
    expect(css).toMatch(/data-view="outline"[^\{]*\.ymz-outline\{padding-inline:2px/);
    expect(controller).toContain('ymz-outline-drag-grip');
    expect(controller).toContain('aria-label="拖动节点"');
    expect(css).toContain('grid-template-columns:repeat(2,2px)');
    expect(css).toContain('grid-template-rows:repeat(3,2px)');
    expect(css).toContain('cursor:move');
    expect(css).toContain('cursor:grabbing');
  });

  it('renders eight selection points and a direct delete control for outline images and clipart', () => {
    const html = outlineAccessoriesHtml(outlineAccessoriesFromData({
      uid: 'n1',
      text: 'node',
      image: '/asset.svg',
      yemindClipartId: 'animal-1',
    }));
    expect(html.match(/data-outline-media-handle=/g)).toHaveLength(8);
    expect(html).toContain('data-outline-media-delete');
    expect(html).toContain('aria-label="删除剪贴图"');
    expect(controller).toContain('selectedMedia');
    expect(controller).toContain('selectOutlineMedia');
    expect(controller).toContain('clearMediaSelection');
    expect(controller).toContain('onImageDelete?');
  });

  it('releases outline media selection when the canvas claims interaction', () => {
    const editor = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
    expect(controller).toContain('clearMediaSelection(): void');
    expect(editor).toMatch(/claimCanvasInteraction[\s\S]{0,260}outlineRichText\?\.clearMediaSelection\(\)/);
  });
});
