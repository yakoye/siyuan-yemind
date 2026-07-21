import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const template = readFileSync(resolve(process.cwd(), 'src/editor/editorTemplate.ts'), 'utf8');
const css = readFileSync(resolve(process.cwd(), 'src/styles/index.css'), 'utf8');

describe('v0.5.17 zen exit capsule', () => {
  it('renders a compact icon label that expands on hover or keyboard focus', () => {
    expect(template).toContain('ymz-zen-exit__icon');
    expect(template).toContain('ymz-zen-exit__idle');
    expect(template).toContain('ymz-zen-exit__label');
    expect(template).toContain('>禅<');
    expect(template).toContain('>退出禅模式<');
    expect(css).toContain('.ymz-zen-exit__label{max-width:0');
    expect(css).toContain('.ymz-zen-exit:hover .ymz-zen-exit__label');
    expect(css).toContain('.ymz-zen-exit:focus-visible .ymz-zen-exit__label');
  });
});
