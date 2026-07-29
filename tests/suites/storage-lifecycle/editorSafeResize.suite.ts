import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('editor safe resize', () => {
  it('does not resize the mind-map while pure outline mode hides the canvas', () => {
    expect(source).toMatch(
      /private scheduleSafeResize\(attempt = 0\): void \{[\s\S]*?this\.viewMode === ["']outline["'][\s\S]*?return;/,
    );
    expect(source).toMatch(
      /requestAnimationFrame\(\(\) => \{[\s\S]*?this\.viewMode === ["']outline["'][\s\S]*?return;/,
    );
    expect(source).not.toContain("window.requestAnimationFrame(() => this.map?.resize())");
  });
});
