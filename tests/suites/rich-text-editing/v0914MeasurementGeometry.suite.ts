import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('v0.9.14 stable node measurement geometry', () => {
  it('reserves a symmetric glyph safety gutter so bold root text is never clipped', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(/\.ymz-editor \.smm-richtext-node-wrap\{[^}]*box-sizing:border-box;[^}]*padding-inline:1px;/s);
  });

  it('measures rich HTML from its intrinsic content width unless the user set a width', () => {
    const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');
    expect(css).toMatch(
      /\.ymz-editor \.smm-richtext-node-wrap\{[^}]*display:inline-block;[^}]*width:max-content;/s,
    );
  });
});
