import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const css = readFileSync('src/styles/index.css', 'utf8');

describe('v0.6.3 responsive editor chrome', () => {
  it('keeps top and bottom toolbars on one horizontally scrollable line', () => {
    expect(css).toMatch(/\.ymz-topbar[^}]*overflow-x\s*:\s*auto/);
    expect(css).toMatch(/\.ymz-statusbar[^}]*overflow-x\s*:\s*auto/);
    expect(css).toContain('flex-wrap:nowrap');
    expect(css).toContain('.ymz-topbar>*');
    expect(css).toContain('.ymz-statusbar>*');
    expect(css).toContain('flex:0 0 auto');
  });

  it('prevents project-control text from wrapping vertically on narrow canvases', () => {
    expect(css).toMatch(/\.ymz-project-control[^}]*white-space\s*:\s*nowrap/);
    expect(css).toMatch(/@media\(max-width:560px\)/);
    expect(css).toContain('.ymz-save-state{display:none}');
  });
});
