import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { resourceActionIcon } from '../../../src/ui/resourceActionIcons';

const popover = readFileSync('src/editor/resourceActionPopover.ts', 'utf8');
const imageAdjust = readFileSync('src/core/YeMindNodeImgAdjust.ts', 'utf8');

describe('v1.1.0 resource action icons', () => {
  it('uses polished semantic SVGs instead of text glyphs', () => {
    const replace = resourceActionIcon('replace');
    const remove = resourceActionIcon('delete');
    expect(replace).toContain('<svg');
    expect(replace).toContain('aria-hidden="true"');
    expect(replace).toContain('path');
    expect(remove).toContain('<svg');
    expect(remove).toContain('path');
    expect(popover).not.toContain('↻');
    expect(popover).not.toContain('⌫');
  });

  it('shares the same icon source between resource popovers and canvas image tools', () => {
    expect(popover).toContain("resourceActionIcon('replace')");
    expect(popover).toContain("resourceActionIcon('delete')");
    expect(imageAdjust).toContain("resourceActionIcon('replace')");
    expect(imageAdjust).toContain("resourceActionIcon('delete')");
    expect(imageAdjust).not.toContain('function toolbarIcon');
  });
});
