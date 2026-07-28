import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

describe('v1.5.1 light and dark appearance contrast', () => {
  it('V151-05/V151-10 removes shell shadows and keeps every toolbar on theme tokens', () => {
    expect(css).toMatch(/\.ymz-topbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-statusbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-editor\[data-view="split"\] \.ymz-outline\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-rich-toolbar\{[^}]*background:var\(--ymz-panel-bg\)[^}]*color:var\(--ymz-text-80\)/s);
  });

  it('V151-10/V151-11 gives controls, placeholders and selections explicit contrast tokens', () => {
    expect(css).toMatch(/\.ymz-topbar :is\(button,select\)[^{]*\{[^}]*color:var\(--ymz-text-60\)/s);
    expect(css).toContain('color:var(--ymz-text-selection-fg)');
    expect(css).toContain('.ymz-editor[data-appearance="dark"]');
  });
});
