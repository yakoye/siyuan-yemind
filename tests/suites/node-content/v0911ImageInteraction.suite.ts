import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const adjustSource = readFileSync(resolve(process.cwd(), 'src/core/YeMindNodeImgAdjust.ts'), 'utf8');
const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.9.11 image interaction foundation', () => {
  it('opens preview from image double click and replacement from the selected-image toolbar', () => {
    expect(adjustSource).toContain("this.mindMap.on('node_img_dblclick'");
    expect(adjustSource).toContain("this.mindMap.emit('yemind_node_image_preview', node)");
    expect(adjustSource).toContain("this.mindMap.emit('yemind_node_image_replace', node)");
    expect(editorSource).toContain('this.map.on("yemind_node_image_preview"');
    expect(editorSource).toContain('this.map.on("yemind_node_image_replace"');
    expect(editorSource).toContain('openImageDialog(this.commands)');
  });

  it('keeps image controls isolated from node dragging and exposes directional cursors', () => {
    const dragSource = readFileSync(resolve(process.cwd(), 'src/core/YeMindDrag.ts'), 'utf8');
    expect(dragSource).toContain("'.node-img-handle,.node-img-handle button'");
    expect(css).toContain('cursor:nwse-resize');
    expect(css).toContain('cursor:nesw-resize');
    expect(css).toContain('cursor:ns-resize');
    expect(css).toContain('cursor:ew-resize');
  });
});
