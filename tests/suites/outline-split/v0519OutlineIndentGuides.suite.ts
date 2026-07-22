import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');

describe('v0.5.19 outline indent guides', () => {
  it('draws non-interactive indent-rainbow guides from the row depth variable', () => {
    expect(css).toContain('.ymz-outline-row::before');
    expect(css).toContain('pointer-events:none');
    expect(css).toContain('var(--ymz-outline-depth,0)*var(--ymz-outline-indent)');
    expect(css).toContain('--ymz-outline-guide-1');
    expect(css).toContain('--ymz-outline-guide-2');
    expect(css).toContain('--ymz-outline-guide-3');
    expect(css).toContain('--ymz-outline-guide-4');
  });
});
