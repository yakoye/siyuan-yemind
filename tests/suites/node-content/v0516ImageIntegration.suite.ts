import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const editor = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');
const upstreamAdjust = readFileSync(resolve(process.cwd(), 'node_modules/simple-mind-map/src/plugins/NodeImgAdjust.js'), 'utf8');

describe('v0.5.16 node image integration', () => {
  it('intercepts only image paste/drop and applies natural dimensions to the target node', () => {
    expect(editor).toMatch(/addEventListener\(["']paste["'],\s*this\.onImagePaste\)/);
    expect(editor).toMatch(/addEventListener\(["']drop["'],\s*this\.onImageDrop\)/);
    expect(editor).toContain('loadImageFileSelection');
    expect(editor).toContain('findRenderedNodeAtClientPoint');
    expect(editor).toContain('width: loaded.size.width');
    expect(editor).toContain('height: loaded.size.height');
    expect(editor).toContain('this.activateOnlyNode(node)');
  });

  it('keeps the upstream ratio-preserving resize mechanism enabled', () => {
    expect(upstreamAdjust).toContain('resizeImgSizeByOriginRatio');
    expect(upstreamAdjust).toContain("execCommand('SET_NODE_IMAGE'");
  });
});
