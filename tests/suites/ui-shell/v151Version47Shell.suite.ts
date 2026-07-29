import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import {
  appearanceIcon,
  brandIcon,
  fullscreenIcon,
  panelCloseIcon,
  primaryViewIcon,
} from '../../../src/editor/projectControls';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import {
  normalizeMiniMapViewportStyle,
  type MiniMapViewportStyle,
} from '../../../src/editor/miniMapProjection';
import { commitMiniMapSvg, MiniMapController } from '../../../src/editor/MiniMapController';
import { constrainContextMenuToViewport } from '../../../src/ui/contextMenuViewport';

const css = readFileSync('src/styles/index.css', 'utf8').replace(/\r\n?/g, '\n');

describe('v1.5.1 Version47 shell regressions', () => {
  it('V151-01/V151-09 uses the supplied YeMind raster brand and map symbols', () => {
    const icon = brandIcon('/plugins/siyuan-yemind');
    expect(icon).toContain('class="ymz-brand-icon"');
    expect(icon).toContain('/plugins/siyuan-yemind/assets/yemind-icon-32.png');
    expect(icon).toContain('/plugins/siyuan-yemind/assets/yemind-icon-64.png 2x');
    expect(icon).toContain('/plugins/siyuan-yemind/assets/yemind-icon-128.png 4x');
    expect(icon).not.toContain('<svg');
    expect(primaryViewIcon('map')).toContain('ymz-primary-view-icon--map-network');
    expect(primaryViewIcon('map')).toContain('ymz-map-root');
  });

  it('V151-10 uses an automatic light/dark symbol instead of a monitor', () => {
    const icon = appearanceIcon('system');
    expect(icon).toContain('ymz-icon-appearance-auto');
    expect(icon).toContain('href="#iconMode"');
    expect(icon).toContain('ymz-siyuan-icon-use');
    expect(icon).toContain('ymz-siyuan-icon-fallback');
    expect(icon).not.toContain('<rect');
  });

  it('V151-15 uses one currentColor fullscreen icon in every panel', () => {
    const icon = fullscreenIcon();
    expect(icon).toContain('ymz-icon-fullscreen');
    expect(icon).toContain('stroke="currentColor"');
    expect(icon).toContain('M15 3h6v6');
    expect(icon).toContain('M3 21l7-7');
    expect(icon).not.toContain('data:image');

    const close = panelCloseIcon();
    expect(close).toContain('ymz-icon-panel-close');
    expect(close).toContain('stroke="currentColor"');

    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    expect(host.querySelector('[data-action="outline-fullscreen"] .ymz-icon-fullscreen')).not.toBeNull();
    expect(host.querySelector('[data-action="close-side-panel"] .ymz-icon-panel-close')).not.toBeNull();

    const studySource = readFileSync('src/editor/StudyPanelController.ts', 'utf8');
    expect(studySource).toContain('${fullscreenIcon()}');
    expect(studySource).toContain('${panelCloseIcon()}');
  });

  it('keeps destructive menu entries red and lets the node style panel move within the editor', () => {
    const panelSource = readFileSync('src/ui/nodeStylePanel.ts', 'utf8');
    const editorSource = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
    expect(css).toContain('.ymz-context-menu .b3-menu__item--warning');
    expect(css).toMatch(/\.ymz-node-style-panel__header\s*\{[^}]*cursor:move;[^}]*touch-action:none/s);
    expect(panelSource).toContain('beginPanelDrag');
    expect(panelSource).toContain("window.addEventListener('pointermove', this.onPanelDrag)");
    expect(panelSource).toContain('rootRect.width - panelRect.width - 8');
    expect(editorSource).toContain("'.ymz-topbar [data-action=\"project-style\"]'");
    expect(editorSource).toContain('this.projectStylePanel?.show(styleAnchor');
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
    expect(css).toMatch(/\.ymz-minimap\{[^}]*right:12px[^}]*bottom:48px/s);
    expect(css).toMatch(
      /\.ymz-topbar__desktop-utility:not\(\.ymz-separator\)\{padding-inline:7px!important\}/,
    );
  });

  it('V151-14 uses one opaque flat menu surface instead of glass item cards', () => {
    expect(css).toMatch(/\.ymz-context-menu\{[^}]*z-index:2147483000!important/s);
    expect(css).toMatch(/\.ymz-context-menu\{[^}]*background:var\(--ymz-menu-surface\)!important[^}]*backdrop-filter:none/s);
    expect(css).toMatch(/\.ymz-context-menu\[data-appearance="light"\]\{[^}]*--ymz-menu-surface:#fcfdff/s);
    expect(css).toMatch(/\.ymz-context-menu\[data-appearance="dark"\]\{[^}]*--ymz-menu-surface:#161922/s);
    expect(css).toMatch(/\.ymz-context-menu \.b3-menu__item\{[^}]*min-height:30px[^}]*background:transparent[^}]*box-shadow:none/s);
  });

  it('keeps the minimap hidden until the user explicitly opens it', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('默认隐藏缩略图');
    const root = host.querySelector<HTMLElement>('.ymz-editor')!;
    const minimap = host.querySelector<HTMLElement>('[data-role="minimap"]')!;
    const toggle = host.querySelector<HTMLButtonElement>('[data-action="toggle-minimap"]')!;
    expect(root.dataset.minimapVisible).toBe('false');
    expect(minimap.hidden).toBe(true);
    expect(toggle.classList.contains('is-active')).toBe(false);
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(toggle.title).toBe('显示缩略图');
  });

  it('does not render a hidden minimap and renders after the first explicit toggle', () => {
    const root = document.createElement('div');
    const minimap = document.createElement('aside');
    minimap.hidden = true;
    minimap.innerHTML = '<div data-role="minimap-content"></div><div data-role="minimap-viewport"></div>';
    root.appendChild(minimap);
    document.body.appendChild(root);
    const request = vi.spyOn(window, 'requestAnimationFrame').mockImplementation(() => 41);
    const map = { on: vi.fn(), off: vi.fn() } as any;
    const controller = new MiniMapController(root, map, minimap);
    expect(request).not.toHaveBeenCalled();
    expect(controller.toggle()).toBe(true);
    expect(request).toHaveBeenCalledOnce();
    expect(minimap.hidden).toBe(false);
    controller.destroy();
    root.remove();
    request.mockRestore();
  });

  it('uses a quiet saved state without a permanent green button background', () => {
    expect(css).toMatch(/\.ymz-topbar \.ymz-save-state\{[^}]*background:transparent!important/s);
    expect(css).not.toMatch(/\.ymz-topbar \.ymz-save-state[^}]*linear-gradient/s);
    expect(css).toMatch(/\.ymz-save-state\[data-save-state="failed"\]\{[^}]*color:/s);
  });

  it('V151-14 rechecks native and web menus after submenu growth', () => {
    const source = readFileSync('src/ui/contextMenu.ts', 'utf8');
    expect(source.match(/attachContextMenuViewportGuard\(menu\.element\);/g)).toHaveLength(3);
  });

  it('V151-14 clamps native menu and submenu rectangles to all four viewport edges', () => {
    const menu = document.createElement('div');
    menu.className = 'ymz-context-menu';
    const items = document.createElement('div');
    items.className = 'b3-menu__items';
    const submenu = document.createElement('div');
    submenu.className = 'b3-menu__submenu';
    const submenuItems = document.createElement('div');
    submenuItems.className = 'b3-menu__items';
    submenu.appendChild(submenuItems);
    menu.append(items, submenu);
    document.body.appendChild(menu);
    menu.getBoundingClientRect = () => ({
      left: 900, top: 760, right: 1140, bottom: 1320, width: 240, height: 560,
      x: 900, y: 760, toJSON: () => ({}),
    });
    items.getBoundingClientRect = () => ({
      left: 900, top: 768, right: 1140, bottom: 1312, width: 240, height: 544,
      x: 900, y: 768, toJSON: () => ({}),
    });
    submenu.getBoundingClientRect = () => ({
      left: 970, top: 930, right: 1250, bottom: 1530, width: 280, height: 600,
      x: 970, y: 930, toJSON: () => ({}),
    });
    submenuItems.getBoundingClientRect = () => ({
      left: 970, top: 938, right: 1250, bottom: 1522, width: 280, height: 584,
      x: 970, y: 938, toJSON: () => ({}),
    });

    constrainContextMenuToViewport(menu, { width: 1000, height: 800 });

    expect(menu.style.left).toBe('752px');
    expect(menu.style.top).toBe('232px');
    expect(menu.style.maxHeight).toBe('784px');
    expect(submenu.style.left).toBe('712px');
    expect(submenu.style.top).toBe('192px');
    expect(submenu.style.maxHeight).toBe('784px');
    menu.remove();
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
