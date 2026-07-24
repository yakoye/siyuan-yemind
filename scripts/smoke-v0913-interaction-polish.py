"""v0.9.19 marker bounds, stable measurement, compact panels, top menu and multi-selection smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  window.__menus=[];window.__dialogs=[];window.__messages=[];window.__commands=[];
  class Plugin{
    constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){}
    addTab(o){window.__tabOptions=o;return()=>({})}
    addDock(){return{}}
    addTopBar(){const b=document.createElement('button');b.id='yemind-topbar';document.body.appendChild(b);return b}
    addCommand(o){window.__commands.push(o)}
    getOpenedTab(){return{}}
    async loadData(){return null}
    async saveData(){}
    async removeData(){}
    openSetting(){}
  }
  class Menu{
    constructor(id){this.id=id;this.items=[];this.element=document.createElement('div');window.__menus.push(this)}
    addItem(item){this.items.push(item);return document.createElement('div')}
    addSeparator(){this.items.push({separator:true});return document.createElement('div')}
    open(pos){this.pos=pos;window.__lastMenu=this}
    close(){}
  }
  class Dialog{
    constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='mock-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this);window.__lastDialog=this}
    destroy(){this.element.remove()}
  }
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:(...args)=>window.__messages.push(args)};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def node_rect(page, text):
    value = page.evaluate("""text=>{const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);return node?.getBoundingClientRect().toJSON()||null}""", text)
    if not value:
        raise RuntimeError(f'Missing node: {text}')
    return value


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1500, 'height': 930})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('''<!doctype html><html><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1460px;height:890px"></div></body></html>''')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    defaults = page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const fresh=await plugin.repository.create('未命名导图','logicalStructure');const result={title:fresh.title,root:fresh.data.data.text,children:fresh.data.children.map(item=>item.data.text)};fresh.data.children[0].data.text='<p><span>Marker text</span></p>';fresh.data.children[0].data.richText=true;fresh.data.children[0].data.icon=['yemarkerpriority_priority-05'];fresh.data.children[1].data.text='Second node';fresh.data.children.push({data:{uid:'third',text:'Third node'},children:[]});await plugin.repository.update(fresh.id,{data:fresh.data});const container=document.createElement('div');container.style.cssText='width:1420px;height:850px;display:block';host.append(container);const context={element:container,data:{mapId:fresh.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};window.__smoke={plugin,fresh,container,context};window.__tabOptions.init.call(context);return result}""")
    if defaults != {'title': '未命名导图', 'root': '中心主题', 'children': ['新节点', '新节点']}:
        raise RuntimeError(f'Unexpected new map defaults: {defaults}')
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(450)

    marker = page.evaluate("""()=>{const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Marker text');if(!node)return null;const nr=node.getBoundingClientRect();const visible=[...node.querySelectorAll('rect')].map(el=>({el,r:el.getBoundingClientRect()})).filter(item=>item.r.width>=14&&item.r.width<=32&&item.r.height>=14&&item.r.height<=32);const sprite=[...node.querySelectorAll('image')].map(el=>el.getBoundingClientRect().toJSON());return{node:nr.toJSON(),text:node.querySelector('.smm-richtext-node-wrap')?.innerText.trim(),visible:visible.map(item=>item.r.toJSON()),sprite}}""")
    if not marker or marker['text'] != 'Marker text' or marker['node']['width'] >= 190 or not marker['visible']:
        raise RuntimeError(f'Marker rendered outside node or hid text: {marker}')
    for rect in marker['visible']:
        if rect['left'] < marker['node']['left'] - 1 or rect['right'] > marker['node']['right'] + 1:
            raise RuntimeError(f'Marker escaped node bounds: {marker}')

    measurement = page.evaluate("""()=>{const els=[...document.querySelectorAll('[data-yemind-measurement-owner=true]')];return{count:els.length,allStable:els.every(el=>el.parentElement?.dataset.yemindMeasurementHost==='true'),nodes:[...document.querySelectorAll('g.smm-node')].map(node=>({text:node.querySelector('.smm-richtext-node-wrap')?.innerText.trim()||'',r:node.getBoundingClientRect().toJSON()}))}}""")
    if measurement['count'] < 1 or not measurement['allStable']:
        raise RuntimeError(f'Measurement elements were not stabilized in the off-screen host: {measurement}')
    if any(not item['text'] or item['r']['width'] < 20 or item['r']['height'] < 15 for item in measurement['nodes']):
        raise RuntimeError(f'Blank/tiny node detected: {measurement}')

    # A hidden/visible tab resize cycle must not move measurement elements back into the canvas.
    page.evaluate("""()=>{const canvas=document.querySelector('.ymz-canvas');canvas.style.display='none';window.__tabOptions.resize.call(window.__smoke.context);canvas.style.display='';window.__tabOptions.resize.call(window.__smoke.context)}""")
    page.wait_for_timeout(180)
    post_resize = page.evaluate("""()=>({measurements:[...document.querySelectorAll('[data-yemind-measurement-owner=true]')].every(el=>el.parentElement?.dataset.yemindMeasurementHost==='true'),nodes:[...document.querySelectorAll('g.smm-node')].map(node=>({text:node.querySelector('.smm-richtext-node-wrap')?.innerText.trim()||'',r:node.getBoundingClientRect().toJSON()}))})""")
    if not post_resize['measurements'] or any(not item['text'] or item['r']['width'] < 20 for item in post_resize['nodes']):
        raise RuntimeError(f'Hidden tab resize collapsed nodes: {post_resize}')

    # Structure and Style buttons have visible hover feedback.
    hover_states = {}
    for name, selector in [('structure', '[data-action="layout-gallery"]'), ('style', '[data-action="project-style"]')]:
        before = page.eval_on_selector(selector, "el=>getComputedStyle(el).backgroundColor")
        page.hover(selector)
        after = page.eval_on_selector(selector, "el=>getComputedStyle(el).backgroundColor")
        hover_states[name] = {'before': before, 'after': after}
        if before == after or after != 'rgb(229, 231, 235)':
            raise RuntimeError(f'{name} toolbar hover feedback missing: {hover_states[name]}')

    page.click('[data-action="layout-gallery"]')
    if page.locator('[data-role="layout-gallery-panel"]').is_hidden():
        raise RuntimeError('Structure panel did not open')
    page.mouse.click(1380, 820)
    page.wait_for_timeout(60)
    if not page.locator('[data-role="layout-gallery-panel"]').is_hidden():
        raise RuntimeError('Structure panel did not close after outside click')

    # About is a top-level menu entry between Settings and Diagnostics.
    menu_labels = page.evaluate("""async()=>{await window.__smoke.plugin.openTopBarMenu(new MouseEvent('click',{clientX:12,clientY:12}));return window.__lastMenu.items.map(item=>item.separator?'---':item.label)}""")
    settings_index = menu_labels.index('设置')
    if settings_index < 0 or menu_labels[settings_index:settings_index + 3] != ['设置', '关于 YeMind', '诊断与回归']:
        raise RuntimeError(f'About menu order is wrong: {menu_labels}')
    page.evaluate("""()=>window.__lastMenu.items.find(item=>item.label==='关于 YeMind').click()""")
    about = page.evaluate("""()=>({exists:!!document.querySelector('.ymz-about-dialog'),version:document.querySelector('.ymz-about-dialog')?.textContent.includes('0.9.19'),title:window.__lastDialog?.options?.title||''})""")
    if not about['exists'] or not about['version'] or about['title'] != '关于 YeMind':
        raise RuntimeError(f'Standalone About dialog is wrong: {about}')

    # Ctrl multi-select followed by right-click on either selected node keeps both active and opens the multi menu.
    first = node_rect(page, 'Second node')
    second = node_rect(page, 'Third node')
    page.mouse.click(first['x'] + first['width'] / 2, first['y'] + first['height'] / 2)
    page.keyboard.down('Control')
    page.mouse.click(second['x'] + second['width'] / 2, second['y'] + second['height'] / 2)
    page.keyboard.up('Control')
    page.wait_for_timeout(80)
    page.mouse.click(first['x'] + first['width'] / 2, first['y'] + first['height'] / 2, button='right')
    page.wait_for_timeout(80)
    selection = page.evaluate("""()=>({active:[...document.querySelectorAll('g.smm-node.active')].map(node=>node.querySelector('.smm-richtext-node-wrap')?.innerText.trim()),menu:window.__lastMenu.items.map(item=>item.separator?'---':item.label)})""")
    if sorted(selection['active']) != ['Second node', 'Third node'] or '删除选中节点' not in selection['menu']:
        raise RuntimeError(f'Multi-selection was lost on right-click: {selection}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({'defaults': defaults, 'marker': marker, 'measurementCount': measurement['count'], 'hover': hover_states, 'about': about, 'selection': selection, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
