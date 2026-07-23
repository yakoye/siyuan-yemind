"""v0.9.14 combined summary, stable node geometry and right-drag isolation smoke."""
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
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(o){window.__commands.push(o)} getOpenedTab(){return{}}
    async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{
    constructor(id){this.id=id;this.items=[];this.element=document.createElement('div');window.__menus.push(this)}
    addItem(item){this.items.push(item);return document.createElement('div')}
    addSeparator(){this.items.push({separator:true});return document.createElement('div')}
    open(pos){this.pos=pos;window.__lastMenu=this} close(){}
  }
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this)}destroy(){this.element.remove()}}
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


def center(rect):
    return rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1540, 'height': 960})
    page_errors, console_errors = [], []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('''<!doctype html><html><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1500px;height:920px"></div></body></html>''')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      await plugin.settingsStore.update({canvasMode:'pan',autoFitOnOpen:true});
      const fresh=await plugin.repository.create('v0914 geometry','logicalStructure');
      fresh.data.children=[
        {data:{uid:'summary-a',text:'概要节点 A'},children:[]},
        {data:{uid:'long-node',richText:true,customTextWidth:270,text:'<p>高速信号的趋肤效应、传输线介质损耗以及阻抗不连续会使接收端波形逐渐劣化，因此需要可靠的均衡与恢复机制。</p>'},children:[]},
        {data:{uid:'summary-c',text:'概要节点 C'},children:[]},
        {data:{uid:'image-node',richText:true,customTextWidth:250,text:'<p>一个完整的 SerDes 数据通路包含串并转换、编码、时钟恢复和差分发送接收。</p>',image:'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%2280%22%3E%3Crect width=%22160%22 height=%2280%22 fill=%22%23eef2f7%22/%3E%3Cpath d=%22M10 40h140%22 stroke=%22%23475569%22 stroke-width=%224%22/%3E%3C/svg%3E',imageTitle:'SerDes',imageSize:{width:160,height:80}},children:[]}
      ];
      await plugin.repository.update(fresh.id,{data:fresh.data});
      const container=document.createElement('div');container.style.cssText='width:1460px;height:880px;display:block';host.append(container);
      const context={element:container,data:{mapId:fresh.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,fresh,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(700)

    def geometry_snapshot():
        return page.evaluate("""()=>[...document.querySelectorAll('g.smm-node')].map(node=>{
          const text=node.querySelector('.smm-richtext-node-wrap')?.innerText.trim()||'';
          const shape=node.querySelector('.smm-node-shape')?.getBoundingClientRect();
          const content=[...node.querySelectorAll('foreignObject,image')].map(el=>el.getBoundingClientRect()).filter(r=>r.width>1&&r.height>1);
          const paragraph=node.querySelector('.smm-richtext-node-wrap p');
          return {text,shape:shape?.toJSON()||null,content:content.map(r=>r.toJSON()),marginTop:paragraph?getComputedStyle(paragraph).marginTop:null,marginBottom:paragraph?getComputedStyle(paragraph).marginBottom:null};
        }).filter(item=>item.shape)""")

    def assert_geometry(snapshot, label):
        targets = [item for item in snapshot if item['text'] and ('高速信号' in item['text'] or '一个完整' in item['text'])]
        if len(targets) != 2:
            raise RuntimeError(f'{label}: missing long/image geometry targets: {snapshot}')
        for item in targets:
            shape = item['shape']
            if item['marginTop'] != '0px' or item['marginBottom'] != '0px':
                raise RuntimeError(f'{label}: rich paragraph margins escaped measurement contract: {item}')
            for content in item['content']:
                if content['left'] < shape['left'] - 1.5 or content['right'] > shape['right'] + 1.5 or content['top'] < shape['top'] - 1.5 or content['bottom'] > shape['bottom'] + 1.5:
                    raise RuntimeError(f'{label}: node content escaped frame: {item}')

    initial_geometry = geometry_snapshot()
    assert_geometry(initial_geometry, 'initial')
    page.evaluate("""()=>{const canvas=document.querySelector('.ymz-canvas');canvas.style.display='none';window.__tabOptions.resize.call(window.__smoke.context);canvas.style.display='';window.__tabOptions.resize.call(window.__smoke.context)}""")
    page.wait_for_timeout(350)
    restored_geometry = geometry_snapshot()
    assert_geometry(restored_geometry, 'hidden-visible')

    # Multi-select two non-adjacent siblings and invoke the context-menu command.
    a, c = node_rect(page, '概要节点 A'), node_rect(page, '概要节点 C')
    page.mouse.click(*center(a))
    page.keyboard.down('Control'); page.mouse.click(*center(c)); page.keyboard.up('Control')
    page.wait_for_timeout(80)
    page.mouse.click(*center(a), button='right')
    page.wait_for_timeout(80)
    menu = page.evaluate("""()=>({id:window.__lastMenu?.id,labels:window.__lastMenu?.items.map(item=>item.label||'---')||[]})""")
    if '{} 添加综合概要' not in menu['labels']:
        raise RuntimeError(f'Combined summary menu missing: {menu}')
    page.evaluate("""()=>window.__lastMenu.items.find(item=>item.label==='{} 添加综合概要').click()""")
    page.wait_for_timeout(450)
    summary_state = page.evaluate("""()=>{
      const doc=window.__smoke.plugin.repository.get(window.__smoke.fresh.id);
      const found=[];const walk=node=>{const g=node.data?.generalization;if(g)found.push({uid:node.data.uid,value:Array.isArray(g)?g:[g]});(node.children||[]).forEach(walk)};walk(doc.data);
      return {found,summaryTexts:[...document.querySelectorAll('g.smm-node')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()).filter(t=>t==='概要')};
    }""")
    if len(summary_state['found']) != 1 or len(summary_state['found'][0]['value']) != 1:
        raise RuntimeError(f'Multi-selection created more than one summary: {summary_state}')
    summary_data = summary_state['found'][0]['value'][0]
    if summary_state['found'][0]['uid'] != page.evaluate("()=>window.__smoke.plugin.repository.get(window.__smoke.fresh.id).data.data.uid") or summary_data.get('range') != [0, 2]:
        raise RuntimeError(f'Combined summary range is wrong: {summary_state}')

    # Select one node, then right-drag blank canvas in pan mode. Selection must stay unchanged and no Select polygon may survive.
    long_rect = node_rect(page, '高速信号的趋肤效应、传输线介质损耗以及阻抗不连续会使接收端波形逐渐劣化，因此需要可靠的均衡与恢复机制。')
    page.mouse.click(*center(long_rect))
    page.wait_for_timeout(60)
    before = page.evaluate("""()=>({active:[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()),x:[...document.querySelectorAll('g.smm-node')].find(n=>n.textContent.includes('高速信号'))?.getBoundingClientRect().x})""")
    canvas = page.locator('[data-role="canvas"]').bounding_box()
    start_x, start_y = canvas['x'] + 80, canvas['y'] + canvas['height'] - 90
    page.mouse.move(start_x, start_y); page.mouse.down(button='right'); page.mouse.move(start_x + 85, start_y - 45, steps=5)
    during = page.evaluate("""()=>({selectPolygons:[...document.querySelectorAll('svg polygon')].filter(el=>getComputedStyle(el).stroke==='rgb(9, 132, 227)').length,active:[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim())})""")
    page.mouse.up(button='right'); page.wait_for_timeout(120)
    after = page.evaluate("""()=>({active:[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()),x:[...document.querySelectorAll('g.smm-node')].find(n=>n.textContent.includes('高速信号'))?.getBoundingClientRect().x})""")
    if during['selectPolygons'] != 0 or during['active'] != before['active'] or after['active'] != before['active'] or abs(after['x'] - before['x']) < 40:
        raise RuntimeError(f'Right-drag was not isolated from selection: before={before}, during={during}, after={after}')

    # A stationary blank right click still opens the normal context menu.
    page.mouse.click(start_x, start_y, button='right'); page.wait_for_timeout(80)
    stationary_menu = page.evaluate("""()=>window.__lastMenu?.id||''""")
    if stationary_menu != 'siyuan-yemind-canvas-menu':
        raise RuntimeError(f'Stationary right click no longer opens blank menu: {stationary_menu}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({'summary': summary_state, 'geometryTargets': 2, 'rightDrag': {'before': before, 'during': during, 'after': after}, 'stationaryMenu': stationary_menu, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
