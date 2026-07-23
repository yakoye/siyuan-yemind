import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adjustSource = readFileSync(resolve(process.cwd(), 'src/core/YeMindNodeImgAdjust.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.11 image interaction', () => {
  it('pins tools on a single click, opens preview on double click and unpins outside', () => {
    expect(editorSource).toContain('this.map.on("node_img_click"');
    expect(editorSource).toContain('nodeImgAdjust?.pin?.(node, img)');
    expect(editorSource).toContain('this.map.on("node_img_dblclick"');
    expect(editorSource).toContain('this.imageLightbox?.show(source, title)');
    expect(editorSource).toContain('nodeImgAdjust?.unpin?.()');
    expect(adjustSource).toContain("data-yemind-image-pinned");
  });

  it('keeps image controls isolated from node dragging and visually balanced', () => {
    expect(editorSource).toContain("target?.closest?.('.node-img-handle')");
    expect(css).toContain('.node-img-handle[data-yemind-image-pinned="true"]');
    expect(css).toContain('width:12px!important');
    expect(css).toContain('height:12px!important');
  });
});
