import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('editor safe resize', () => {
  it('does not resize the mind-map while pure outline mode hides the canvas', () => {
    expect(source).toContain("if (mode !== 'outline') this.scheduleSafeResize();");
    expect(source).not.toContain("window.requestAnimationFrame(() => this.map?.resize())");
  });
});
