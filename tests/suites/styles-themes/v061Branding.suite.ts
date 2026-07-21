import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.6.1 icon-green branding', () => {
  it('uses the plugin icon background for both brand and map title chips', () => {
    expect(css).toMatch(/\.ymz-brand[^}]*background\s*:\s*var\(--ymz-green\)/);
    expect(css).toMatch(/\.ymz-status-title[^}]*background\s*:\s*var\(--ymz-green\)/);
  });
});
