"""v0.9.20 mind-map cross-root mirrored drag smoke."""
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
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.appendChild(this.element)}destroy(){this.element.remove()}}
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
        raise RuntimeError(f'Missing node {text}')
    return value

def state(page):
    return page.evaluate("""()=>{
      const data=window.__smoke.plugin.repository.get(window.__smoke.map.id).data;
      const walk=n=>({uid:n.data.uid,text:n.data.text,dir:n.data.dir||null,children:(n.children||[]).map(walk)});
      return walk(data);
    }""")

def drag(page, source_text, x, y):
    source=box(page, source_text)
    page.mouse.move(source['x']+source['width']/2, source['y']+source['height']/2)
    page.mouse.down()
    page.mouse.move(x,y,steps=24)
    page.wait_for_timeout(180)
    guides=page.evaluate("""()=>[...document.querySelectorAll('[data-role=canvas] svg path')]
      .filter(p=>getComputedStyle(p).display!=='none'&&p.getAttribute('stroke-dasharray')==='6 6')
      .map(p=>p.getAttribute('d')||'')""")
    page.mouse.up()
    page.wait_for_timeout(650)
    return guides

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1500,'height':900})
    page_errors=[];console_errors=[]
    page.on('pageerror',lambda exc: page_errors.append(getattr(exc,'stack',None) or str(exc)))
    page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1460px;height:860px"></div></body></html>')
    page.add_style_tag(content=stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0920 cross root','mindMap');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'r1',text:'右1',dir:'right'},children:[]},
        {data:{uid:'r2',text:'右2',dir:'right'},children:[]},
        {data:{uid:'l1',text:'左1',dir:'left'},children:[]},
        {data:{uid:'l2',text:'左2',dir:'left'},children:[]}
      ]};
      await plugin.repository.update(map.id,{layout:'mindMap',data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1440px;height:840px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg',timeout=30000)
    page.wait_for_timeout(850)
    page.locator('[data-action="fit"]').first.click();page.wait_for_timeout(350)

    initial=state(page)
    b_l1=box(page,'左1')
    # Drop right2 just above left1, on the inner half of the left node: mirrored BEFORE.
    before_guides=drag(page,'右2',b_l1['x']+b_l1['width']*0.62,b_l1['y']-7)
    page.wait_for_function("""()=>{const c=window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children;const a=c.findIndex(n=>n.data.uid==='r2'),b=c.findIndex(n=>n.data.uid==='l1');return a===b-1&&c[a].data.dir==='left'}""",timeout=8000)
    before_state=state(page)
    if not before_guides: raise RuntimeError('cross-root BEFORE did not show the green target guide')

    # One undo must restore both structure and the original right-side direction.
    page.locator('[data-action="undo"]').click();page.wait_for_timeout(700)
    page.wait_for_function("""()=>{const c=window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children;const n=c.find(x=>x.data.uid==='r2');return c.map(x=>x.data.uid).join(',')==='r1,r2,l1,l2'&&n.data.dir==='right'}""",timeout=8000)
    undo_state=state(page)

    b_l1=box(page,'左1')
    # Drop below left1. It must be after left1 but before left2, not the same slot as ABOVE.
    after_guides=drag(page,'右2',b_l1['x']+b_l1['width']*0.62,b_l1['y']+b_l1['height']+7)
    page.wait_for_timeout(800)
    after_state=state(page)
    after_children=after_state['children']
    after_ids=[item['uid'] for item in after_children]
    after_r2=next((item for item in after_children if item['uid']=='r2'),None)
    if after_ids != ['r1','l1','r2','l2'] or not after_r2 or after_r2['dir']!='left':
        raise RuntimeError(f'cross-root AFTER wrong result: point={(b_l1["x"]+b_l1["width"]*0.62,b_l1["y"]+b_l1["height"]+7)}, guides={after_guides}, state={after_state}')
    if not after_guides: raise RuntimeError('cross-root AFTER did not show the green target guide')

    page.locator('[data-action="undo"]').click();page.wait_for_timeout(700)
    b_l1=box(page,'左1')
    # Outward left tail means becoming a child of left1 and inherits the left branch.
    child_guides=drag(page,'右2',b_l1['x']-26,b_l1['y']+b_l1['height']/2)
    page.wait_for_function("""()=>{const c=window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children;const l=c.find(n=>n.data.uid==='l1');const n=l.children.find(x=>x.data.uid==='r2');return !!n&&n.data.dir==='left'}""",timeout=8000)
    child_state=state(page)
    if not child_guides: raise RuntimeError('cross-root CHILD did not show the green target guide')

    # Mirror the same behavior back from the left branch to the right branch.
    page.locator('[data-action="undo"]').click();page.wait_for_timeout(700)
    b_r1=box(page,'右1')
    mirror_guides=drag(page,'左2',b_r1['x']+b_r1['width']*0.38,b_r1['y']-7)
    page.wait_for_function("""()=>{const c=window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children;const a=c.findIndex(n=>n.data.uid==='l2'),b=c.findIndex(n=>n.data.uid==='r1');return a===b-1&&c[a].data.dir==='right'}""",timeout=8000)
    mirror_state=state(page)
    if not mirror_guides: raise RuntimeError('left-to-right mirror did not show the green target guide')

    if page_errors: raise RuntimeError('Page errors:\n'+'\n'.join(page_errors))
    if console_errors: raise RuntimeError('Console errors:\n'+'\n'.join(console_errors))
    print({'initial':initial,'before':before_state,'undo':undo_state,'after':after_state,'child':child_state,'mirror':mirror_state,'guides':[len(before_guides),len(after_guides),len(child_guides),len(mirror_guides)],'pageErrors':0,'consoleErrors':0})
    browser.close()
