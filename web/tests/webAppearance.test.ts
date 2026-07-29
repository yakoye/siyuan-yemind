import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'web/src/styles.css'), 'utf8');

describe('standalone web appearance styles', () => {
  it('defines dark tokens and applies them to every web shell surface', () => {
    expect(css).toContain(':root[data-appearance="dark"]');
    expect(css).toMatch(/:root\[data-appearance="dark"\]\{[^}]*--b3-theme-background:#111714/s);
    expect(css).toContain('background:var(--ymw-app-background)');
    expect(css).toContain('background:var(--b3-theme-surface)');
    expect(css).toContain('color:var(--b3-theme-on-background)');
  });

  it('keeps menus dialogs focus rings and the mobile launcher readable in dark mode', () => {
    expect(css).toMatch(/\.b3-dialog__container\{[^}]*background:var\(--b3-theme-surface\)/s);
    expect(css).toMatch(/\.ymw-menu\{[^}]*background:var\(--b3-theme-surface\)/s);
    expect(css).toMatch(/:focus-visible\{[^}]*outline:/s);
    expect(css).toMatch(/\.ymw-sidebar-toggle\{[^}]*background:var\(--b3-theme-surface\)/s);
    expect(css).toMatch(/@media\(max-width:760px\)[\s\S]*\.ymw-sidebar-toggle\{[^}]*z-index:90/s);
  });

  it('keeps the web sidebar boundary lightweight without casting into the editor', () => {
    expect(css).toMatch(/\.ymw-sidebar\{[^}]*border-right:1px solid var\(--b3-border-color\)[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymw-sidebar-toggle\{[^}]*border:1px solid var\(--b3-border-color\)[^}]*box-shadow:none/s);
  });
});
