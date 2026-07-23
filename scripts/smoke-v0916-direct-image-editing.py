"""v0.9.16 direct image selection, resizing, deletion and text-editing browser smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
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


def node_info(page, text):
    value = page.evaluate("""text=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(item=>item.querySelector('.smm-richtext-node-wrap')?.innerText.trim()===text);
      if(!node)return null;
      const image=node.querySelector('image');
      const label=node.querySelector('.smm-richtext-node-wrap');
      return {node:node.getBoundingClientRect().toJSON(),image:image?.getBoundingClientRect().toJSON()||null,text:label?.getBoundingClientRect().toJSON()||null,active:node.classList.contains('active')};
    }""", text)
    if not value:
        raise RuntimeError(f'Missing node: {text}')
    return value


def click_image(page, text, count=1):
    info = node_info(page, text)
    if not info['image']:
        raise RuntimeError(f'Missing image for node: {text}')
    r = info['image']
    page.mouse.click(r['x'] + r['width'] / 2, r['y'] + r['height'] / 2, click_count=count)
    return info


def drag_handle(page, selector, dx, dy, shift=False):
    handle = page.locator(selector)
    box = handle.bounding_box()
    if not box:
        raise RuntimeError(f'Handle unavailable: {selector}')
    x = box['x'] + box['width'] / 2
    y = box['y'] + box['height'] / 2
    if shift:
        page.keyboard.down('Shift')
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + dx, y + dy, steps=6)
    page.mouse.up()
    if shift:
        page.keyboard.up('Shift')
    page.wait_for_timeout(180)


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1500, 'height': 940})
    page_errors, console_errors = [], []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)

    def handle_local(route):
        url = route.request.url
        if '/assets/clipart/' in url:
            route.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" width="96" height="64" viewBox="0 0 96 64"><rect width="96" height="64" rx="12" fill="#f5ca63"/><circle cx="48" cy="31" r="18" fill="#ffffff"/><circle cx="41" cy="28" r="2"/><circle cx="55" cy="28" r="2"/></svg>')
        elif '/api/file/getFile' in url:
            route.fulfill(status=200, content_type='application/octet-stream', body=b'')
        else:
            route.continue_()

    page.route('http://yemind.local/**', handle_local)
    page.set_content('<!doctype html><html><head><base href="http://yemind.local/"></head><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1460px;height:900px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const fresh=await plugin.repository.create('v0916 image editing','logicalStructure');
      const src='/plugins/siyuan-yemind/assets/clipart/01_动物/013_熊猫.svg';
      fresh.data.data={...fresh.data.data,uid:'root-v0916',text:'中心主题'};
      fresh.data.children=[
        {data:{uid:'hover-image',text:'悬停图片',image:src,imageTitle:'悬停图片',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'edge-image',text:'边线缩放',image:src,imageTitle:'边线缩放',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'corner-image',text:'角点缩放',image:src,imageTitle:'角点缩放',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'delete-image',text:'键盘删除图',image:src,imageTitle:'键盘删除图',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'toolbar-image',text:'工具栏图片',image:src,imageTitle:'工具栏图片',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'preview-image',text:'双击预览图',image:src,imageTitle:'双击预览图',imageSize:{width:48,height:32,custom:true}},children:[]},
        {data:{uid:'text-only',text:'双击全选文字'},children:[]}
      ];
      await plugin.repository.update(fresh.id,{data:fresh.data});
      const container=document.createElement('div');container.style.cssText='width:1420px;height:870px;display:block';host.append(container);
      const context={element:container,data:{mapId:fresh.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,fresh,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(500)

    # Hover: image-only border, no controls.
    hover = node_info(page, '悬停图片')['image']
    page.mouse.move(hover['x'] + hover['width'] / 2, hover['y'] + hover['height'] / 2)
    page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='hover'")
    hover_state = page.evaluate("""()=>{const f=document.querySelector('.ymz-node-image-frame');return{mode:f?.dataset.mode,display:getComputedStyle(f).display,handles:[...f.querySelectorAll('.ymz-node-image-resize-handle')].map(el=>getComputedStyle(el).display),toolbar:getComputedStyle(f.querySelector('.ymz-node-image-toolbar')).display}}""")
    if hover_state['mode'] != 'hover' or hover_state['display'] == 'none' or any(value != 'none' for value in hover_state['handles']) or hover_state['toolbar'] != 'none':
        raise RuntimeError(f'Hover image controls are wrong: {hover_state}')

    # Click: image selected and containing node active.
    click_image(page, '悬停图片')
    page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='selected'")
    selected_state = page.evaluate("""()=>{const f=document.querySelector('.ymz-node-image-frame');const active=[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim());return{handles:f.querySelectorAll('.ymz-node-image-resize-handle').length,toolbar:[...f.querySelectorAll('[data-image-action]')].map(b=>b.dataset.imageAction),deleteButton:!!f.querySelector('.ymz-node-image-delete'),active,cursors:Object.fromEntries([...f.querySelectorAll('.ymz-node-image-resize-handle')].map(el=>[el.dataset.handle,getComputedStyle(el).cursor]))}}""")
    if selected_state['handles'] != 8 or selected_state['toolbar'] != ['replace', 'delete'] or not selected_state['deleteButton'] or selected_state['active'] != ['悬停图片']:
        raise RuntimeError(f'Image click selection is wrong: {selected_state}')
    expected_cursors = {'n':'ns-resize','s':'ns-resize','e':'ew-resize','w':'ew-resize','nw':'nwse-resize','se':'nwse-resize','ne':'nesw-resize','sw':'nesw-resize'}
    if selected_state['cursors'] != expected_cursors:
        raise RuntimeError(f'Image resize cursors are wrong: {selected_state["cursors"]}')

    # Clicking text/outside the image returns ownership to ordinary node selection.
    same_node_text = node_info(page, '悬停图片')['text']
    page.mouse.click(same_node_text['x'] + same_node_text['width']/2, same_node_text['y'] + same_node_text['height']/2)
    page.wait_for_timeout(80)
    node_click_state = page.evaluate("""()=>{const f=document.querySelector('.ymz-node-image-frame');return{frameMode:f?.dataset.mode,frameDisplay:f&&getComputedStyle(f).display,active:[...document.querySelectorAll('g.smm-node.active')].map(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim())}}""")
    if node_click_state['frameDisplay'] != 'none' or node_click_state['active'] != ['悬停图片']:
        raise RuntimeError(f'Node/text click did not close image selection: {node_click_state}')
    click_image(page, '悬停图片')
    page.wait_for_function("()=>document.querySelector('.ymz-node-image-frame')?.dataset.mode==='selected'")

    # Replace toolbar uses the existing image dialog.
    page.locator('[data-image-action="replace"]').click()
    page.wait_for_timeout(100)
    replacement = page.evaluate("()=>({dialog:!!window.__lastDialog,content:window.__lastDialog?.element?.textContent||''})")
    if not replacement['dialog']:
        raise RuntimeError(f'Replace toolbar did not open the image dialog: {replacement}')
    page.evaluate("()=>window.__lastDialog?.destroy()")

    # Side handle: free width-only resize.
    before_edge = node_info(page, '边线缩放')['image']
    click_image(page, '边线缩放')
    drag_handle(page, '.ymz-node-image-resize-handle[data-handle="e"]', 28, 24, shift=False)
    after_edge = node_info(page, '边线缩放')['image']
    if after_edge['width'] <= before_edge['width'] + 20 or abs(after_edge['height'] - before_edge['height']) > 1.5:
        raise RuntimeError(f'Edge free resize changed the wrong axes: before={before_edge}, after={after_edge}')

    # Shift + side handle: both axes change and ratio is preserved.
    click_image(page, '边线缩放')
    before_shift = node_info(page, '边线缩放')['image']
    before_ratio = before_shift['width'] / before_shift['height']
    drag_handle(page, '.ymz-node-image-resize-handle[data-handle="e"]', 24, 0, shift=True)
    after_shift = node_info(page, '边线缩放')['image']
    after_ratio = after_shift['width'] / after_shift['height']
    if after_shift['width'] <= before_shift['width'] + 15 or after_shift['height'] <= before_shift['height'] + 5 or abs(after_ratio - before_ratio) > 0.04:
        raise RuntimeError(f'Shift edge resize did not preserve ratio: before={before_shift}, after={after_shift}')

    # Corner handle always preserves ratio even without Shift.
    before_corner = node_info(page, '角点缩放')['image']
    click_image(page, '角点缩放')
    drag_handle(page, '.ymz-node-image-resize-handle[data-handle="se"]', 24, 2, shift=False)
    after_corner = node_info(page, '角点缩放')['image']
    if after_corner['width'] <= before_corner['width'] + 15 or abs(after_corner['width']/after_corner['height'] - before_corner['width']/before_corner['height']) > 0.04:
        raise RuntimeError(f'Corner resize did not preserve ratio: before={before_corner}, after={after_corner}')

    # Delete key removes only the image and preserves the node.
    click_image(page, '键盘删除图')
    page.keyboard.press('Delete')
    page.wait_for_function("()=>{const n=[...document.querySelectorAll('g.smm-node')].find(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='键盘删除图');return n&&!n.querySelector('image')}")
    delete_state = node_info(page, '键盘删除图')
    if delete_state['image'] is not None:
        raise RuntimeError(f'Delete key removed the wrong target: {delete_state}')

    # Toolbar Delete is also image-scoped.
    click_image(page, '工具栏图片')
    page.locator('[data-image-action="delete"]').click()
    page.wait_for_function("()=>{const n=[...document.querySelectorAll('g.smm-node')].find(n=>n.querySelector('.smm-richtext-node-wrap')?.innerText.trim()==='工具栏图片');return n&&!n.querySelector('image')}")
    # Wait for the render pass triggered by image deletion to finish before
    # taking coordinates from a different node. This mirrors the next user
    # gesture and prevents a stale bounding box from making the smoke flaky.
    page.wait_for_timeout(180)

    # Image double-click opens the lightbox instead of text editing.
    click_image(page, '双击预览图', count=2)
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])', timeout=5000)
    preview_state = page.evaluate("()=>({lightbox:getComputedStyle(document.querySelector('.ymz-image-lightbox')).display,textEdit:!!document.querySelector('.smm-richtext-node-edit-wrap .ql-editor')})")
    if preview_state['lightbox'] == 'none' or preview_state['textEdit']:
        raise RuntimeError(f'Image double-click routing is wrong: {preview_state}')
    page.keyboard.press('Escape')
    page.wait_for_timeout(80)

    # Text double-click edits and selects the complete text.
    text_info = node_info(page, '双击全选文字')['text']
    page.mouse.click(text_info['x'] + text_info['width']/2, text_info['y'] + text_info['height']/2, click_count=2)
    page.wait_for_selector('.smm-richtext-node-edit-wrap .ql-editor', timeout=5000)
    page.wait_for_timeout(120)
    edit_state = page.evaluate("""()=>{const editor=document.querySelector('.smm-richtext-node-edit-wrap .ql-editor');const selection=window.getSelection()?.toString()||'';return{editorText:editor?.innerText.trim()||'',selection:selection.trim(),oldControls:{preview:!!document.querySelector('.ymz-node-image-preview'),resize:!!document.querySelector('.node-image-resize'),remove:!!document.querySelector('.node-image-remove')}}}""")
    if edit_state['editorText'] != '双击全选文字' or edit_state['selection'] != '双击全选文字' or any(edit_state['oldControls'].values()):
        raise RuntimeError(f'Text double-click or old-control cleanup is wrong: {edit_state}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))

    print({
        'hover': hover_state,
        'selection': selected_state,
        'nodeClick': node_click_state,
        'replacement': replacement,
        'edgeFree': {'before': before_edge, 'after': after_edge},
        'edgeShift': {'before': before_shift, 'after': after_shift},
        'corner': {'before': before_corner, 'after': after_corner},
        'delete': delete_state,
        'preview': preview_state,
        'textEdit': edit_state,
        'pageErrors': 0,
        'consoleErrors': 0,
    })
    browser.close()
