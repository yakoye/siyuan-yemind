import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync('src/editor/RichTextToolbar.ts', 'utf8');
describe('v0.9.24 formula icon', () => {
  it('uses the SiYuan formula SVG and no pi text glyph', () => {
    expect(source).toContain('#iconMath');
    expect(source).not.toContain('>π<');
  });
});
