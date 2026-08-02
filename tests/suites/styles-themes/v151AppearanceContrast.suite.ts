import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

describe('v1.5.1 light and dark appearance contrast', () => {
  it('V151-05/V151-10 removes shell shadows and keeps every toolbar on opaque theme tokens', () => {
    expect(css).toMatch(/\.ymz-topbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-statusbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-editor\[data-view="split"\] \.ymz-outline\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-rich-toolbar\{[^}]*background:var\(--ymz-panel-bg\)[^}]*color:var\(--ymz-text-80\)/s);
  });

  it('keeps text selection controls readable without a transparent surface or second node shadow', () => {
    expect(css).toMatch(/\.ymz-rich-toolbar\{[^}]*border:1px solid var\(--ymz-shell-border\)[^}]*background:var\(--ymz-panel-bg\)[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-editor \.smm-hover-node\{[^}]*stroke:transparent!important[^}]*fill:none!important/s);
    expect(css).toMatch(/\.ymz-editor \.smm-node\.active \.smm-node-shape[^}]*\{[^}]*stroke:var\(--ymz-accent\)!important/s);
  });

  it('V151-10/V151-11 gives controls, placeholders and selections explicit contrast tokens', () => {
    expect(css).toMatch(/\.ymz-topbar :is\(button,select\)[^{]*\{[^}]*color:var\(--ymz-text-60\)/s);
    expect(css).toContain('color:var(--ymz-text-selection-fg)');
    expect(css).toContain('.ymz-editor[data-appearance="dark"]');
  });
});
