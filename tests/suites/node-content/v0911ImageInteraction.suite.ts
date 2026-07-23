import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adjustSource = readFileSync(resolve(process.cwd(), 'src/core/YeMindNodeImgAdjust.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.11 image interaction foundation', () => {
  it('provides a dedicated image preview event and three-tool control surface', () => {
    expect(editorSource).toContain('this.map.on("yemind_node_image_preview"');
    expect(editorSource).toContain('this.imageLightbox?.show(source, title)');
    expect(adjustSource).toContain('ymz-node-image-preview');
    expect(adjustSource).toContain("this.mindMap.emit('yemind_node_image_preview', this.node)");
  });

  it('keeps image controls isolated from node dragging and visually balanced', () => {
    expect(editorSource).toContain("target?.closest?.('.node-img-handle')");
    expect(css).toContain('width:12px!important');
    expect(css).toContain('height:12px!important');
  });
});
