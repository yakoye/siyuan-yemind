"""v0.9.11 unified rich text, menus, image, style panel and relation smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  window.__menus=[];window.__dialogs=[];window.__messages=[];
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(id){this.id=id;this.items=[];this.element=document.createElement('div');window.__menus.push(this)}addItem(item){this.items.push(item);return document.createElement('div')}addSeparator(){this.items.push({separator:true});return document.createElement('div')}open(pos){this.pos=pos;window.__lastMenu=this}close(){}}
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='mock-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:(...args)=>window.__messages.push(args)};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

image_data = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='90'%3E%3Crect width='180' height='90' fill='%23ddeee8'/%3E%3Ctext x='30' y='50' font-size='20'%3EIMAGE%3C/text%3E%3C/svg%3E"

def node_box(page, text):
    value = page.evaluate("""text=>{const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);if(!node)return null;const r=node.getBoundingClientRect();return{x:r.x,y:r.y,width:r.width,height:r.height};}""", text)
    if not value:
        raise RuntimeError(f'Missing node {text}')
    return value

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1500, 'height': 930})
    page_errors=[]; console_errors=[]
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1460px;height:890px"></div></body></html>')
    page.add_style_tag(content=stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async image=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0.9.11 Node Actions','logicalStructure');await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children:[{data:{uid:'a',text:'Alpha rich text'},children:[]},{data:{uid:'b',text:'Beta target'},children:[]},{data:{uid:'img',text:'Image node',image:image,imageTitle:'Preview',imageSize:{width:180,height:90}},children:[]}]}});const container=document.createElement('div');container.style.cssText='width:1420px;height:850px;display:block';host.append(container);const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);} """, image_data)
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(350)

    # Project style panel stays anchored and uses the compact v0.9.13 geometry.
    page.click('[data-action="project-style"]')
    project = page.evaluate("""()=>{const b=document.querySelector('[data-action=project-style]').getBoundingClientRect();const p=document.querySelector('[data-role=project-style-panel]').getBoundingClientRect();return{button:b.toJSON(),panel:p.toJSON(),hidden:document.querySelector('[data-role=project-style-panel]').hidden}}""")
    if project['hidden'] or abs(project['panel']['y'] - project['button']['bottom'] - 6) > 2 or abs(project['panel']['width'] - 340) > 2 or project['panel']['height'] > 421:
        raise RuntimeError(f'Project style panel not anchored/compact: {project}')
    page.click('[data-action="project-style"]')

    # Single-node menu has exact command groups and inline link follows formula.
    a = node_box(page, 'Alpha rich text')
    opened = page.evaluate("""()=>{const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Alpha rich text');if(!node)return false;const r=node.getBoundingClientRect();node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:2}));return !!window.__lastMenu;}""")
    if not opened:
        raise RuntimeError('Single-node context menu did not open')
    labels = page.evaluate("""()=>{const items=window.__lastMenu.items;return items.map(item=>item.separator?'---':item.label)}""")
    expected = ['编辑节点','插入上级节点','插入同级节点','插入下级节点','添加','关联线','节点样式','---','复制','剪切','粘贴','粘贴（纯文本）','---','上移节点','下移节点','展开/折叠（下级节点）','---','删除当前和子节点','仅删除当前']
    if labels != expected:
        raise RuntimeError(f'Unexpected single-node menu order: {labels}')
    add_labels = page.evaluate("""()=>window.__lastMenu.items.find(item=>item.label==='添加').submenu.map(item=>item.label)""")
    if add_labels[-3:] != ['代码块','公式','行内链接']:
        raise RuntimeError(f'Inline link order wrong: {add_labels}')

    # Invoke node style from the context menu and verify its denser two-column geometry.
    page.evaluate("""()=>window.__lastMenu.items.find(item=>item.label==='节点样式').click()""")
    node_panel = page.evaluate("""()=>{const p=document.querySelector('[data-role=node-style-panel]').getBoundingClientRect();return{rect:p.toJSON(),hidden:document.querySelector('[data-role=node-style-panel]').hidden}}""")
    if node_panel['hidden'] or abs(node_panel['rect']['width'] - 380) > 2 or node_panel['rect']['height'] > 411:
        raise RuntimeError(f'Node style panel is not compact: project={project}, node={node_panel}')
    page.mouse.click(1200,700)

    # Quick action first circle touches the selected node border.
    page.mouse.click(a['x']+a['width']/2,a['y']+a['height']/2)
    page.wait_for_timeout(100)
    quick = page.evaluate("""()=>{const n=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Alpha rich text').getBoundingClientRect();const q=document.querySelector('.ymz-node-quick-actions[data-node-uid="a"] .ymz-node-quick-action')?.getBoundingClientRect();return q?{nodeRight:n.right,quickLeft:q.left,gap:q.left-n.right}:null}""")
    if not quick or abs(quick['gap']) > 1.1:
        raise RuntimeError(f'Quick action is not flush with node: {quick}')

    # Rich-text toolbar appears after pointer selection finishes and font/size apply to original range.
    page.mouse.dblclick(a['x']+a['width']/2,a['y']+a['height']/2)
    page.wait_for_selector('.smm-richtext-node-edit-wrap .ql-editor', timeout=5000)
    page.evaluate("""()=>{const editor=document.querySelector('.smm-richtext-node-edit-wrap .ql-editor');editor.focus();editor.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}));const text=[...editor.childNodes].find(node=>node.nodeType===Node.TEXT_NODE)||editor.firstChild?.firstChild||editor.firstChild;const range=document.createRange();range.setStart(text,0);range.setEnd(text,Math.min(5,text.textContent.length));const selection=getSelection();selection.removeAllRanges();selection.addRange(range);document.dispatchEvent(new Event('selectionchange',{bubbles:true}));}""")
    page.wait_for_timeout(40)
    if not page.locator('.ymz-rich-toolbar').is_hidden():
        raise RuntimeError('Toolbar appeared before pointer selection mouseup')
    page.evaluate("""()=>window.dispatchEvent(new MouseEvent('mouseup',{bubbles:true}))""")
    page.wait_for_timeout(80)
    if page.locator('.ymz-rich-toolbar').is_hidden():
        raise RuntimeError('Toolbar did not appear after pointer selection completion')
    page.select_option('[data-rich-field="font"]','serif')
    page.select_option('[data-rich-field="size"]','18px')
    page.wait_for_timeout(80)
    rich = page.evaluate("""()=>{const editor=document.querySelector('.smm-richtext-node-edit-wrap .ql-editor');const selected=editor.querySelector('[style*=\"font-family\"], [style*=\"font-size\"]');return{html:editor.innerHTML,style:selected?.getAttribute('style')||'',selection:getSelection()?.toString()||''};}""")
    if 'serif' not in rich['html'] or '18px' not in rich['html']:
        raise RuntimeError(f'Font or size did not apply: {rich}')
    page.keyboard.press('Escape')
    page.wait_for_timeout(100)

    # Hover shows only a border; click shows direct controls; double-click opens preview.
    image = page.locator('[data-role="canvas"] svg image').first
    image.hover()
    page.wait_for_timeout(100)
    image_hover = page.evaluate("""()=>{const handle=document.querySelector('.ymz-node-image-frame');return handle?{display:getComputedStyle(handle).display,mode:handle.dataset.mode,handles:[...handle.querySelectorAll('.ymz-node-image-resize-handle')].map(el=>getComputedStyle(el).display),toolbar:getComputedStyle(handle.querySelector('.ymz-node-image-toolbar')).display}:null}""")
    if not image_hover or image_hover['display'] == 'none' or image_hover['mode'] != 'hover' or any(value != 'none' for value in image_hover['handles']) or image_hover['toolbar'] != 'none':
        raise RuntimeError(f'Image hover frame is wrong: {image_hover}')
    image.click()
    page.wait_for_timeout(80)
    image_tools = page.evaluate("""()=>{const handle=document.querySelector('.ymz-node-image-frame');return handle?{mode:handle.dataset.mode,handles:handle.querySelectorAll('.ymz-node-image-resize-handle').length,replace:!!handle.querySelector('[data-image-action=replace]'),remove:!!handle.querySelector('[data-image-action=delete]')}:null}""")
    if not image_tools or image_tools['mode'] != 'selected' or image_tools['handles'] != 8 or not image_tools['replace'] or not image_tools['remove']:
        raise RuntimeError(f'Image selected tools are incomplete: {image_tools}')
    image.dblclick()
    page.wait_for_timeout(80)
    lightbox = page.evaluate("""()=>{const el=document.querySelector('.ymz-image-lightbox');const style=getComputedStyle(el);return{hidden:el.hidden,background:style.backgroundColor,backdrop:style.backdropFilter||style.webkitBackdropFilter||''}}""")
    if lightbox['hidden'] or lightbox['background'] != 'rgba(7, 10, 13, 0.62)' or 'blur(8px)' not in lightbox['backdrop']:
        raise RuntimeError(f'Image lightbox styling is wrong: {lightbox}')
    page.keyboard.press('Escape')

    # Create an association line through the node menu and verify native tangent controls.
    page.keyboard.press('Escape')
    page.mouse.click(80, 820)
    page.wait_for_timeout(100)
    a = node_box(page, 'Alpha rich text'); b = node_box(page, 'Beta target')
    page.evaluate("""()=>{const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='Alpha rich text');const r=node.getBoundingClientRect();node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:r.left+r.width/2,clientY:r.top+r.height/2,button:2}));window.__lastMenu.items.find(item=>item.label==='关联线').click();}""")
    page.mouse.click(b['x']+b['width']/2,b['y']+b['height']/2)
    page.wait_for_timeout(220)
    relation_paths = page.locator('[data-role="canvas"] svg path[marker-end]')
    if relation_paths.count() < 1:
        raise RuntimeError('Association line was not created')
    # Click the transparent, wider hit path if present.
    activated = page.evaluate("""()=>{
      const paths=[...document.querySelectorAll('[data-role=canvas] svg path')];
      const visible=paths.find(p=>p.getAttribute('stroke')==='#f59e0b')||paths.find(p=>p.hasAttribute('marker-end'));
      if(!visible)return false;
      const d=visible.getAttribute('d');
      const hit=paths.find(p=>p!==visible&&p.getAttribute('d')===d&&(p.getAttribute('stroke')==='transparent'||getComputedStyle(p).stroke==='rgba(0, 0, 0, 0)'));
      const target=hit||visible;
      target.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true}));
      return {usedHit:Boolean(hit),samePath:Boolean(d)};
    }""")
    if not activated:
        raise RuntimeError('Association line click target was not found')
    page.wait_for_timeout(120)
    relation_state = page.evaluate("""()=>{const svg=document.querySelector('[data-role=canvas] svg');const panel=document.querySelector('[data-role=relation-panel]');const circles=[...svg.querySelectorAll('circle')].filter(c=>{const r=Number(c.getAttribute('r')||0);return r>=4&&r<=6;});const marker=[...svg.querySelectorAll('marker')].find(m=>m.getAttribute('orient')==='auto-start-reverse');const paths=[...svg.querySelectorAll('path')].map(path=>({stroke:path.getAttribute('stroke'),width:path.getAttribute('stroke-width'),computedStroke:getComputedStyle(path).stroke,computedWidth:getComputedStyle(path).strokeWidth}));return{panelHidden:panel.hidden,panelMode:panel.dataset.mode,circles:circles.length,markerOrient:marker?.getAttribute('orient')||'',paths};}""")
    selected_relation = any((item['stroke'] == '#2563eb' or item['computedStroke'] == 'rgb(37, 99, 235)') and (item['width'] == '3' or item['computedWidth'] == '3px') for item in relation_state['paths'])
    if relation_state['panelHidden'] or relation_state['panelMode'] != 'active' or relation_state['circles'] < 2 or relation_state['markerOrient'] != 'auto-start-reverse' or not selected_relation:
        raise RuntimeError(f'Relation tangent controls/selected styling missing: {relation_state}')

    if page_errors:
        raise RuntimeError('Page errors:\n'+'\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n'+'\n'.join(console_errors))
    print({'projectPanel':project,'nodePanel':node_panel,'menu':labels,'addMenu':add_labels,'quickAction':quick,'richText':rich,'relation':relation_state,'pageErrors':0,'consoleErrors':0})
    browser.close()
