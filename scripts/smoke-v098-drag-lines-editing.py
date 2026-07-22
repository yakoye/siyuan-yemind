"""v0.9.8 canvas drag-edge continuity and flat text-editing regression."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def canvas_box(page, text):
    value = page.evaluate("""text=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);
      if(!node)return null;const rect=node.getBoundingClientRect();return{x:rect.x,y:rect.y,width:rect.width,height:rect.height};
    }""", text)
    if not value:
        raise RuntimeError(f'Missing canvas node: {text}')
    return value


def visible_tree_lines(page):
    return page.evaluate("""()=>[...document.querySelectorAll('.smm-line-container path')]
      .filter(path=>getComputedStyle(path).display!=='none'&&Number(getComputedStyle(path).opacity||1)>0)
      .map(path=>({d:path.getAttribute('d')||'',stroke:path.getAttribute('stroke')||'',dash:path.getAttribute('stroke-dasharray')||''}))""")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1380, 'height': 880})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1320px;height:840px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0.9.8 Drag Edge Smoke','logicalStructure');
      await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children:[
        {data:{uid:'a',text:'Node A'},children:[]},
        {data:{uid:'b',text:'Node B'},children:[]},
        {data:{uid:'c',text:'Node C'},children:[]},
        {data:{uid:'d',text:'Node D'},children:[]}
      ]}});
      const container=document.createElement('div');container.style.cssText='width:1280px;height:800px;display:block';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(350)

    before_lines = visible_tree_lines(page)
    if len(before_lines) != 4:
        raise RuntimeError(f'Unexpected baseline tree-line count: {before_lines}')

    # Drag D before B. D's original incoming line is replaced by the green
    # guide, but Root->A/B/C must remain as visible solid tree lines while the
    # room-making preview shifts B/C/D-related positions.
    d_box = canvas_box(page, 'Node D')
    b_box = canvas_box(page, 'Node B')
    page.mouse.move(d_box['x'] + 18, d_box['y'] + d_box['height'] / 2)
    page.mouse.down()
    page.mouse.move(b_box['x'] + 6, b_box['y'] + 2, steps=14)
    page.wait_for_timeout(120)
    during_lines = visible_tree_lines(page)
    guides = page.evaluate("""()=>[...document.querySelectorAll('[data-role=canvas] svg path')]
      .filter(path=>getComputedStyle(path).display!=='none'&&path.getAttribute('stroke-dasharray')==='6 6')
      .map(path=>path.getAttribute('d')||'')""")
    if len(during_lines) != 3:
        raise RuntimeError(f'Unaffected tree lines disappeared during drag: before={before_lines}, during={during_lines}')
    if not guides:
        raise RuntimeError('Continuous green parent guide missing during edge-continuity check')

    # Switching to CHILD keeps the same number of unaffected solid lines and
    # changes only the green guide parent.
    a_box = canvas_box(page, 'Node A')
    first_guide = guides[0]
    page.mouse.move(a_box['x'] + a_box['width'] + 28, a_box['y'] + a_box['height'] / 2, steps=10)
    page.wait_for_timeout(90)
    child_lines = visible_tree_lines(page)
    child_guides = page.evaluate("""()=>[...document.querySelectorAll('[data-role=canvas] svg path')]
      .filter(path=>getComputedStyle(path).display!=='none'&&path.getAttribute('stroke-dasharray')==='6 6')
      .map(path=>path.getAttribute('d')||'')""")
    if len(child_lines) != 3:
        raise RuntimeError(f'Normal tree-line continuity broke after parent switch: {child_lines}')
    if not child_guides or child_guides[0] == first_guide:
        raise RuntimeError(f'Green guide did not switch parent: {first_guide!r} -> {child_guides!r}')

    page.keyboard.press('Escape')
    page.mouse.up()
    page.wait_for_timeout(180)
    restored_lines = visible_tree_lines(page)
    if len(restored_lines) != 4:
        raise RuntimeError(f'Original tree lines did not restore after cancel: {restored_lines}')

    # Double-click editing keeps the node's own selection treatment, but the
    # editor overlay itself must add no border, outline or shadow.
    a_box = canvas_box(page, 'Node A')
    page.mouse.dblclick(a_box['x'] + a_box['width'] / 2, a_box['y'] + a_box['height'] / 2)
    page.wait_for_selector('.smm-richtext-node-edit-wrap .ql-editor', timeout=5000)
    page.wait_for_timeout(80)
    edit_visual = page.evaluate("""()=>{
      const wrap=document.querySelector('.smm-richtext-node-edit-wrap');
      const container=wrap?.matches('.ql-container')?wrap:wrap?.querySelector('.ql-container');
      const editor=wrap?.querySelector('.ql-editor');
      const pick=el=>{const s=getComputedStyle(el);return{border:s.border,outline:s.outline,shadow:s.boxShadow,background:s.backgroundColor}};
      return {wrap:pick(wrap),container:pick(container),editor:pick(editor)};
    }""")
    for name, item in edit_visual.items():
        if not item['border'].startswith('0px') or 'none 0px' not in item['outline'] or item['shadow'] != 'none':
            raise RuntimeError(f'Canvas editor added an extra focus frame on {name}: {edit_visual}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({
        'baselineSolidLines': len(before_lines),
        'dragSolidLines': len(during_lines),
        'childSolidLines': len(child_lines),
        'restoredSolidLines': len(restored_lines),
        'guideSwitched': child_guides[0] != first_guide,
        'editVisual': edit_visual,
        'pageErrors': 0,
        'consoleErrors': 0,
    })
    browser.close()
