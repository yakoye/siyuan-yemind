from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
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
    addTab() { return () => ({ headElement: document.createElement('div'), updateTitle() {}, close() {} }); }
    addDock() { return {}; }
    addTopBar() { return document.createElement('button'); }
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
    page = browser.new_page()
    errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content('<!doctype html><html><body><div id="app"></div></body></html>')
    page.add_script_tag(content=wrapped)
    result = page.evaluate("""() => ({
      type: typeof window.__YeMindExport,
      name: window.__YeMindExport?.name || null,
      prototypeMethods: window.__YeMindExport ? Object.getOwnPropertyNames(window.__YeMindExport.prototype) : [],
    })""")
    if errors:
      raise RuntimeError('Browser errors: ' + '\n'.join(errors))
    if result['type'] != 'function':
      raise RuntimeError(f'Unexpected export: {result}')
    print(result)
    browser.close()
