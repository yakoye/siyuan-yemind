import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  appearanceIcon,
  brandIcon,
  fullscreenIcon,
  primaryViewIcon,
} from '../../../src/editor/projectControls';
import {
  normalizeMiniMapViewportStyle,
  type MiniMapViewportStyle,
} from '../../../src/editor/miniMapProjection';
import { commitMiniMapSvg } from '../../../src/editor/MiniMapController';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

describe('v1.5.1 Version47 shell regressions', () => {
  it('V151-01/V151-09 restores the original network brand and map symbols', () => {
    expect(brandIcon()).toContain('ymz-brand-icon--network');
    expect(brandIcon()).toContain('ymz-brand-node');
    expect(primaryViewIcon('map')).toContain('ymz-primary-view-icon--map-network');
    expect(primaryViewIcon('map')).toContain('ymz-map-root');
  });

  it('V151-10 uses an automatic light/dark symbol instead of a monitor', () => {
    const icon = appearanceIcon('system');
    expect(icon).toContain('ymz-icon-appearance-auto');
    expect(icon).toContain('ymz-appearance-sun');
    expect(icon).toContain('ymz-appearance-moon');
    expect(icon).not.toContain('<rect');
  });

  it('V151-15 uses one currentColor fullscreen icon in every panel', () => {
    const icon = fullscreenIcon();
    expect(icon).toContain('ymz-icon-fullscreen');
    expect(icon).toContain('stroke="currentColor"');
    expect(icon).not.toContain('data:image');
  });

  it('V151-03 uses theme-aware quiet discovery rails without glow', () => {
    expect(css).toContain('--ymz-edge-hint:');
    expect(css).toMatch(/\.ymz-toolbar-edge--top span,\n\.ymz-toolbar-edge--bottom span\{[^}]*background:var\(--ymz-edge-hint\)/s);
    expect(css).toMatch(/\.ymz-toolbar-edge--left span\{[^}]*background:var\(--ymz-edge-hint\)/s);
    expect(css).toContain('@keyframes ymz-edge-reveal');
    expect(css).not.toMatch(/\.ymz-toolbar-edge--(?:top|left|bottom)[^{]*\{[^}]*box-shadow:0 0 8px/s);
  });

  it('V151-05 keeps bars flat and the minimap quiet like Version47', () => {
    expect(css).toMatch(/\.ymz-topbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-statusbar\{[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-minimap\{[^}]*height:100px[^}]*box-shadow:none/s);
    expect(css).toMatch(/\.ymz-minimap\{[^}]*backdrop-filter:none/s);
    expect(css).toMatch(
      /\.ymz-topbar__desktop-utility:not\(\.ymz-separator\)\{padding-inline:7px!important\}/,
    );
  });

  it('V151-14 uses one opaque flat menu surface instead of glass item cards', () => {
    expect(css).toMatch(/\.ymz-context-menu\{[^}]*background:var\(--ymz-panel-bg\)!important[^}]*backdrop-filter:none/s);
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__item\{[^}]*background:transparent[^}]*box-shadow:none/s);
  });
});

describe('v1.5.1 minimap viewport projection', () => {
  const project = (style: MiniMapViewportStyle) =>
    normalizeMiniMapViewportStyle(style, { width: 160, height: 100, minimumSize: 6 });

  it('V151-02 clamps a normal viewport to the visible minimap', () => {
    expect(project({ left: '20px', right: '30px', top: '10px', bottom: '15px' })).toEqual({
      left: '20px',
      right: '30px',
      top: '10px',
      bottom: '15px',
    });
  });

  it('V151-02 repairs non-finite, negative and over-constrained insets', () => {
    const result = project({
      left: '-20px',
      right: '9999px',
      top: 'NaNpx',
      bottom: 'Infinitypx',
    });
    const left = Number.parseFloat(result.left);
    const right = Number.parseFloat(result.right);
    const top = Number.parseFloat(result.top);
    const bottom = Number.parseFloat(result.bottom);
    expect(left).toBeGreaterThanOrEqual(0);
    expect(right).toBeGreaterThanOrEqual(0);
    expect(top).toBeGreaterThanOrEqual(0);
    expect(bottom).toBeGreaterThanOrEqual(0);
    expect(160 - left - right).toBeGreaterThanOrEqual(6);
    expect(100 - top - bottom).toBeGreaterThanOrEqual(6);
  });

  it('V151-02 clears stale sides when the engine emits a partial update', () => {
    expect(project({ left: '14px', top: '8px' })).toEqual({
      left: '14px',
      right: '0px',
      top: '8px',
      bottom: '0px',
    });
  });

  it('V151-02 keeps the last valid thumbnail when the engine emits a zero-size frame', () => {
    const content = document.createElement('div');
    expect(commitMiniMapSvg(content, '<svg width="160" height="100"><path d="M0 0h10"/></svg>')).toBe(true);
    const valid = content.innerHTML;
    expect(commitMiniMapSvg(content, '<svg width="0" height="0"><path d="M0 0h99"/></svg>')).toBe(false);
    expect(content.innerHTML).toBe(valid);
  });
});
