import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { markerCatalog, markerSvg } from '../../../src/core/localAssetCatalogs';

const adjustSource = readFileSync(resolve(process.cwd(), 'src/core/YeMindNodeImgAdjust.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.13 marker and image regressions', () => {
  it('clips marker sprites through a viewport-sized pattern instead of exposing the full sprite bbox', () => {
    const item = markerCatalog.items[0];
    const svg = markerSvg('/plugins/siyuan-yemind/assets/icons/marker-sprite.png', item);
    expect(svg).toContain('<pattern');
    expect(svg).toContain('patternUnits="userSpaceOnUse"');
    expect(svg).toContain('<rect width="28" height="28"');
    expect(svg).toContain('fill="url(#');
    expect(svg.indexOf('<defs>')).toBeLessThan(svg.indexOf('<image'));
  });

  it('shows only a border on hover and pins eight handles plus the toolbar after image click', () => {
    expect(adjustSource).toContain("this.setMode('hover')");
    expect(adjustSource).toContain("this.setMode('selected')");
    expect(adjustSource).toContain("const RESIZE_HANDLES: ImageResizeHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']");
    expect(adjustSource).not.toContain('ymz-node-image-preview');
    expect(editorSource).toContain('this.map.on("node_img_click"');
    expect(css).toContain('.ymz-node-image-frame[data-mode="hover"] .ymz-node-image-resize-handle');
    expect(css).toContain('.ymz-node-image-frame[data-mode="selected"] .ymz-node-image-toolbar{display:flex}');
  });

  it('keeps the enlarged-image backdrop blurred but translucent enough to see the map', () => {
    expect(css).toMatch(/\.ymz-image-lightbox\{background:rgba\(7,10,13,\.62\);backdrop-filter:blur\(8px\)\}/s);
  });
});
