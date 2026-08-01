import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('v0.9.14 stable node measurement geometry', () => {
  it('does not add a static-only glyph gutter outside the upstream text box', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).not.toMatch(/\.ymz-editor \.smm-richtext-node-wrap\{[^}]*padding-inline/s);
  });

  it('does not replace the upstream rich-text wrapping contract', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).not.toMatch(/\.ymz-editor \.smm-richtext-node-wrap\{[^}]*(?:width|max-content|word-break|overflow-wrap)/s);
  });
});
