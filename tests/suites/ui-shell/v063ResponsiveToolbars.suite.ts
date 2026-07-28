import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/index.css', 'utf8');

describe('responsive editor chrome', () => {
  it('keeps top and bottom toolbars on one clipped line without horizontal scrolling', () => {
    expect(css).toContain('/* v1.5.0 responsive contract */');
    expect(css).toMatch(/\/\* v1\.5\.0 responsive contract \*\/[\s\S]*?\.ymz-topbar\{[^}]*overflow:hidden/);
    expect(css).toMatch(/\/\* v1\.5\.0 responsive contract \*\/[\s\S]*?\.ymz-statusbar\{[^}]*overflow:hidden/);
    expect(css).toContain('.ymz-topbar__overflow-trigger');
    expect(css).toContain('container-type:inline-size');
    expect(css).toMatch(/@container ymz-editor \(max-width:820px\)/);
  });

  it('prevents project-control text from wrapping and retains icon access on narrow canvases', () => {
    expect(css).toMatch(/\.ymz-project-control[^}]*white-space\s*:\s*nowrap/);
    expect(css).toMatch(/@media\(max-width:820px\)/);
    expect(css).toContain('.ymz-topbar__desktop-utility{display:none');
  });
});
