import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import { fitMiniMapSvg } from '../../../src/editor/MiniMapController';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

describe('v1.5.0 version47 shell visual contract', () => {
  it('defines the approved light and dark design tokens with one YeMind accent', () => {
    expect(css).toContain('--ymz-page-bg:#eef0f5');
    expect(css).toContain('--ymz-toolbar-bg:rgba(255,255,255,.97)');
    expect(css).toContain('--ymz-card-bg:#fff');
    expect(css).toContain('--ymz-input-bg:#f0f2f6');
    expect(css).toContain('--ymz-accent:#22c9a0');
    expect(css).toContain('--ymz-page-bg:#111318');
    expect(css).toContain('--ymz-toolbar-bg:rgba(28,31,40,.97)');
    expect(css).toContain('--ymz-card-bg:#1c1f28');
    expect(css).toContain('--ymz-input-bg:#252833');
    expect(css).toContain('.ymz-editor[data-appearance="dark"] .ymz-topbar :is(button,.ymz-project-control){color:var(--ymz-text-80');
    expect(css).not.toContain('.ymz-editor[data-appearance="dark"] .ymz-topbar :is(button,.ymz-project-control,.ymz-save-state){color:var(--b3-theme-on-background');
    expect(css).toContain('.ymz-editor[data-appearance="dark"] :is(.ymz-project-choice-panel,.ymz-layout-gallery,.ymz-project-style-panel,.ymz-node-style-panel){background:var(--ymz-panel-bg)');
    expect(css).not.toContain('.ymz-editor[data-appearance="dark"] :is(.ymz-project-choice-panel,.ymz-layout-gallery,.ymz-project-style-panel,.ymz-node-style-panel){background:var(--b3-theme-surface');
    expect(css).toMatch(/\.ymz-search-panel__field\{[^}]*background:var\(--ymz-input-bg\)/);
    expect(css).toMatch(/\.ymz-search-panel \.b3-text-field\{[^}]*background:transparent[^}]*color:var\(--ymz-text-80\)/);
    expect(css).toMatch(/\.ymz-search-panel button\{[^}]*color:var\(--ymz-text-60\)/);
  });

  it('uses a full-width non-scrolling top and bottom shell with a floating left rail', () => {
    expect(css).toContain('.ymz-topbar{inset:0 0 auto');
    expect(css).toContain('overflow:hidden');
    expect(css).toContain('.ymz-statusbar{inset:auto 0 0');
    expect(css).toContain('.ymz-leftbar{left:12px');
    expect(css).toContain('border-radius:12px');
  });

  it('uses quiet edge rails instead of a centered minus pill after unified hiding', () => {
    expect(css).toMatch(/\.ymz-toolbar-edge\{[^}]*border:0[^}]*background:transparent/s);
    expect(css).toMatch(/\.ymz-toolbar-edge--top\{[^}]*left:0[^}]*right:0[^}]*width:auto/s);
    expect(css).toMatch(/\.ymz-toolbar-edge--top span\{[^}]*height:2px[^}]*background:var\(--ymz-edge-hint\)/s);
    expect(css).not.toMatch(/\.ymz-toolbar-edge\{[^}]*border-radius:999px/s);
  });

  it('renders the approved dot grid, green glow and reduced-motion fallback', () => {
    expect(css).toContain('radial-gradient(circle at 40% 50%,var(--ymz-glow-color)');
    expect(css).toContain('radial-gradient(circle,var(--ymz-dot-color)');
    expect(css).toContain('@media(prefers-reduced-motion:reduce)');
    expect(css).toContain('transition-duration:.01ms!important');
  });

  it('moves low-priority commands into an accessible more menu on narrow windows', () => {
    const html = createEditorTemplate('窄窗口');
    expect(html).toContain('data-action="toggle-top-overflow"');
    expect(html).toContain('data-role="top-overflow-menu"');
    expect(html).toContain('aria-haspopup="menu"');
    expect(css).toContain('@media(max-width:820px)');
    expect(css).toContain('@container ymz-editor (max-width:820px)');
    expect(css).toContain('.ymz-topbar__overflow-trigger{display:inline-flex');
    expect(css).toContain('.ymz-topbar__desktop-utility{display:none');
    expect(css).not.toMatch(/\/\* v1\.5\.0 responsive contract \*\/[\s\S]*?\.ymz-topbar\{[^}]*overflow-x\s*:\s*auto/);
  });

  it('provides a complete resizable outline surface instead of a bare tree', () => {
    const html = createEditorTemplate('大纲');
    expect(html).toContain('data-role="outline-node-count"');
    expect(html).toContain('data-role="outline-search"');
    expect(html).toContain('data-action="outline-expand-all"');
    expect(html).toContain('data-action="outline-collapse-all"');
    expect(html).toContain('data-role="outline-max-depth"');
    expect(css).toContain('.ymz-editor[data-view="split"] .ymz-outline{min-width:220px;max-width:70%');
    expect(css).toContain('[data-outline-filtered="false"]{display:none!important}');
    expect(css).toMatch(/\/\* v1\.5\.0 outline side panel and full-screen outline \*\/[\s\S]*?\.ymz-outline-row\{[^}]*color:var\(--ymz-text-80\)/);
  });

  it('connects the confirmed bottom-bar reset, presentation and minimap controls', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('底栏能力');
    expect(host.querySelector('[data-action="reset"]')).not.toBeNull();
    expect(host.querySelector('[data-action="presentation"]')).not.toBeNull();
    expect(host.querySelector('[data-action="toggle-minimap"]')).not.toBeNull();
    expect(host.querySelector('[data-role="minimap"]')).not.toBeNull();
    expect(host.querySelector('.ymz-minimap__label')?.textContent).toBe('MINIMAP');
    expect(host.querySelector('[data-action="fullscreen"]')).toBeNull();
    expect(host.querySelector('[data-action="toggle-status-overflow"]')).not.toBeNull();
    expect(host.querySelector('[data-role="status-overflow-menu"]')).not.toBeNull();
    expect(css).toContain('.ymz-minimap');
    expect(css).toContain('.ymz-minimap__viewport');
    expect(css).toContain('.ymz-editor[data-status-overflow-open="true"] .ymz-statusbar__overflow-panel');
  });

  it('fits the engine minimap SVG into the visible panel instead of clipping its native coordinates', () => {
    const host = document.createElement('div');
    host.innerHTML = '<svg width="800.12" height="976.87"><path d="M 400 400 L 700 700"/></svg>';
    const svg = host.querySelector<SVGSVGElement>('svg');
    expect(fitMiniMapSvg(svg)).toBe(true);
    expect(svg?.getAttribute('viewBox')).toBe('0 0 800.12 976.87');
    expect(svg?.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet');
    expect(svg?.getAttribute('width')).toBe('100%');
    expect(svg?.getAttribute('height')).toBe('100%');
  });
});
