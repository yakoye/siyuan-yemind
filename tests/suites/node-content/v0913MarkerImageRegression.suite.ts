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

  it('shows image controls from hover and opens preview from the magnifier without pinning or double click', () => {
    expect(adjustSource).toContain('onNodeImgMousemove(node: any, img: any)');
    expect(adjustSource).toContain('BaseNodeImgAdjust.prototype as any).onNodeImgMousemove.call(this, node, img)');
    expect(adjustSource).not.toContain('pinnedUid');
    expect(adjustSource).not.toContain('data-yemind-image-pinned');
    expect(adjustSource).toContain("preview.addEventListener('mouseleave'");
    expect(editorSource).toContain('this.map.on("yemind_node_image_preview"');
    expect(editorSource).not.toContain('this.map.on("node_img_dblclick"');
  });

  it('keeps the enlarged-image backdrop blurred but translucent enough to see the map', () => {
    expect(css).toMatch(/\.ymz-image-lightbox\{[^}]*rgba\(7,10,13,\.62\)/s);
    expect(css).toMatch(/\.ymz-image-lightbox\{[^}]*backdrop-filter:blur\(8px\)/s);
  });
});
