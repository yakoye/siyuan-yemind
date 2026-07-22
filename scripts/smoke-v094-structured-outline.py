from pathlib import Path
from playwright.sync_api import sync_playwright
import re
import time

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}};class Menu{constructor(){this.element=document.createElement('div')}addItem(){return document.createElement('div')}addSeparator(){return document.createElement('div')}open(){}close(){}};class Dialog{constructor(){this.element=document.createElement('div')}destroy(){}};class Setting{addItem(){}};return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}}})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

sample = r'''0.6 About This Book; 60
    0.6.1 The MindShare Technology Series; 60
    0.6.2 Cautionary Note; 61
    0.6.6 Documentation Conventions; 62
        0.6.6.1 PCI Express™; 62
        0.6.6.2 Hexadecimal Notation; 63
        0.6.6.3 Binary Notation; 63
    1. Chapter 1\: Background; 68
        1.1 Introduction; 68
        1.2 PCI and PCI-X; 69
        1.3 PCI Basics; 70
            1.3.1 Basics of a PCI-Based System; 70
            1.3.2 PCI Bus Initiator and Target; 71
            1.3.3 Typical PCI Bus Cycle; 72
            1.3.4 Reflected-Wave Signaling; 75
        1.4 PCI Bus Architecture Perspective; 77
            1.4.1 PCI Transaction Models; 77
                1.4.1.1 Programmed I/O; 77
                1.4.1.2 Direct Memory Access (DMA); 78
                1.4.1.3 Peer-to-Peer; 79
    2. Chapter 2\: PCIe Architecture Overview; 98
        2.1 Introduction to PCI Express; 98
            2.1.1 Software Backward Compatibility; 100
            2.1.2 Serial Transport; 100
                2.1.2.1 The Need for Speed; 100
                    2.1.2.1.1 Overcoming Problems; 100
                    2.1.2.1.2 Bandwidth; 101
                2.1.2.2 PCIe Bandwidth Calculation; 102
                2.1.2.3 Differential Signals; 103
                2.1.2.4 No Common Clock; 104
                2.1.2.5 Packet-based Protocol; 105
            2.1.3 Links and Lanes; 105
                2.1.3.1 Scalable Performance; 105
                2.1.3.2 Flexible Topology Options; 106'''


def plain(value):
    return re.sub(r'<[^>]+>', '', value or '').replace('&nbsp;', ' ').strip()


def select_range(page, uid1, start, uid2=None, end=None):
    uid2 = uid2 or uid1
    end = start if end is None else end
    ok = page.evaluate("""({u1,s,u2,e})=>{
      const root=document.querySelector('[data-role=outline-tree]');
      const find=u=>[...root.querySelectorAll(':scope > [data-outline-uid]')].find(r=>r.dataset.outlineUid===u)?.querySelector('[data-outline-editor]');
      const point=(el,o)=>{let rem=o;const w=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);let n=w.nextNode(),last=null;while(n){last=n;const l=n.nodeValue.length;if(rem<=l)return[n,rem];rem-=l;n=w.nextNode()}return last?[last,last.nodeValue.length]:[el,0]};
      const a=find(u1),b=find(u2);if(!a||!b)return false;root.focus();const [an,ao]=point(a,s),[bn,bo]=point(b,e);const r=document.createRange();r.setStart(an,ao);r.setEnd(bn,bo);const sel=getSelection();sel.removeAllRanges();sel.addRange(r);a.dispatchEvent(new FocusEvent('focusin',{bubbles:true}));return true;
    }""", {'u1': uid1, 's': start, 'u2': uid2, 'e': end})
    if not ok:
        raise RuntimeError(f'Could not select {uid1}:{start} to {uid2}:{end}')


def clipboard(page, event_type, text='', html=''):
    return page.evaluate("""({type,text,html})=>{const store={'text/plain':text,'text/html':html};const data={items:[],getData:k=>store[k]||'',setData:(k,v)=>store[k]=v};const ev=new Event(type,{bubbles:true,cancelable:true});Object.defineProperty(ev,'clipboardData',{value:data});document.querySelector('[data-role=outline-tree]').dispatchEvent(ev);return{prevented:ev.defaultPrevented,text:store['text/plain']||'',html:store['text/html']||''};}""", {'type': event_type, 'text': text, 'html': html})


def rows(page):
    return page.evaluate("""()=>[...document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]')].map(r=>({uid:r.dataset.outlineUid,text:r.querySelector('[data-outline-editor]')?.innerText||'',depth:Number(r.style.getPropertyValue('--ymz-outline-depth')||0),hidden:r.dataset.outlineHidden==='true',expanded:r.dataset.outlineExpanded==='true'}))""")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1360, 'height': 920})
    page_errors = []
    console_errors = []
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1280px;height:860px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0.9.4 Structured Outline Smoke','logicalStructure');await plugin.repository.update(map.id,{data:{data:{uid:'root',text:'Root Topic',expand:true,tag:['root-meta']},children:[{data:{uid:'a',text:'Alpha Node',expand:true,tag:['keep-a']},children:[{data:{uid:'a1',text:'Old Child',expand:true,yemindNote:'keep-note'},children:[]}]},{data:{uid:'b',text:'Beta Node',expand:false,tag:['keep-b']},children:[{data:{uid:'b1',text:'Hidden Child',tag:['keep-b1']},children:[]}]},{data:{uid:'c',text:'Gamma Node',expand:true},children:[{data:{uid:'c1',text:'Gamma Child'},children:[]}]}]}});const container=document.createElement('div');container.style.cssText='width:1200px;height:820px;display:block';host.append(container);const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);}""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.click('[data-action="view-split"]')
    page.wait_for_selector('[data-role="outline-tree"] > [data-outline-uid="a"]')

    surface = page.evaluate("""()=>({modes:document.querySelectorAll('[data-outline-mode-button]').length,textarea:document.querySelectorAll('[data-role=outline-text-editor]').length,contentEditable:document.querySelector('[data-role=outline-tree]').contentEditable,rowCount:document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]').length})""")
    if surface != {'modes': 0, 'textarea': 0, 'contentEditable': 'true', 'rowCount': 7}:
        raise RuntimeError(f'Unified surface contract failed: {surface}')

    marker = page.evaluate("""()=>{const tri=document.querySelector('[data-outline-uid=root] .ymz-outline-row__triangle');const square=document.querySelector('[data-outline-uid=c1] .ymz-outline-row__leaf-square');return{triangle:[getComputedStyle(tri).width,getComputedStyle(tri).height,getComputedStyle(tri).backgroundColor],square:[getComputedStyle(square).width,getComputedStyle(square).height,getComputedStyle(square).backgroundColor]}}""")
    if marker['triangle'] != ['7px', '7px', 'rgb(0, 0, 0)'] or marker['square'] != ['5px', '5px', 'rgb(0, 0, 0)']:
        raise RuntimeError(f'Marker sizing failed: {marker}')

    # Two-stage Ctrl+A, then live selection must replace only the new range.
    select_range(page, 'a', 2)
    page.keyboard.press('Control+A')
    if page.evaluate('()=>getSelection().toString()') != 'Alpha Node':
        raise RuntimeError('First Ctrl+A did not select the current node')
    page.keyboard.press('Control+A')
    whole_copy = clipboard(page, 'copy')
    if '        Hidden Child' not in whole_copy['text']:
        raise RuntimeError(f'Second Ctrl+A did not include collapsed content: {whole_copy}')
    select_range(page, 'a', 0, 'a', 5)
    clipboard(page, 'paste', 'Omega')
    page.wait_for_function("""()=>document.querySelector('[data-outline-uid=a] [data-outline-editor]')?.innerText==='Omega Node'""", timeout=5000)
    page.wait_for_function("""()=>String(window.__smoke.plugin.repository.get(window.__smoke.map.id)?.data?.children?.[0]?.data?.text||'').includes('Omega Node')""", timeout=7000)

    # Cross-node range + Ctrl+A jumps directly to the whole document.
    select_range(page, 'a', 1, 'c', 3)
    page.keyboard.press('Control+A')
    cross_promoted = clipboard(page, 'copy')['text']
    if cross_promoted != whole_copy['text'].replace('Alpha Node', 'Omega Node'):
        raise RuntimeError('Cross-node Ctrl+A did not promote to whole-outline selection')

    # Hidden descendants are omitted from an ordinary visible range and must not shift the end offset.
    select_range(page, 'a', 2, 'b', 2)
    partial_copy = clipboard(page, 'copy')
    if 'Hidden Child' in partial_copy['text'] or not partial_copy['text'].endswith('    Be'):
        raise RuntimeError(f'Visible cross-row copy boundaries failed: {partial_copy}')

    # Structured multiline replacement preserves rich markup outside the selected text.
    select_range(page, 'c', 0, 'c', len('Gamma Node'))
    clipboard(page, 'paste', 'AA middle ZZ', '<a href="https://prefix.example">AA</a> middle <a href="https://suffix.example">ZZ</a>')
    page.wait_for_timeout(600)
    select_range(page, 'c', 3, 'c', 9)
    clipboard(page, 'paste', 'New\nNext')
    page.wait_for_timeout(250)
    rich_boundary = page.evaluate("""()=>{const row=document.querySelector('[data-outline-uid=c]');const created=[...document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]')].find(item=>item.querySelector('[data-outline-editor]')?.innerText==='Next ZZ');return{first:row?.querySelector('[data-outline-editor]')?.innerHTML||'',second:created?.querySelector('[data-outline-editor]')?.innerHTML||'',secondText:created?.querySelector('[data-outline-editor]')?.innerText||''}}""")
    if 'AA' not in rich_boundary['first'] or 'New' not in rich_boundary['first'] or 'suffix.example' not in rich_boundary['second'] or rich_boundary['secondText'] != 'Next ZZ':
        raise RuntimeError(f'Rich boundary preservation failed: {rich_boundary}')

    # Flat hover/current states. Ensure another row is active so hover is measured independently.
    page.click('[data-outline-uid="b"] [data-outline-editor]')
    page.mouse.move(1260, 880)
    page.hover('[data-outline-uid="c1"]')
    hover = page.eval_on_selector('[data-outline-uid="c1"]', "e=>({bg:getComputedStyle(e).backgroundColor,border:getComputedStyle(e).border,shadow:getComputedStyle(e).boxShadow})")
    page.click('[data-outline-uid="c1"] [data-outline-editor]')
    active = page.eval_on_selector('[data-outline-uid="c1"]', "e=>({bg:getComputedStyle(e).backgroundColor,color:getComputedStyle(e).color,border:getComputedStyle(e).border,shadow:getComputedStyle(e).boxShadow})")
    if hover != {'bg': 'rgb(236, 236, 236)', 'border': '0px none rgb(0, 0, 0)', 'shadow': 'none'}:
        raise RuntimeError(f'Flat hover state failed: {hover}')
    if active['bg'] != 'rgb(222, 234, 230)' or active['shadow'] != 'none' or not active['border'].startswith('0px none'):
        raise RuntimeError(f'Flat active state failed: {active}')

    # Toolbar stays hidden while pointer selection is active and appears after release.
    editor_box = page.locator('[data-outline-uid="c"] [data-outline-editor]').bounding_box()
    page.mouse.move(editor_box['x'] + 5, editor_box['y'] + editor_box['height'] / 2)
    page.mouse.down()
    select_range(page, 'c', 0, 'c', 5)
    during = page.locator('.ymz-rich-toolbar').is_hidden()
    page.mouse.up()
    page.wait_for_timeout(80)
    after = page.locator('.ymz-rich-toolbar').is_visible()
    if not during or not after:
        raise RuntimeError(f'Selection toolbar timing failed: during={during}, after={after}')

    # Rich HTML is preserved for selected-text replacement and clipboard round-trip.
    select_range(page, 'c', 0, 'c', len('AA New'))
    clipboard(page, 'paste', 'Bold Link', '<strong>Bold</strong> <a href="https://example.com">Link</a>')
    page.wait_for_timeout(500)
    c_html = page.eval_on_selector('[data-outline-uid="c"] [data-outline-editor]', 'e=>e.innerHTML')
    if '<strong>Bold</strong>' not in c_html or '<a href="https://example.com">Link</a>' not in c_html:
        raise RuntimeError(f'Rich paste failed: {c_html}')
    select_range(page, 'c', 0, 'c', len('Bold Link'))
    rich_copy = clipboard(page, 'copy')
    if '<strong>Bold</strong>' not in rich_copy['html']:
        raise RuntimeError(f'Rich copy failed: {rich_copy}')

    # Readonly keeps staged selection/copy but blocks paste and history mutation shortcuts.
    page.click('[data-action="readonly"]')
    page.wait_for_function("""()=>document.querySelector('[data-role=outline-tree]').contentEditable==='false'""")
    select_range(page, 'b', 1)
    page.wait_for_timeout(150)
    readonly_before_select = page.evaluate("()=>({text:getSelection().toString(),active:document.activeElement?.dataset?.role||document.activeElement?.className||document.activeElement?.tagName})")
    page.keyboard.press('Control+A')
    readonly_after_select = page.evaluate("()=>({text:getSelection().toString(),active:document.activeElement?.dataset?.role||document.activeElement?.className||document.activeElement?.tagName})")
    readonly_node_copy = clipboard(page, 'copy')
    if readonly_node_copy['text'] != 'Beta Node':
        raise RuntimeError(f'Readonly current-node copy failed: before={readonly_before_select}, after={readonly_after_select}, copy={readonly_node_copy}')
    page.keyboard.press('Control+A')
    readonly_whole_copy = clipboard(page, 'copy')
    readonly_before = page.eval_on_selector('[data-outline-uid=b] [data-outline-editor]', 'e=>e.innerText')
    readonly_paste = clipboard(page, 'paste', 'Blocked')
    page.keyboard.press('Control+Z')
    page.wait_for_timeout(120)
    readonly_after = page.eval_on_selector('[data-outline-uid=b] [data-outline-editor]', 'e=>e.innerText')
    if readonly_paste['prevented'] or readonly_before != readonly_after or 'Hidden Child' not in readonly_whole_copy['text']:
        raise RuntimeError(f'Readonly selection/mutation contract failed: paste={readonly_paste}, before={readonly_before!r}, after={readonly_after!r}')
    page.click('[data-action="readonly"]')
    page.wait_for_function("""()=>document.querySelector('[data-role=outline-tree]').contentEditable==='true'""")

    # Multiline full-node replacement keeps UID/metadata and existing children.
    select_range(page, 'a', 2)
    page.keyboard.press('Control+A')
    clipboard(page, 'paste', 'Parent A\n    New Child\nSibling X')
    page.wait_for_function("""()=>[...document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]')].some(r=>r.querySelector('[data-outline-editor]')?.innerText==='Sibling X')""", timeout=5000)
    current_rows = rows(page)
    parent_index = next(i for i, row in enumerate(current_rows) if row['uid'] == 'a')
    sibling_index = next(i for i, row in enumerate(current_rows) if row['text'] == 'Sibling X')
    old_child_index = next(i for i, row in enumerate(current_rows) if row['uid'] == 'a1')
    if not (parent_index < old_child_index < sibling_index) or current_rows[old_child_index]['depth'] != 2:
        raise RuntimeError(f'Existing subtree was reparented by multiline paste: {current_rows}')
    page.wait_for_function("""()=>{const a=window.__smoke.plugin.repository.get(window.__smoke.map.id)?.data?.children?.[0];return String(a?.data?.text||'').includes('Parent A')&&a?.data?.tag?.[0]==='keep-a'&&a?.children?.some(n=>n.data.uid==='a1'&&n.data.yemindNote==='keep-note')}""", timeout=7000)

    # Drag geometry is covered by smoke-v096-outline-logical-drag.py.

    # IME does not reconcile half-composed text.
    ime_editor = page.locator('[data-outline-uid="c"] [data-outline-editor]')
    before_ime = plain(page.evaluate("()=>window.__smoke.plugin.repository.get(window.__smoke.map.id)?.data?.children?.find(n=>n.data.uid==='c')?.data?.text"))
    page.eval_on_selector('[data-outline-uid="c"] [data-outline-editor]', "e=>{e.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true}));e.textContent='输入中';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'输入中',isComposing:true}));}")
    page.wait_for_timeout(700)
    during_ime = plain(page.evaluate("()=>window.__smoke.plugin.repository.get(window.__smoke.map.id)?.data?.children?.find(n=>n.data.uid==='c')?.data?.text"))
    if during_ime != before_ime:
        raise RuntimeError(f'IME committed before compositionend: {before_ime!r} -> {during_ime!r}')
    page.eval_on_selector('[data-outline-uid="c"] [data-outline-editor]', "e=>e.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'输入中'}))")
    page.wait_for_function("""()=>String(window.__smoke.plugin.repository.get(window.__smoke.map.id)?.data?.children?.find(n=>n.data.uid==='c')?.data?.text||'').includes('输入中')""", timeout=7000)

    # Full-outline replacement from the supplied 34-line reference document.
    select_range(page, 'root', 0)
    page.keyboard.press('Control+A'); page.keyboard.press('Control+A')
    clipboard(page, 'paste', sample)
    page.wait_for_function("""()=>document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]').length===34""", timeout=10000)
    imported = rows(page)
    if imported[0]['text'] != '0.6 About This Book; 60' or imported[-1]['text'] != '2.1.3.2 Flexible Topology Options; 106':
        raise RuntimeError(f'34-line import boundary mismatch: {imported[:2]} ... {imported[-2:]}')
    if max(row['depth'] for row in imported) != 5:
        raise RuntimeError(f'34-line import depth mismatch: {max(row["depth"] for row in imported)}')
    if next(row for row in imported if row['text'].startswith('1. Chapter'))['text'] != '1. Chapter 1: Background; 68':
        raise RuntimeError('Escaped punctuation was not normalized')

    # A large structured paste remains responsive and creates one coherent projection.
    large = 'Large Root\n' + '\n'.join(f"    Node {index}\n        Detail {index}" for index in range(300))
    select_range(page, imported[0]['uid'], 0)
    page.keyboard.press('Control+A'); page.keyboard.press('Control+A')
    started = time.perf_counter()
    clipboard(page, 'paste', large)
    page.wait_for_function("""()=>document.querySelectorAll('[data-role=outline-tree] > [data-outline-uid]').length===601""", timeout=15000)
    elapsed = time.perf_counter() - started
    if elapsed > 12:
        raise RuntimeError(f'Large outline paste was too slow: {elapsed:.2f}s')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({
        'surface': surface,
        'markers': marker,
        'wholeCopyLines': len(whole_copy['text'].splitlines()),
        'hover': hover,
        'active': active,
        'toolbarAfterSelection': after,
        'richCopy': rich_copy['html'],
        'dragCoveredBy': 'smoke-v096-outline-logical-drag.py',
        'importedNodes': len(imported),
        'largeNodes': 601,
        'largePasteSeconds': round(elapsed, 3),
    })
    browser.close()
