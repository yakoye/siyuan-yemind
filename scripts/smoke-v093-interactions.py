"""Historical v0.9.3 regressions retained for root fill and hover quick actions."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock = (() => {
  class Plugin {
    constructor() { this.name='siyuan-yemind'; this.app={}; this.setting={addItem(){}}; this.eventBus={on(){},off(){}}; }
    addIcons() {} addTab(options){window.__tabOptions=options;return()=>({})} addDock(){return{}} addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu { constructor(){this.element=document.createElement('div')} addItem(){return document.createElement('div')} addSeparator(){return document.createElement('div')} open(){} close(){} }
  class Dialog { constructor(){this.element=document.createElement('div')} destroy(){} }
  class Setting { addItem(){} }
  return {Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 900})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1200px;height:800px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0.9.4 Historical Interaction Smoke','logicalStructure');map.data.children=[{data:{uid:'child',text:'悬停节点',expand:true},children:[]}];await plugin.repository.update(map.id,{data:map.data});const container=document.createElement('div');container.style.cssText='width:1100px;height:720px;display:block';host.append(container);const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);}""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)

    page.locator('[data-action="theme-gallery"]').click()
    page.wait_for_selector('[data-role="theme-choice-panel"]:not([hidden])')
    page.locator('[data-role="theme-choice-panel"] [data-project-choice-value="scheme-dawn"]').click()
    page.wait_for_function("""()=>{const c=window.__smoke.container;const root=c.querySelector('.smm-node-shape');return root?.getAttribute('fill')==='#ffffff'&&getComputedStyle(c.querySelector('[data-role="canvas"]')).backgroundColor==='rgb(255, 255, 255)' }""", timeout=5000)
    root_fill = page.eval_on_selector('.smm-node-shape', "el=>el.getAttribute('fill')")

    shapes = page.locator('.smm-node-shape')
    hover_actions = []
    hover_alive = False
    for index in range(shapes.count()):
        box = shapes.nth(index).bounding_box()
        if not box:
            continue
        page.mouse.move(box['x'] + box['width'] / 2, box['y'] + box['height'] / 2)
        page.wait_for_timeout(100)
        host = page.locator('.ymz-node-quick-actions[data-quick-hovered="true"]')
        if host.count() != 1:
            continue
        actions = host.locator('[data-node-quick-action]').evaluate_all("nodes=>nodes.map(node=>node.dataset.nodeQuickAction)")
        if 'add-child' not in actions:
            continue
        host_box = host.bounding_box()
        if not host_box:
            continue
        page.mouse.move(host_box['x'] + host_box['width'] / 2, host_box['y'] + host_box['height'] / 2, steps=6)
        page.wait_for_timeout(350)
        hover_actions = actions
        hover_alive = host.count() == 1
        break

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    if root_fill != '#ffffff':
        raise RuntimeError(f'Root theme background failed: {root_fill}')
    if not hover_alive:
        raise RuntimeError(f'Hover quick action bridge failed: {hover_actions}')
    print({'rootFill': root_fill, 'hoverActions': hover_actions, 'hoverBridge': hover_alive})
    browser.close()
