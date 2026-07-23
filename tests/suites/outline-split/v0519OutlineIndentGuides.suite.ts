import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const css = fs.readFileSync(path.resolve('src/styles/index.css'), 'utf8');

// Historical indent-rainbow coverage. The original row pseudo-element was
// replaced in v0.9.10 by one guide overlay so every visible segment is painted
// exactly once, but the non-interactive rainbow contract remains.
describe('v0.5.19 outline indent guides', () => {
  it('draws non-interactive indent-rainbow guides in one overlay layer', () => {
    expect(css).toContain('.ymz-outline-guides');
    expect(css).toContain('.ymz-outline-guide');
    expect(css).toContain('pointer-events:none');
    expect(css).toContain('--ymz-outline-guide-1');
    expect(css).toContain('--ymz-outline-guide-2');
    expect(css).toContain('--ymz-outline-guide-3');
    expect(css).toContain('--ymz-outline-guide-4');
  });
});
