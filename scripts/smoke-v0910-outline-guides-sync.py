from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

children = []
for index in range(24):
    node = {"data": {"uid": f"n{index:02d}", "text": f"Node {index:02d}", "expand": True}, "children": []}
    if index == 0:
        node["children"] = [
            {"data": {"uid": "n00a", "text": "Node 00 A", "expand": True}, "children": [
                {"data": {"uid": "n00a1", "text": "Node 00 A1", "expand": True}, "children": [
                    {"data": {"uid": "n00a1x", "text": "Node 00 A1 X"}, "children": []}
                ]},
                {"data": {"uid": "n00a2", "text": "Node 00 A2"}, "children": []},
            ]},
            {"data": {"uid": "n00b", "text": "Node 00 B"}, "children": []},
        ]
    children.append(node)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1380, 'height': 820})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1320px;height:780px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async children=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0.9.10 Outline Guide Sync','logicalStructure');await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children}});const container=document.createElement('div');container.style.cssText='width:1280px;height:740px;display:block';host.append(container);const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);} """, children)
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.click('[data-action="view-split"]')
    page.wait_for_selector('[data-outline-guides] .ymz-outline-guide[data-outline-guide-parent="root"]', state='attached')
    page.wait_for_timeout(150)

    metrics = page.evaluate("""()=>{
      const tree=document.querySelector('[data-role=outline-tree]');
      const lines=[...tree.querySelectorAll('.ymz-outline-guide')].map(line=>{
        const uid=line.dataset.outlineGuideParent;
        const row=[...tree.querySelectorAll(':scope > [data-outline-uid]')].find(item=>item.dataset.outlineUid===uid);
        const tri=row?.querySelector('.ymz-outline-row__triangle[data-direction="down"]');
        const lr=line.getBoundingClientRect();const tr=tri?.getBoundingClientRect();
        return {uid,width:lr.width,left:lr.left,top:lr.top,bottom:lr.bottom,triangleX:tr?tr.left+tr.width/2:null,triangleBottom:tr?.bottom??null,color:getComputedStyle(line).backgroundColor};
      });
      return {position:getComputedStyle(tree).position,lines};
    }""")
    if metrics['position'] != 'relative':
        raise RuntimeError(f'Outline root must position the single guide layer: {metrics}')
    expected_parents = {'root', 'n00', 'n00a', 'n00a1'}
    actual_parents = {item['uid'] for item in metrics['lines']}
    if actual_parents != expected_parents or len(metrics['lines']) != len(expected_parents):
        raise RuntimeError(f'Guide parent set or duplicate rendering failed: {metrics}')
    for item in metrics['lines']:
        if abs(item['width'] - 1) > 0.05:
            raise RuntimeError(f'Guide width is not uniformly 1px: {item}')
        if abs(item['left'] - item['triangleX']) > 0.6:
            raise RuntimeError(f'Guide is not directly under triangle tip: {item}')
        if abs(item['top'] - item['triangleBottom']) > 0.6:
            raise RuntimeError(f'Guide does not start below triangle tip: {item}')
    same_x = {}
    for item in metrics['lines']:
        same_x.setdefault(round(item['left'], 2), []).append(item)
    for group in same_x.values():
        group.sort(key=lambda item: item['top'])
        for first, second in zip(group, group[1:]):
            if first['bottom'] > second['top'] + 0.6:
                raise RuntimeError(f'Same-depth guides overlap and visually thicken: {first}, {second}')

    # Canvas -> outline: selecting a low canvas node must reveal the matching row.
    page.click('[data-action="fit"]')
    page.wait_for_timeout(250)
    clicked = page.evaluate("""()=>{const g=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Node 23');if(!g)return false;g.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,view:window}));return true;}""")
    if not clicked:
        raise RuntimeError('Could not locate Node 23 on canvas')
    page.wait_for_function("""()=>document.querySelector('[data-outline-uid="n23"]')?.classList.contains('is-active')""", timeout=5000)
    canvas_to_outline = page.evaluate("""()=>{const tree=document.querySelector('[data-role=outline-tree]');const row=document.querySelector('[data-outline-uid="n23"]');const tr=tree.getBoundingClientRect(),rr=row.getBoundingClientRect();return{scrollTop:tree.scrollTop,visible:rr.top>=tr.top-1&&rr.bottom<=tr.bottom+1,rowTop:rr.top,treeTop:tr.top,rowBottom:rr.bottom,treeBottom:tr.bottom};}""")
    if canvas_to_outline['scrollTop'] <= 0 or not canvas_to_outline['visible']:
        raise RuntimeError(f'Canvas selection did not reveal outline row: {canvas_to_outline}')

    # Outline -> canvas: clicking a row must center/present its canvas node.
    page.locator('[data-outline-uid="n00"] [data-outline-editor]').click()
    page.wait_for_timeout(300)
    outline_to_canvas = page.evaluate("""()=>{const canvas=document.querySelector('[data-role=canvas]');const g=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Node 00');const cr=canvas.getBoundingClientRect(),nr=g.getBoundingClientRect();const cx=nr.left+nr.width/2,cy=nr.top+nr.height/2;return{visible:nr.right>=cr.left&&nr.left<=cr.right&&nr.bottom>=cr.top&&nr.top<=cr.bottom,dx:Math.abs(cx-(cr.left+cr.width/2)),dy:Math.abs(cy-(cr.top+cr.height/2)),canvasWidth:cr.width,canvasHeight:cr.height};}""")
    if not outline_to_canvas['visible'] or outline_to_canvas['dx'] > outline_to_canvas['canvasWidth'] * 0.25 or outline_to_canvas['dy'] > outline_to_canvas['canvasHeight'] * 0.25:
        raise RuntimeError(f'Outline selection did not present canvas node: {outline_to_canvas}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({'guides': metrics, 'canvasToOutline': canvas_to_outline, 'outlineToCanvas': outline_to_canvas, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
