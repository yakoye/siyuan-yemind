"""Current image-control regression retained under the historical v0.9.5 smoke entry."""
from pathlib import Path
from playwright.sync_api import sync_playwright
import base64

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
svg_source = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#eee"/><circle cx="100" cy="50" r="30" fill="#999"/></svg>'
image_data = 'data:image/svg+xml;base64,' + base64.b64encode(svg_source.encode()).decode()
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.appendChild(this.element)}destroy(){this.element.remove()}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:()=>{},showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 840})
    page_errors, console_errors = [], []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1200px;height:800px"></div></body></html>')
    page.add_style_tag(content=stylesheet)
    page.add_script_tag(content=wrapped)
    page.evaluate("""async image=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('Image Tool Smoke','logicalStructure');
      await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children:[{data:{uid:'img',text:'Image Node',image,imageTitle:'Diagram',imageSize:{width:200,height:100,custom:true},tag:['keep-image']},children:[]}]}});
      const container=document.createElement('div');container.style.cssText='width:1120px;height:760px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,context};window.__tabOptions.init.call(context);
    }""", image_data)
    page.wait_for_selector('g.smm-node image', timeout=30000)
    image = page.locator('g.smm-node image')
    image.hover()
    page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='hover'")
    hover = page.evaluate("""()=>{const f=document.querySelector('.ymz-node-image-frame');return{mode:f.dataset.mode,handles:[...f.querySelectorAll('.ymz-node-image-resize-handle')].map(h=>getComputedStyle(h).display),toolbar:getComputedStyle(f.querySelector('.ymz-node-image-toolbar')).display}}""")
    if hover['mode'] != 'hover' or any(value != 'none' for value in hover['handles']) or hover['toolbar'] != 'none':
        raise RuntimeError(f'Hover state is wrong: {hover}')

    image.click()
    page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='selected'")
    selected = page.evaluate("""()=>{const f=document.querySelector('.ymz-node-image-frame');return{handles:f.querySelectorAll('.ymz-node-image-resize-handle').length,actions:[...f.querySelectorAll('[data-image-action]')].map(b=>b.dataset.imageAction),active:[...document.querySelectorAll('g.smm-node.active')].map(n=>n.textContent.trim())}}""")
    if selected['handles'] != 8 or selected['actions'] != ['replace','delete'] or not any('Image Node' in item for item in selected['active']):
        raise RuntimeError(f'Selected state is wrong: {selected}')

    # Pressing controls must not create a structural drag session.
    for selector in ['[data-image-action="replace"]', '.ymz-node-image-resize-handle[data-handle="e"]']:
        box = page.locator(selector).bounding_box()
        if not box:
            raise RuntimeError(f'Missing image control: {selector}')
        page.mouse.move(box['x'] + box['width']/2, box['y'] + box['height']/2)
        page.mouse.down()
        page.mouse.move(box['x'] + 18, box['y'] + 12, steps=3)
        page.mouse.up()
        page.wait_for_timeout(60)
        state = page.evaluate("""()=>({dragGhost:Boolean(document.querySelector('.smm-drag-node,.ymz-outline-drag-ghost')),customGuides:[...document.querySelectorAll('path')].filter(p=>['4 6','6 6'].includes(p.getAttribute('stroke-dasharray'))&&getComputedStyle(p).display!=='none').length})""")
        if state['dragGhost'] or state['customGuides']:
            raise RuntimeError(f'Image control started structural drag: {selector}, {state}')
        # Replace opens a dialog and closes selection; restore selection for next control.
        if selector.startswith('[data-image-action'):
            page.evaluate("()=>document.querySelector('.b3-dialog')?.remove()")
            image.click()
            page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='selected'")

    final = page.evaluate("""()=>JSON.parse(JSON.stringify(window.__smoke.plugin.repository.get(window.__smoke.map.id).data))""")
    child = final['children'][0]['data']
    if 'Image Node' not in child['text'] or child.get('tag') != ['keep-image'] or not child.get('image'):
        raise RuntimeError(f'Image control interaction damaged node data: {child}')
    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({'hover': hover, 'selected': selected, 'structuralDragIsolated': True, 'dataPreserved': True, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
