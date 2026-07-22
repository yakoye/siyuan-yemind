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
    theme_switch = page.evaluate("""async () => {
      const { plugin, map, container } = window.__pluginSmoke;
      const themeSelect = container.querySelector('select[data-action="theme"]');
      themeSelect.value = 'scheme-dawn';
      themeSelect.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise(resolve => setTimeout(resolve, 900));
      return {
        selectedTheme: themeSelect.value,
        persistedTheme: plugin.repository.get(map.id)?.theme || '',
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
    if theme_switch != {'selectedTheme': 'scheme-dawn', 'persistedTheme': 'scheme-dawn'}:
      raise RuntimeError(f'Theme switch persistence failed: {theme_switch}')
    print(result)
    browser.close()
