import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { suppliedIcon, suppliedIconNames } from '../../../src/editor/suppliedIcons';

const css = readFileSync('src/styles/index.css', 'utf8');
const contextMenuSource = readFileSync('src/ui/contextMenu.ts', 'utf8');

describe('v0.9.23 icon grid and dark theme states', () => {
  it('renders every supplied icon in one 22px slot with light and dark 15px artwork variants', () => {
    for (const name of suppliedIconNames) {
      const html = suppliedIcon(name);
      expect(html).toMatch(/^<span\b/);
      expect(html).toContain('ymz-icon-slot');
      expect(html.match(/<img /g)).toHaveLength(2);
      expect(html).toContain('ymz-operation-icon--light');
      expect(html).toContain('ymz-operation-icon--dark');
    }
    expect(css).toMatch(/\.ymz-icon-slot\s*\{[^}]*width:22px[^}]*height:22px/s);
    expect(css).toMatch(/\.ymz-icon-slot[^}]*>[^\{]*\.ymz-operation-icon\s*\{[^}]*width:15px[^}]*height:15px/s);
    expect(css).toMatch(/svg\.b3-menu__icon\s*\{[^}]*width:22px[^}]*height:22px[^}]*padding:3\.5px/s);
  });

  it('uses theme-aware outline and top-toolbar active states instead of fixed light colors', () => {
    expect(css).toContain('--ymz-outline-hover-bg:');
    expect(css).toContain('--ymz-outline-active-bg:');
    expect(css).not.toContain('.ymz-outline-row:hover{background:#ececec}');
    expect(css).not.toContain('color:#000!important');
    expect(css).toContain('.ymz-editor[data-appearance="dark"]');
    expect(css).toContain('.ymz-topbar button.is-active');
  });

  it('marks every generated context menu with the detected host appearance', () => {
    expect(contextMenuSource.match(/menu\.element\.dataset\.appearance = detectAppearance\(\);/g)).toHaveLength(2);
  });
});
