"""Browser regression for v0.9.31 theme dropdown palette presentation."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div')}addItem(){}addSeparator(){}open(){}close(){}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-theme-primary-lightest:#dcefe9;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
html[data-theme-mode="dark"]{--b3-theme-background:#17191d;--b3-theme-surface:#22252b;--b3-theme-on-background:#eef1f5;--b3-theme-on-surface:#d7dbe2;--b3-theme-on-surface-light:#aab0ba;--b3-theme-primary:#62d1a8;--b3-theme-primary-lightest:#203b33;--b3-list-hover:#2b3037;--b3-border-color:#3a3f48}
body{margin:0;background:var(--b3-theme-background);color:var(--b3-theme-on-background)}
'''

def luma(rgb):
    nums=[int(float(x.strip())) for x in rgb.replace('rgba(','').replace('rgb(','').replace(')','').split(',')[:3]]
    return sum(nums)/3

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':760})
    errors=[]
    console_errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content('<div id="host" style="width:1260px;height:740px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();window.__plugin=plugin;plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0931','logicalStructure');window.__mapId=map.id;
      const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);
      window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});
    }""")
    page.wait_for_selector('[data-action="theme-gallery"]', timeout=30000)
    editor=page.locator('.ymz-editor:not(.ymz-measurement-host)')
    theme_button=editor.locator('[data-action="theme-gallery"]')
    theme_button.click()
    panel=editor.locator('[data-role="theme-choice-panel"]:not([hidden])')
    panel.wait_for()
    if 'is-palette' not in (panel.get_attribute('class') or ''):
        raise RuntimeError('theme panel is not using palette presentation')
    tabs=panel.locator('[data-project-choice-group]')
    tab_labels=tabs.all_inner_texts()
    if tab_labels != ['基础','缤纷','经典']:
        raise RuntimeError(f'existing theme groups changed: {tab_labels}')
    basis_cards=panel.locator('.ymz-project-choice-panel__palette-item')
    basic_count=basis_cards.count()
    if basic_count!=3:
        raise RuntimeError(f'basic themes missing: {basic_count}')
    for i in range(basis_cards.count()):
        if basis_cards.nth(i).locator('.ymz-project-choice-panel__palette-block').count()!=6:
            raise RuntimeError('basic theme does not show exactly six colors')

    panel.locator('[data-project-choice-group="缤纷"]').click()
    colorful=panel.locator('.ymz-project-choice-panel__palette-item')
    colorful_count=colorful.count()
    if colorful_count!=10:
        raise RuntimeError(f'colorful theme count changed: {colorful_count}')
    if any(colorful.nth(i).locator('.ymz-project-choice-panel__palette-block').count()!=6 for i in range(colorful.count())):
        raise RuntimeError('a colorful theme does not show exactly six colors')
    selected=panel.locator('[data-project-choice-value="scheme-dawn"]')
    selected.click()
    page.wait_for_function("document.querySelector('[data-role=theme-choice-panel]')?.hidden===true")
    value=editor.locator('[data-action="theme"]').input_value()
    if value!='scheme-dawn':
        raise RuntimeError(f'theme selection behavior changed: {value}')

    # Reopen: selected theme group is restored, and real palette colors survive dark chrome.
    theme_button.click(); panel.wait_for()
    active=panel.locator('.ymz-project-choice-panel__tab.is-active').inner_text()
    if active!='缤纷': raise RuntimeError(f'selected group not restored: {active}')
    dawn=panel.locator('[data-project-choice-value="scheme-dawn"]')
    if 'is-selected' not in (dawn.get_attribute('class') or ''):
        raise RuntimeError('selected theme card is not highlighted')
    colors_before=dawn.locator('.ymz-project-choice-panel__palette-block').evaluate_all("els=>els.map(e=>getComputedStyle(e).backgroundColor)")
    page.evaluate("document.documentElement.setAttribute('data-theme-mode','dark')")
    page.wait_for_function("document.querySelector('.ymz-editor:not(.ymz-measurement-host)')?.dataset.appearance==='dark'")
    colors_after=dawn.locator('.ymz-project-choice-panel__palette-block').evaluate_all("els=>els.map(e=>getComputedStyle(e).backgroundColor)")
    if colors_before!=colors_after:
        raise RuntimeError(f'dark mode altered actual theme colors: {colors_before} -> {colors_after}')
    panel_bg=panel.evaluate("e=>getComputedStyle(e).backgroundColor")
    if luma(panel_bg)>100:
        raise RuntimeError(f'dark panel chrome is too bright: {panel_bg}')
    panel.locator('[data-project-choice-action="close"]').click()

    # Line Style remains the original list presentation.
    editor.locator('[data-action="line-style-gallery"]').click()
    line_panel=editor.locator('[data-role="line-style-choice-panel"]:not([hidden])')
    line_panel.wait_for()
    if line_panel.locator('.ymz-project-choice-panel__list').count()!=1:
        raise RuntimeError('line style list presentation was changed')
    if line_panel.locator('.ymz-project-choice-panel__palette-grid').count()!=0:
        raise RuntimeError('line style incorrectly uses palette cards')

    if errors or console_errors:
        raise RuntimeError('Browser errors: '+repr(errors+console_errors))
    print({'tabs':tab_labels,'basic':basic_count,'colorful':colorful_count,'colors':len(colors_before),'selected':value,'darkPanel':panel_bg,'lineList':True})
    browser.close()
