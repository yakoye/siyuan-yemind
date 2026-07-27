import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
const source = readFileSync('src/editor/RichTextToolbar.ts', 'utf8');
describe('v0.9.24 formula icon', () => {
  it('uses a self-contained SVG that also works without SiYuan icon symbols', () => {
    expect(source).toContain('data-rich-action="formula"');
    expect(source).toContain('data-yemind-formula-icon');
    expect(source).toMatch(/data-yemind-formula-icon[^>]*>[\s\S]*?<path\b/);
    expect(source).not.toContain('#iconMath');
    expect(source).not.toContain('>π<');
  });
});
