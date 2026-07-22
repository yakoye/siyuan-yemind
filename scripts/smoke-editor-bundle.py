from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock = (() => {
  class Plugin {
    constructor() {
      this.name = 'siyuan-yemind';
      this.app = {};
      this.setting = { addItem() {} };
      this.eventBus = { on() {}, off() {} };
    }
    addIcons() {}
    addTab(options) { window.__tabOptions = options; return () => ({}); }
    addDock(options) { window.__dockOptions = options; return {}; }
    addTopBar() { const button=document.createElement('button'); document.body.appendChild(button); return button; }
    addCommand() {}
    getOpenedTab() { return {}; }
    async loadData() { return null; }
    async saveData() {}
    async removeData() {}
    openSetting() {}
  }
  class Menu { constructor(){ this.element=document.createElement('div'); } addItem(){return document.createElement('div')} addSeparator(){return document.createElement('div')} open(){} close(){} }
  class Dialog { constructor(){ this.element=document.createElement('div'); } destroy(){} }
  class Setting { addItem(){} }
  return {
    Plugin, Menu, Dialog, Setting,
    openTab: async () => ({ headElement: document.createElement('div'), updateTitle() {}, close() {} }),
    confirm: (_t,_x,cb) => cb?.(),
    showMessage: () => {},
  };
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};\n{ const module=window.__outerModule; const exports=module.exports; const require=(name)=>{ if(name==='siyuan') return window.__siyuanMock; throw new Error('Unexpected external '+name); };\n" + bundle + "\nwindow.__YeMindExport=module.exports; }\n"
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page_errors=[]
    console_errors=[]
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0;width:1280px;height:900px"><div id="host" style="width:1200px;height:800px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    setup = page.evaluate("""async () => {
      const Plugin = window.__YeMindExport;
      const plugin = new Plugin();
      plugin.onload();
      await plugin.whenReady();
      const map = await plugin.repository.create('Theme Runtime Smoke', 'logicalStructure');
      const container = document.createElement('div');
      container.style.width = '1100px';
      container.style.height = '720px';
      container.style.display = 'block';
      document.querySelector('#host').appendChild(container);
      const head = document.createElement('button');
      document.body.appendChild(head);
      const context = {
        element: container,
        data: { mapId: map.id },
        tab: {
          headElement: head,
          updateTitle(title) { this.title = title; },
          close() { this.closed = true; },
        },
      };
      window.__pluginSmoke = { plugin, map, container, context };
      window.__tabOptions.init.call(context);
      return { mapId: map.id, tabRegistered: Boolean(window.__tabOptions) };
    }""")
    page.wait_for_function("""() => {
      const root = window.__pluginSmoke?.container;
      return root?.querySelector('[data-role="canvas"] svg') || root?.querySelector('.ymz-missing');
    }""", timeout=30000)
    initial_visual = page.evaluate("""() => {
      const container = window.__pluginSmoke.container;
      const svg = container.querySelector('[data-role="canvas"] svg');
      const shapes = [...svg.querySelectorAll('.smm-node-shape')];
      const lines = [...svg.querySelectorAll('.smm-line-container path')];
      return {
        transform: svg.querySelector('.smm-container')?.getAttribute('transform') || '',
        root: { fill: shapes[0]?.getAttribute('fill'), stroke: shapes[0]?.getAttribute('stroke'), width: shapes[0]?.getAttribute('stroke-width') },
        branch: { fill: shapes[1]?.getAttribute('fill'), stroke: shapes[1]?.getAttribute('stroke'), width: shapes[1]?.getAttribute('stroke-width') },
        lineColors: lines.map(line => line.getAttribute('stroke')),
      };
    }""")
    page.evaluate("""() => {
      const themeSelect = window.__pluginSmoke.container.querySelector('select[data-action="theme"]');
      themeSelect.value = 'scheme-dawn';
      themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    page.wait_for_function("""() => {
      const svg = window.__pluginSmoke.container.querySelector('[data-role="canvas"] svg');
      const shape = svg?.querySelectorAll('.smm-node-shape')[1];
      const line = svg?.querySelector('.smm-line-container path');
      return shape?.getAttribute('fill') === '#ff6b6b' && line?.getAttribute('stroke') === '#ff6b6b';
    }""", timeout=3000)
    theme_visual = page.evaluate("""() => {
      const { plugin, map, container } = window.__pluginSmoke;
      const svg = container.querySelector('[data-role="canvas"] svg');
      const shapes = [...svg.querySelectorAll('.smm-node-shape')];
      const lines = [...svg.querySelectorAll('.smm-line-container path')];
      return {
        transform: svg.querySelector('.smm-container')?.getAttribute('transform') || '',
        root: { fill: shapes[0]?.getAttribute('fill'), stroke: shapes[0]?.getAttribute('stroke'), width: shapes[0]?.getAttribute('stroke-width') },
        branch: { fill: shapes[1]?.getAttribute('fill'), stroke: shapes[1]?.getAttribute('stroke'), width: shapes[1]?.getAttribute('stroke-width') },
        lineColors: lines.map(line => line.getAttribute('stroke')),
        selectedTheme: container.querySelector('select[data-action="theme"]')?.value || '',
        persistedTheme: plugin.repository.get(map.id)?.theme || '',
      };
    }""")
    page.evaluate("""() => {
      const select = window.__pluginSmoke.container.querySelector('select[data-project-style="rainbowScheme"]');
      select.value = 'code';
      select.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    page.wait_for_function("""() => {
      const lines = window.__pluginSmoke.container.querySelectorAll('.smm-line-container path');
      return lines[0]?.getAttribute('stroke') === '#fff0b8' && lines[1]?.getAttribute('stroke') === '#cbffb8';
    }""", timeout=3000)
    page.wait_for_timeout(700)
    rainbow_visual = page.evaluate("""() => {
      const { plugin, map, container } = window.__pluginSmoke;
      const svg = container.querySelector('[data-role="canvas"] svg');
      const shapes = [...svg.querySelectorAll('.smm-node-shape')];
      const lines = [...svg.querySelectorAll('.smm-line-container path')];
      return {
        transform: svg.querySelector('.smm-container')?.getAttribute('transform') || '',
        branchFill: shapes[1]?.getAttribute('fill'),
        lineColors: lines.map(line => line.getAttribute('stroke')),
        persistedTheme: plugin.repository.get(map.id)?.theme || '',
        persistedProjectStyle: plugin.repository.get(map.id)?.projectStyle || null,
      };
    }""")
    page.evaluate("""() => {
      const themeSelect = window.__pluginSmoke.container.querySelector('select[data-action="theme"]');
      themeSelect.value = 'yemind-default';
      themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }""")
    page.wait_for_function("""() => {
      const shapes = window.__pluginSmoke.container.querySelectorAll('.smm-node-shape');
      return shapes[0]?.getAttribute('fill') === '#ffffff' &&
        shapes[0]?.getAttribute('stroke') === '#cbd5e1' &&
        shapes[1]?.getAttribute('fill') === '#ffffff' &&
        shapes[1]?.getAttribute('stroke') === '#cbd5e1';
    }""", timeout=3000)
    page.evaluate("""() => { document.documentElement.dataset.themeMode = 'dark'; }""")
    page.wait_for_function("""() => {
      const shapes = window.__pluginSmoke.container.querySelectorAll('.smm-node-shape');
      return shapes[0]?.getAttribute('fill') === '#0b1220' &&
        shapes[0]?.getAttribute('stroke') === '#64748b' &&
        shapes[1]?.getAttribute('fill') === '#0b1220' &&
        shapes[1]?.getAttribute('stroke') === '#64748b';
    }""", timeout=3000)
    dark_visual = page.evaluate("""() => {
      const { container } = window.__pluginSmoke;
      const svg = container.querySelector('[data-role="canvas"] svg');
      const shapes = [...svg.querySelectorAll('.smm-node-shape')];
      return {
        transform: svg.querySelector('.smm-container')?.getAttribute('transform') || '',
        appearance: container.querySelector('.ymz-editor')?.dataset.appearance || '',
        root: { fill: shapes[0]?.getAttribute('fill'), stroke: shapes[0]?.getAttribute('stroke'), width: shapes[0]?.getAttribute('stroke-width') },
        branch: { fill: shapes[1]?.getAttribute('fill'), stroke: shapes[1]?.getAttribute('stroke'), width: shapes[1]?.getAttribute('stroke-width') },
      };
    }""")
    result = page.evaluate("""() => {
      const { plugin, map, container } = window.__pluginSmoke;
      const canvas = container.querySelector('[data-role="canvas"]');
      const svg = canvas?.querySelector('svg');
      const themeSelect = container.querySelector('select[data-action="theme"]');
      const groups = themeSelect ? [...themeSelect.querySelectorAll('optgroup')].map(group => ({ label: group.label, count: group.querySelectorAll('option').length })) : [];
      const nodes = svg ? svg.querySelectorAll('[data-node-uid], .smm-node, g').length : 0;
      return {
        pluginName: plugin.name,
        mapId: map.id,
        editorMounted: Boolean(container.querySelector('.ymz-editor')),
        canvasMounted: Boolean(canvas),
        svgMounted: Boolean(svg),
        missingMessage: container.querySelector('.ymz-missing')?.textContent || '',
        themeOptionCount: themeSelect?.querySelectorAll('option').length || 0,
        themeGroups: groups,
        selectedTheme: themeSelect?.value || '',
        persistedTheme: plugin.repository.get(map.id)?.theme || '',
        svgNodeLikeCount: nodes,
      };
    }""")
    if page_errors:
      raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
      raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    if not result['editorMounted'] or not result['svgMounted'] or result['themeOptionCount'] != 22:
      raise RuntimeError(f'Editor smoke failed: setup={setup}, result={result}')
    if initial_visual['root'] != {'fill': '#ffffff', 'stroke': '#cbd5e1', 'width': '2'}:
      raise RuntimeError(f'Initial border rendering failed: {initial_visual}')
    if theme_visual['branch'] != {'fill': '#ff6b6b', 'stroke': 'transparent', 'width': '0'}:
      raise RuntimeError(f'Immediate theme refresh failed: {theme_visual}')
    if theme_visual['selectedTheme'] != 'scheme-dawn':
      raise RuntimeError(f'Theme selection failed: {theme_visual}')
    if rainbow_visual['lineColors'][:2] != ['#fff0b8', '#cbffb8']:
      raise RuntimeError(f'Immediate rainbow refresh failed: {rainbow_visual}')
    if rainbow_visual['branchFill'] != '#ff6b6b':
      raise RuntimeError(f'Rainbow change overwrote theme node colors: {rainbow_visual}')
    if rainbow_visual['persistedTheme'] != 'scheme-dawn':
      raise RuntimeError(f'Theme persistence failed: {rainbow_visual}')
    if rainbow_visual['persistedProjectStyle'].get('rainbowScheme') != 'code' or rainbow_visual['persistedProjectStyle'].get('rainbowLines') is not True:
      raise RuntimeError(f'Rainbow persistence failed: {rainbow_visual}')
    if dark_visual['appearance'] != 'dark' or dark_visual['root'] != {'fill': '#0b1220', 'stroke': '#64748b', 'width': '2'}:
      raise RuntimeError(f'Host dark appearance refresh failed: {dark_visual}')
    if dark_visual['branch'] != {'fill': '#0b1220', 'stroke': '#64748b', 'width': '2'}:
      raise RuntimeError(f'Dark border rendering failed: {dark_visual}')
    if len({initial_visual['transform'], theme_visual['transform'], rainbow_visual['transform'], dark_visual['transform']}) != 1:
      raise RuntimeError(f'Appearance refresh changed the viewport: {initial_visual}, {theme_visual}, {rainbow_visual}, {dark_visual}')
    print({'editor': result, 'initial': initial_visual, 'theme': theme_visual, 'rainbow': rainbow_visual, 'dark': dark_visual})
    browser.close()
