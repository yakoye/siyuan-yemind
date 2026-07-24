"""v0.9.17 live node-width reflow, context-menu organization and canvas/outline selection smoke."""
from pathlib import Path
import base64
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
transparent_png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+MvWfGQAAAABJRU5ErkJggg==')
mock = r'''
window.__siyuanMock=(()=>{
  window.__menus=[];window.__dialogs=[];window.__messages=[];
  class Plugin{
    constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}}
    async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{
    constructor(id){this.id=id;this.items=[];this.element=document.createElement('div');window.__menus.push(this)}
    addItem(item){this.items.push(item);return document.createElement('div')}
    addSeparator(){this.items.push({separator:true});return document.createElement('div')}
    open(pos){this.pos=pos;window.__lastMenu=this} close(){}
  }
  class Dialog{
    constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this);window.__lastDialog=this}
    destroy(){this.element.remove();if(window.__lastDialog===this)window.__lastDialog=null}
  }
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:(...args)=>window.__messages.push(args)};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def node_rect(page, text):
    value = page.evaluate("""text=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);
      return node?.getBoundingClientRect().toJSON()||null;
    }""", text)
    if not value:
        raise RuntimeError(f'Missing node: {text}')
    return value


def click_node(page, text, button='left'):
    rect = node_rect(page, text)
    page.mouse.click(rect['x'] + rect['width'] / 2, rect['y'] + rect['height'] / 2, button=button)
    page.wait_for_timeout(100)


def active_texts(page):
    return page.evaluate("""()=>[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()).filter(Boolean)""")


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1600, 'height': 980})
    page_errors, console_errors = [], []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    def handle_local(route):
        url = route.request.url
        if '/assets/icons/marker-sprite.png' in url:
            route.fulfill(status=200, content_type='image/png', body=transparent_png)
        elif '/api/file/getFile' in url:
            route.fulfill(status=200, content_type='application/octet-stream', body=b'')
        else:
            route.continue_()

    page.route('http://yemind.local/**', handle_local)
    page.set_content('<!doctype html><html><head><base href="http://yemind.local/"></head><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1560px;height:940px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const fresh=await plugin.repository.create('v0917 interactions','logicalStructure');
      fresh.data.data={...fresh.data.data,uid:'root-v0917',text:'中心主题'};
      fresh.data.children=[
        {data:{uid:'width-parent',text:'宽度拖动父节点',customTextWidth:140},children:[
          {data:{uid:'width-child',text:'实时跟随子节点'},children:[]}
        ]},
        {data:{uid:'old-outline',text:'新节点2',icon:['yemarkerpriority_priority-01']},children:[]},
        {data:{uid:'menu-target',text:'右键菜单目标'},children:[]},
        {data:{uid:'click-target-a',text:'点击目标A'},children:[]},
        {data:{uid:'click-target-b',text:'点击目标B'},children:[]}
      ];
      await plugin.repository.update(fresh.id,{data:fresh.data});
      const container=document.createElement('div');container.style.cssText='width:1520px;height:910px;display:block';host.append(container);
      const context={element:container,data:{mapId:fresh.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,fresh,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(700)

    # 1. Native width-handle drag: child must move before mouseup.
    click_node(page, '宽度拖动父节点')
    handles = page.evaluate("""()=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='宽度拖动父节点');
      return [...node.children].filter(el=>el.tagName.toLowerCase()==='rect'&&getComputedStyle(el).cursor==='ew-resize').map(el=>el.getBoundingClientRect().toJSON());
    }""")
    if len(handles) != 2:
        raise RuntimeError(f'Native width handles not found: {handles}')
    child_before = node_rect(page, '实时跟随子节点')
    handle = handles[1]
    hx, hy = handle['x'] + handle['width']/2, handle['y'] + handle['height']/2
    page.mouse.move(hx, hy); page.mouse.down(); page.mouse.move(hx + 130, hy, steps=8)
    page.wait_for_timeout(180)
    child_during = node_rect(page, '实时跟随子节点')
    if abs(child_during['x'] - child_before['x']) < 45:
        page.mouse.up()
        raise RuntimeError(f'Child did not follow while width pointer was still down: before={child_before}, during={child_during}')
    page.mouse.up(); page.wait_for_timeout(180)
    child_after = node_rect(page, '实时跟随子节点')

    # 2. Single-node menu organization and edit command.
    click_node(page, '右键菜单目标', button='right')
    menu_state = page.evaluate("""()=>({
      id:window.__lastMenu?.id,
      labels:window.__lastMenu?.items.map(i=>i.separator?'---':i.label)||[],
      insertIcons:window.__lastMenu?.items.filter(i=>String(i.label||'').startsWith('插入')).map(i=>i.iconHTML||''),
      add:window.__lastMenu?.items.find(i=>i.label==='添加')?.submenu?.map(i=>i.label)||[]
    })""")
    expected = ['编辑节点','插入上级节点','插入同级节点','插入下级节点','添加','关联线','节点样式','---','复制','剪切','粘贴','粘贴（纯文本）','---','上移节点','下移节点','展开/折叠（下级节点）','---','删除当前和子节点','仅删除当前']
    if menu_state['id'] != 'siyuan-yemind-node-menu' or menu_state['labels'] != expected:
        raise RuntimeError(f'Node menu order/labels are wrong: {menu_state}')
    if len(menu_state['insertIcons']) != 3 or not all('<svg' in value and 'ymz-icon-insert-' in value for value in menu_state['insertIcons']):
        raise RuntimeError(f'Insertion SVG icons missing: {menu_state["insertIcons"]}')
    if menu_state['add'][:2] != ['添加待办', '外框']:
        raise RuntimeError(f'Add submenu state is wrong: {menu_state["add"]}')

    page.evaluate("""()=>window.__lastMenu.items.find(i=>i.label==='编辑节点').click()""")
    page.wait_for_selector('.smm-richtext-node-edit-wrap .ql-editor', timeout=5000)
    page.wait_for_timeout(120)
    edit_state = page.evaluate("""()=>({text:document.querySelector('.smm-richtext-node-edit-wrap .ql-editor')?.innerText.trim()||'',selection:window.getSelection()?.toString().trim()||''})""")
    if edit_state != {'text':'右键菜单目标','selection':'右键菜单目标'}:
        raise RuntimeError(f'Edit node did not select all text: {edit_state}')
    page.keyboard.press('Escape'); page.mouse.click(40, 880); page.wait_for_timeout(150)

    # Dynamic todo and frame labels.
    click_node(page, '右键菜单目标', button='right')
    page.evaluate("""()=>window.__lastMenu.items.find(i=>i.label==='添加').submenu.find(i=>i.label==='添加待办').click()""")
    page.wait_for_timeout(250)
    click_node(page, '右键菜单目标', button='right')
    todo_after = page.evaluate("""()=>window.__lastMenu.items.find(i=>i.label==='添加').submenu.map(i=>i.label)""")
    if todo_after[0] != '删除待办':
        raise RuntimeError(f'Todo remove label missing: {todo_after}')
    page.evaluate("""()=>window.__lastMenu.items.find(i=>i.label==='添加').submenu.find(i=>i.label==='外框').click()""")
    page.wait_for_timeout(250)
    click_node(page, '右键菜单目标', button='right')
    frame_after = page.evaluate("""()=>window.__lastMenu.items.find(i=>i.label==='添加').submenu.map(i=>i.label)""")
    if '删除外框' not in frame_after:
        raise RuntimeError(f'Outer-frame remove label missing: {frame_after}')

    # 3. Reproduce the stale-outline range path, then verify each canvas click wins.
    page.locator('[data-action="view-split"]').click()
    page.wait_for_selector('[data-outline-uid="old-outline"] [data-outline-editor]', timeout=5000)
    page.evaluate("""()=>{
      const host=document.querySelector('[data-outline-uid="old-outline"] [data-outline-editor]');
      host.dispatchEvent(new PointerEvent('pointerdown',{bubbles:true,button:0}));
      const range=document.createRange();range.selectNodeContents(host);
      const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);
      document.dispatchEvent(new Event('selectionchange'));
    }""")
    page.wait_for_timeout(100)
    if active_texts(page) != ['新节点2']:
        raise RuntimeError(f'Outline baseline activation failed: {active_texts(page)}')

    selected_sequence=[]
    for text in ['点击目标A','宽度拖动父节点','点击目标B','右键菜单目标']:
        click_node(page,text)
        selected_sequence.append(active_texts(page))
        if active_texts(page) != [text]:
            raise RuntimeError(f'Canvas selection was reclaimed by stale outline row after clicking {text}: {active_texts(page)}')

    remaining_outline_selection = page.evaluate("""()=>{const s=window.getSelection();return s?.anchorNode&&document.querySelector('[data-role="outline"]')?.contains(s.anchorNode)?s.toString():''}""")
    if remaining_outline_selection:
        raise RuntimeError(f'Stale outline selection was not cleared: {remaining_outline_selection!r}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    print({
      'liveWidth': {'beforeX': round(child_before['x'],1), 'duringX': round(child_during['x'],1), 'afterX': round(child_after['x'],1)},
      'menuOrder': True,
      'insertIcons': 3,
      'editSelection': edit_state['selection'],
      'todoDynamic': todo_after[0],
      'outerFrameDynamic': '删除外框',
      'canvasSelectionSequence': selected_sequence,
      'staleOutlineSelectionCleared': True,
      'pageErrors': 0,
      'consoleErrors': 0,
    })
    browser.close()
