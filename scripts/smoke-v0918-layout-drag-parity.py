"""v0.9.18 split reveal, mirrored layout drag and right-fishbone smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}}
  class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def box(page, text):
    value = page.evaluate("""text=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);
      return node?.getBoundingClientRect().toJSON()||null;
    }""", text)
    if not value:
        raise RuntimeError(f'Missing canvas node: {text}')
    return value


def set_layout(page, layout):
    page.evaluate("""layout=>{const s=document.querySelector('[data-action="layout"]');s.value=layout;s.dispatchEvent(new Event('change',{bubbles:true}));}""", layout)
    page.wait_for_timeout(550)
    page.locator('[data-action="fit"]').first.click()
    page.wait_for_timeout(350)


def drag_to(page, source_text, target_x, target_y):
    source = box(page, source_text)
    page.mouse.move(source['x'] + source['width']/2, source['y'] + source['height']/2)
    page.mouse.down()
    page.mouse.move(target_x, target_y, steps=16)
    page.wait_for_timeout(120)
    guides = page.evaluate("""()=>[...document.querySelectorAll('[data-role=canvas] svg path')]
      .filter(p=>getComputedStyle(p).display!=='none'&&p.getAttribute('stroke-dasharray')==='6 6')
      .map(p=>p.getAttribute('d')||'')""")
    page.mouse.up()
    page.wait_for_timeout(500)
    return guides


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 960})
    page_errors, console_errors = [], []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1560px;height:920px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0918 layout parity','logicalStructure');
      const fillers=Array.from({length:8},(_,i)=>({data:{uid:'f'+i,text:'填充节点'+i},children:[]}));
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'a',text:'目标A'},children:[]},
        {data:{uid:'b',text:'目标B',expand:true},children:[
          {data:{uid:'b1',text:'B子节点1'},children:[]},
          {data:{uid:'b2',text:'B子节点2'},children:[]}
        ]},
        {data:{uid:'c',text:'拖动C'},children:[]},
        {data:{uid:'d',text:'目录目标',expand:true},children:[
          {data:{uid:'d1',text:'目录子节点1'},children:[]},
          {data:{uid:'d2',text:'目录子节点2'},children:[]}
        ]},...fillers
      ]};
      await plugin.repository.update(map.id,{data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1520px;height:900px;display:block';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(700)

    # Opening split must reveal the already-active far-away outline row immediately.
    page.evaluate("""()=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='填充节点7');
      node.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:1,clientY:1}));
    }""")
    page.wait_for_timeout(100)
    page.evaluate("""()=>{const o=document.querySelector('[data-role=outline]');o.style.maxHeight='280px';o.style.alignSelf='start';}""")
    page.locator('[data-action="view-split"]').click()
    page.wait_for_selector('[data-outline-uid="f7"].is-active', timeout=5000)
    page.wait_for_timeout(200)
    reveal = page.evaluate("""()=>{const outline=document.querySelector('[data-role=outline]');const row=document.querySelector('[data-outline-uid="f7"]');const a=outline.getBoundingClientRect(),r=row.getBoundingClientRect();return{scrollTop:outline.scrollTop,rowTop:r.top,rowBottom:r.bottom,outlineTop:a.top,outlineBottom:a.bottom,visible:r.top>=a.top&&r.bottom<=a.bottom}}""")
    if not reveal['visible']:
        raise RuntimeError(f'Split opening did not reveal current selection: {reveal}')
    page.locator('[data-action="view-map"]').click(); page.wait_for_timeout(250)

    # Left logical is a true mirror of the right-logical child zone.
    set_layout(page, 'logicalStructureLeft')
    target = box(page, '目标A')
    guides = drag_to(page, '拖动C', target['x'] - 30, target['y'] + target['height']/2)
    if not guides:
        raise RuntimeError('Left logical drag lost the continuous green parent guide')
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='a').children.some(n=>n.data.uid==='c')""", timeout=8000)
    page.locator('[data-action="undo"]').click(); page.wait_for_timeout(450)

    # Down organization uses the same immediate child target below the node.
    set_layout(page, 'organizationStructure')
    target = box(page, '目标A')
    guides_org = drag_to(page, '拖动C', target['x'] + target['width']/2, target['y'] + target['height'] + 30)
    if not guides_org:
        raise RuntimeError('Organization drag lost the continuous green parent guide')
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='a').children.some(n=>n.data.uid==='c')""", timeout=8000)
    page.locator('[data-action="undo"]').click(); page.wait_for_timeout(450)

    # Non-root catalog children share the visual Y axis with their child-growth
    # direction. Body halves reorder siblings; only the outward tail means child.
    set_layout(page, 'catalogOrganization')
    d1 = box(page, '目录子节点1')
    catalog_guides = drag_to(page, '目录子节点2', d1['x'] + d1['width']/2, d1['y'] + 4)
    if not catalog_guides:
        raise RuntimeError('Catalog same-axis sibling reorder lost the parent guide')
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='d').children.map(n=>n.data.uid).join(',')==='d2,d1'""", timeout=8000)
    page.locator('[data-action="undo"]').click(); page.wait_for_timeout(450)

    # Timeline2 top branches reverse visual order relative to native child order.
    set_layout(page, 'timeline2')
    b2 = box(page, 'B子节点2')
    timeline_reverse_guides = drag_to(page, 'B子节点1', b2['x'] + b2['width']/2, b2['y'] + 4)
    if not timeline_reverse_guides:
        raise RuntimeError('Timeline2 reverse sibling reorder lost the parent guide')
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='b').children.map(n=>n.data.uid).join(',')==='b2,b1'""", timeout=8000)
    page.locator('[data-action="undo"]').click(); page.wait_for_timeout(450)

    # Exercise the same immediate child intent across the remaining engine layouts.
    parity_layouts = [
      'mindMap', 'catalogOrganization', 'timeline', 'timeline2',
      'verticalTimeline', 'verticalTimeline2', 'verticalTimeline3',
      'fishbone', 'rightFishbone'
    ]
    parity_results = {}
    for layout in parity_layouts:
        set_layout(page, layout)
        root_box, target = box(page, '中心主题'), box(page, '目标A')
        tcx, tcy = target['x'] + target['width']/2, target['y'] + target['height']/2
        rcx, rcy = root_box['x'] + root_box['width']/2, root_box['y'] + root_box['height']/2
        if layout == 'mindMap':
            x, y = (target['x'] - 28, tcy) if tcx < rcx else (target['x'] + target['width'] + 28, tcy)
        elif layout in ('catalogOrganization', 'timeline'):
            x, y = tcx, target['y'] + target['height'] + 28
        elif layout == 'timeline2':
            x, y = (tcx, target['y'] - 28) if tcy < rcy else (tcx, target['y'] + target['height'] + 28)
        elif layout == 'verticalTimeline2':
            x, y = target['x'] - 28, tcy
        elif layout in ('verticalTimeline', 'verticalTimeline3'):
            x, y = target['x'] + target['width'] + 28, tcy
        else:
            x, y = (tcx, target['y'] - 28) if tcy < rcy else (tcx, target['y'] + target['height'] + 28)
        layout_guides = drag_to(page, '拖动C', x, y)
        if not layout_guides:
            raise RuntimeError(f'{layout} lost the continuous parent guide')
        try:
            page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='a').children.some(n=>n.data.uid==='c')""", timeout=8000)
        except Exception as exc:
            tree=page.evaluate("""()=>JSON.parse(JSON.stringify(window.__smoke.plugin.repository.get(window.__smoke.map.id).data))""")
            raise RuntimeError(f'{layout} did not commit child drop; root={root_box}, target={target}, point={(x,y)}, guides={layout_guides}, tree={tree}') from exc
        parity_results[layout] = True
        page.locator('[data-action="undo"]').click(); page.wait_for_timeout(420)

    # Right fishbone must be a geometric mirror, not a logical-structure fallback.
    set_layout(page, 'fishbone2')
    left_root, left_a = box(page, '中心主题'), box(page, '目标A')
    if left_a['x'] <= left_root['x'] + left_root['width'] * 0.6:
        raise RuntimeError(f'Left fishbone baseline is not right-growing: root={left_root}, child={left_a}')
    set_layout(page, 'rightFishbone2')
    right_root, right_a = box(page, '中心主题'), box(page, '目标A')
    if right_a['x'] + right_a['width'] >= right_root['x'] + right_root['width'] * 0.4:
        raise RuntimeError(f'Right fishbone was not mirrored to the left: root={right_root}, child={right_a}')
    if page.locator('.smm-layout-fishbone-tail').count() != 1:
        raise RuntimeError('Right fishbone fish tail is missing')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({
      'splitReveal': reveal,
      'leftLogicalGuide': bool(guides),
      'organizationGuide': bool(guides_org),
      'catalogSameAxisReorder': bool(catalog_guides),
      'timelineReverseReorder': bool(timeline_reverse_guides),
      'layoutParity': parity_results,
      'leftFishboneChildX': round(left_a['x'],1),
      'rightFishboneChildX': round(right_a['x'],1),
      'rightFishboneTail': 1,
      'pageErrors': 0,
      'consoleErrors': 0,
    })
    browser.close()
