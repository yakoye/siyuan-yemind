from pathlib import Path
from playwright.sync_api import sync_playwright
import base64
import re

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
svg_source = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="100"><rect width="200" height="100" fill="#eee"/><circle cx="100" cy="50" r="30" fill="#999"/></svg>'
image_data = 'data:image/svg+xml;base64,' + base64.b64encode(svg_source.encode()).decode()
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:()=>{},showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def plain(value):
    return re.sub(r'<[^>]+>', '', value or '').strip()


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 840})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1200px;height:800px"></div></body></html>')
    page.add_style_tag(content=stylesheet)
    page.add_script_tag(content=wrapped)
    page.evaluate("""async image=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0.9.5 Image Tool Smoke','logicalStructure');
      await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children:[{data:{uid:'img',text:'Image Node',image,imageTitle:'Diagram',imageSize:{width:200,height:100,custom:true},tag:['keep-image']},children:[]}]}});
      const container=document.createElement('div');container.style.cssText='width:1120px;height:760px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,context};window.__tabOptions.init.call(context);
    }""", image_data)
    page.wait_for_selector('g.smm-node image', timeout=30000)
    page.locator('g.smm-node image').dispatch_event('mousemove')
    page.wait_for_function("""()=>getComputedStyle(document.querySelector('.node-img-handle')).display==='block'""", timeout=5000)

    metrics = page.evaluate("""()=>{
      const handle=document.querySelector('.node-img-handle');
      const remove=handle.querySelector('.node-image-remove');
      const preview=handle.querySelector('.ymz-node-image-preview');
      const resize=handle.querySelector('.node-image-resize');
      const removeSvg=remove.querySelector('svg');const previewSvg=preview.querySelector('svg');const resizeSvg=resize.querySelector('svg');
      const rect=value=>{const r=value.getBoundingClientRect();return [r.width,r.height]};
      const visual=value=>{const r=value.getBoundingClientRect();const b=value.getBBox();const view=value.viewBox.baseVal;return [b.width/view.width*r.width,b.height/view.height*r.height]};
      return {removeBox:rect(remove),previewBox:rect(preview),resizeBox:rect(resize),removeSvg:rect(removeSvg),previewSvg:rect(previewSvg),resizeSvg:rect(resizeSvg),removeVisual:visual(removeSvg),previewVisual:visual(previewSvg)};
    }""")
    if metrics['removeBox'] != metrics['previewBox'] or metrics['removeBox'] != metrics['resizeBox']:
        raise RuntimeError(f'Image action boxes changed size: {metrics}')
    if metrics['removeSvg'] != [18, 18]:
        raise RuntimeError(f'Trash SVG was not reduced independently: {metrics}')
    if abs(metrics['removeVisual'][0] - metrics['previewVisual'][0]) > 1.2 or abs(metrics['removeVisual'][1] - metrics['previewVisual'][1]) > 1.2:
        raise RuntimeError(f'Trash and magnifier visual weights do not match: {metrics}')

    initial = page.evaluate("""()=>JSON.parse(JSON.stringify(window.__smoke.plugin.repository.get(window.__smoke.map.id).data))""")
    for selector in ['.node-image-remove', '.ymz-node-image-preview']:
        box = page.locator(selector).bounding_box()
        page.dispatch_event(selector, 'mousedown', {'button': 0, 'clientX': box['x'] + box['width']/2, 'clientY': box['y'] + box['height']/2})
        page.mouse.move(box['x'] + 50, box['y'] + 50, steps=5)
        page.dispatch_event(selector, 'mouseup', {'button': 0, 'clientX': box['x'] + 50, 'clientY': box['y'] + 50})
        page.wait_for_timeout(80)
        state = page.evaluate("""()=>({dragGhost:Boolean(document.querySelector('.smm-drag-node,.ymz-outline-drag-ghost')),customGuides:[...document.querySelectorAll('path')].filter(p=>['4 6','6 6'].includes(p.getAttribute('stroke-dasharray'))&&getComputedStyle(p).display!=='none').length})""")
        if state['dragGhost'] or state['customGuides']:
            raise RuntimeError(f'Image tool started structural node drag: {selector}, {state}')

    final = page.evaluate("""()=>JSON.parse(JSON.stringify(window.__smoke.plugin.repository.get(window.__smoke.map.id).data))""")
    if plain(final['children'][0]['data']['text']) != 'Image Node' or final['children'][0]['data'].get('tag') != ['keep-image']:
        raise RuntimeError('Image tool interaction damaged node data')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({'metrics': metrics, 'structuralDragIsolated': True, 'dataPreserved': True, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
