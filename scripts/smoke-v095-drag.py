from pathlib import Path
from playwright.sync_api import sync_playwright
import re

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def plain(value):
    return re.sub(r'<[^>]+>', '', value or '').replace('&nbsp;', ' ').strip()


def tree_shape(page):
    raw = page.evaluate("""()=>JSON.parse(JSON.stringify(window.__smoke.plugin.repository.get(window.__smoke.map.id).data))""")
    def visit(node):
        return {
            'uid': node['data'].get('uid'),
            'text': plain(node['data'].get('text')),
            'tag': node['data'].get('tag'),
            'note': node['data'].get('yemindNote'),
            'children': [visit(child) for child in node.get('children', [])],
        }
    return visit(raw)


def wait_shape(page, expected):
    page.wait_for_function("""expected=>{
      const strip=v=>String(v||'').replace(/<[^>]+>/g,'').trim();
      const visit=n=>({uid:n.data?.uid,text:strip(n.data?.text),children:(n.children||[]).map(visit)});
      const current=visit(window.__smoke.plugin.repository.get(window.__smoke.map.id).data);
      return JSON.stringify(current)===JSON.stringify(expected);
    }""", arg=expected, timeout=8000)


def compact(shape):
    return {
        'uid': shape['uid'],
        'text': shape['text'],
        'children': [compact(child) for child in shape['children']],
    }


def outline_box(page, uid, part='row'):
    selector = f'[data-outline-uid="{uid}"]'
    if part == 'gutter': selector += ' [data-outline-drag-handle]'
    elif part == 'editor': selector += ' [data-outline-editor]'
    box = page.locator(selector).bounding_box()
    if not box: raise RuntimeError(f'Missing outline box: {uid} {part}')
    return box


def canvas_box(page, text):
    value = page.evaluate("""text=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);
      if(!node)return null;const rect=node.getBoundingClientRect();
      return{x:rect.x,y:rect.y,width:rect.width,height:rect.height};
    }""", text)
    if not value: raise RuntimeError(f'Missing canvas node: {text}')
    return value


def visible_guides(page):
    return page.evaluate("""()=>[...document.querySelectorAll('[data-role=canvas] svg path')]
      .filter(path=>getComputedStyle(path).display!=='none')
      .map(path=>({stroke:path.getAttribute('stroke')||'',dash:path.getAttribute('stroke-dasharray')||'',d:path.getAttribute('d')||''}))
      .filter(item=>item.dash==='4 6'||item.dash==='6 6'||item.stroke==='#176b50')""")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 920})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1380px;height:880px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0.9.5 Drag Smoke','logicalStructure');
      await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root',expand:true},children:[
        {data:{uid:'a',text:'Node A',expand:true,tag:['keep-a']},children:[{data:{uid:'a1',text:'Node A1',yemindNote:'keep-a1'},children:[]}]},
        {data:{uid:'b',text:'Node B',expand:true,tag:['keep-b']},children:[{data:{uid:'b1',text:'Node B1',yemindNote:'keep-b1'},children:[]}]},
        {data:{uid:'c',text:'Node C',tag:['keep-c'],yemindNote:'keep-c-note'},children:[]}
      ]}});
      const container=document.createElement('div');container.style.cssText='width:1320px;height:840px;display:block';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(400)
    initial = tree_shape(page)
    initial_compact = compact(initial)

    # ----- Outline drag -----
    page.click('[data-action="view-split"]')
    page.wait_for_selector('[data-outline-uid="c"] [data-outline-drag-handle]')
    visual = page.evaluate("""()=>{
      const gutter=document.querySelector('[data-outline-uid=c] [data-outline-drag-handle]');
      const square=document.querySelector('[data-outline-uid=c] .ymz-outline-row__leaf-square');
      const triangle=document.querySelector('[data-outline-uid=a] .ymz-outline-row__triangle');
      return {gutter:{width:getComputedStyle(gutter).width,cursor:getComputedStyle(gutter).cursor,opacity:getComputedStyle(gutter).opacity},square:[getComputedStyle(square).width,getComputedStyle(square).height,getComputedStyle(square).backgroundColor],triangle:[getComputedStyle(triangle).width,getComputedStyle(triangle).height,getComputedStyle(triangle).backgroundColor]};
    }""")
    if visual['gutter']['width'] != '14px' or visual['gutter']['cursor'] != 'move':
        raise RuntimeError(f'Outline gutter contract failed: {visual}')
    if visual['square'] != ['5px', '5px', 'rgb(0, 0, 0)'] or visual['triangle'] != ['7px', '7px', 'rgb(0, 0, 0)']:
        raise RuntimeError(f'Outline marker contract failed: {visual}')

    # Body dragging remains native text selection and never creates a structural ghost.
    editor = outline_box(page, 'a', 'editor')
    page.mouse.move(editor['x'] + 3, editor['y'] + editor['height'] / 2)
    page.mouse.down(); page.mouse.move(editor['x'] + editor['width'] - 4, editor['y'] + editor['height'] / 2, steps=8)
    body_drag = page.evaluate("""()=>({ghost:Boolean(document.querySelector('.ymz-outline-drag-ghost')),selection:getSelection().toString()})""")
    page.mouse.up()
    if body_drag['ghost']:
        raise RuntimeError(f'Outline text body started structural drag: {body_drag}')

    # Neutral row centre: no green line and no structural change.
    source = outline_box(page, 'c', 'gutter'); target = outline_box(page, 'b', 'row')
    sx, sy = source['x'] + source['width'] / 2, source['y'] + source['height'] / 2
    tx, ty = source['x'] + source['width'] / 2, target['y'] + target['height'] / 2
    page.mouse.move(sx, sy); page.mouse.down(); page.mouse.move(tx, ty, steps=10); page.wait_for_timeout(90)
    neutral_outline = page.evaluate("""()=>({ghost:Boolean(document.querySelector('.ymz-outline-drag-ghost')),drops:document.querySelectorAll('.is-drop-before,.is-drop-after,.is-drop-inside').length})""")
    page.mouse.up(); page.wait_for_timeout(250)
    if not neutral_outline['ghost'] or neutral_outline['drops'] != 0 or compact(tree_shape(page)) != initial_compact:
        raise RuntimeError(f'Outline neutral drop changed structure: preview={neutral_outline}, tree={tree_shape(page)}')

    # BEFORE with green line, then undo returns exactly to the initial tree.
    source = outline_box(page, 'c', 'gutter'); target = outline_box(page, 'a', 'row'); target_editor = outline_box(page, 'a', 'editor')
    page.mouse.move(source['x'] + 5, source['y'] + source['height'] / 2); page.mouse.down()
    page.mouse.move(target_editor['x'] - 8, target['y'] + 2, steps=12); page.wait_for_timeout(70)
    outline_before = page.eval_on_selector('[data-outline-uid="a"]', """row=>{const line=row.querySelector('.ymz-outline-row__drop-indicator');const style=getComputedStyle(line);return{before:row.classList.contains('is-drop-before'),depth:row.style.getPropertyValue('--ymz-outline-drop-depth'),display:style.display,color:style.backgroundColor,height:style.height,shadow:getComputedStyle(row).boxShadow}}""")
    if not outline_before['before'] or outline_before['display'] == 'none' or outline_before['color'] != 'rgb(23, 107, 80)' or outline_before['height'] != '2px' or outline_before['shadow'] != 'none':
        raise RuntimeError(f'Outline green BEFORE indicator failed: {outline_before}')
    page.mouse.up()
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children[0].data.uid==='c'""", timeout=8000)
    page.click('[data-action="undo"]'); wait_shape(page, initial_compact)

    # CHILD requires dwell and preserves node metadata.
    source = outline_box(page, 'c', 'gutter'); target = outline_box(page, 'b', 'row'); target_editor = outline_box(page, 'b', 'editor')
    page.mouse.move(source['x'] + 5, source['y'] + source['height'] / 2); page.mouse.down()
    page.mouse.move(target_editor['x'] + 18, target['y'] + target['height'] / 2, steps=12); page.wait_for_timeout(190)
    page.mouse.move(target_editor['x'] + 19, target['y'] + target['height'] / 2); page.wait_for_timeout(40)
    outline_child = page.eval_on_selector('[data-outline-uid="b"]', """row=>({inside:row.classList.contains('is-drop-inside'),depth:row.style.getPropertyValue('--ymz-outline-drop-depth'),line:getComputedStyle(row.querySelector('.ymz-outline-row__drop-indicator')).backgroundColor})""")
    if not outline_child['inside'] or outline_child['depth'] != '2' or outline_child['line'] != 'rgb(23, 107, 80)':
        raise RuntimeError(f'Outline CHILD indicator failed: {outline_child}')
    page.mouse.up()
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='b').children.some(n=>n.data.uid==='c')""", timeout=8000)
    moved_outline = tree_shape(page)
    moved_c = next(child for child in next(node for node in moved_outline['children'] if node['uid'] == 'b')['children'] if child['uid'] == 'c')
    if moved_c['tag'] != ['keep-c'] or moved_c['note'] != 'keep-c-note':
        raise RuntimeError(f'Outline drag lost metadata: {moved_c}')
    page.click('[data-action="undo"]'); wait_shape(page, initial_compact)

    # Parent-aligned preview can be cancelled with Escape.
    source = outline_box(page, 'a1', 'gutter'); target = outline_box(page, 'b1', 'row'); target_editor = outline_box(page, 'b1', 'editor')
    page.mouse.move(source['x'] + 5, source['y'] + source['height'] / 2); page.mouse.down()
    page.mouse.move(target_editor['x'] - 26, target['y'] + target['height'] - 2, steps=12); page.wait_for_timeout(60)
    parent_aligned = page.evaluate("""()=>[...document.querySelectorAll('[data-outline-uid]')].filter(row=>row.classList.contains('is-drop-after')).map(row=>({uid:row.dataset.outlineUid,depth:row.style.getPropertyValue('--ymz-outline-drop-depth')}))""")
    page.keyboard.press('Escape'); page.mouse.up(); page.wait_for_timeout(180)
    if not parent_aligned or parent_aligned[0]['depth'] != '1' or compact(tree_shape(page)) != initial_compact:
        raise RuntimeError(f'Outline parent alignment/Escape failed: {parent_aligned}, {tree_shape(page)}')

    # ----- Canvas drag -----
    page.click('[data-action="view-map"]')
    page.wait_for_timeout(250)

    # Pointer in the middle of the A/B gap remains NONE; neutral dashed link remains visible.
    c = canvas_box(page, 'Node C'); a = canvas_box(page, 'Node A'); b_box = canvas_box(page, 'Node B')
    sx, sy = c['x'] + 20, c['y'] + c['height'] / 2
    tx = b_box['x'] + b_box['width'] / 2
    ty = (a['y'] + a['height'] + b_box['y']) / 2
    page.mouse.move(sx, sy); page.mouse.down(); page.mouse.move(tx, ty, steps=14); page.wait_for_timeout(100)
    neutral_guides = visible_guides(page)
    page.mouse.up(); page.wait_for_timeout(260)
    if not any(item['dash'] == '4 6' for item in neutral_guides) or any(item['stroke'] == '#176b50' for item in neutral_guides) or compact(tree_shape(page)) != initial_compact:
        raise RuntimeError(f'Canvas neutral gap failed: guides={neutral_guides}, tree={tree_shape(page)}')

    # BEFORE uses a green insertion line and moves C before A.
    c = canvas_box(page, 'Node C'); a = canvas_box(page, 'Node A')
    page.mouse.move(c['x'] + 20, c['y'] + c['height'] / 2); page.mouse.down()
    page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 2, steps=14); page.wait_for_timeout(90)
    before_guides = visible_guides(page)
    if not any(item['stroke'] == '#176b50' and not item['dash'] for item in before_guides) or not any(item['dash'] == '6 6' for item in before_guides):
        raise RuntimeError(f'Canvas BEFORE guides failed: {before_guides}')
    page.mouse.up()
    page.wait_for_function("""()=>window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children[0].data.uid==='c'""", timeout=8000)
    page.click('[data-action="undo"]'); wait_shape(page, initial_compact); page.wait_for_timeout(200)

    # CHILD connects the dashed preview to B and inserts C after B1.
    c = canvas_box(page, 'Node C'); b_box = canvas_box(page, 'Node B')
    page.mouse.move(c['x'] + 20, c['y'] + c['height'] / 2); page.mouse.down()
    page.mouse.move(b_box['x'] + b_box['width'] + 25, b_box['y'] + b_box['height'] / 2, steps=16)
    page.wait_for_timeout(220); page.mouse.move(b_box['x'] + b_box['width'] + 26, b_box['y'] + b_box['height'] / 2); page.wait_for_timeout(90)
    child_guides = visible_guides(page)
    if not any(item['stroke'] == '#176b50' and not item['dash'] for item in child_guides) or not any(item['dash'] == '6 6' for item in child_guides):
        raise RuntimeError(f'Canvas CHILD guides failed: {child_guides}')
    page.mouse.up()
    page.wait_for_function("""()=>{const b=window.__smoke.plugin.repository.get(window.__smoke.map.id).data.children.find(n=>n.data.uid==='b');return b.children.map(n=>n.data.uid).join(',')==='b1,c'}""", timeout=8000)
    moved_canvas = tree_shape(page)
    moved_c = next(child for child in next(node for node in moved_canvas['children'] if node['uid'] == 'b')['children'] if child['uid'] == 'c')
    if moved_c['tag'] != ['keep-c'] or moved_c['note'] != 'keep-c-note':
        raise RuntimeError(f'Canvas drag lost metadata: {moved_c}')
    page.click('[data-action="undo"]'); wait_shape(page, initial_compact); page.wait_for_timeout(200)

    # Escape cancels a valid canvas candidate without changing structure.
    c = canvas_box(page, 'Node C'); a = canvas_box(page, 'Node A')
    page.mouse.move(c['x'] + 20, c['y'] + c['height'] / 2); page.mouse.down()
    page.mouse.move(a['x'] + a['width'] / 2, a['y'] + 2, steps=12); page.wait_for_timeout(80)
    page.keyboard.press('Escape'); page.mouse.up(); page.wait_for_timeout(220)
    if compact(tree_shape(page)) != initial_compact:
        raise RuntimeError(f'Canvas Escape changed structure: {tree_shape(page)}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))

    print({
        'outlineVisual': visual,
        'outlineNeutral': neutral_outline,
        'outlineBefore': outline_before,
        'outlineChild': outline_child,
        'parentAligned': parent_aligned,
        'canvasNeutralGuides': neutral_guides,
        'canvasBeforeGuides': before_guides,
        'canvasChildGuides': child_guides,
        'metadataPreserved': True,
        'pageErrors': len(page_errors),
        'consoleErrors': len(console_errors),
    })
    browser.close()
