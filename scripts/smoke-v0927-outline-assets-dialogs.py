"""Browser regression for v0.9.27 outline assets, anchored dialogs, hover previews and todo alignment."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';row.disabled=!!item.disabled;
    if(item.iconHTML){const icon=document.createElement('span');icon.className='b3-menu__icon';icon.innerHTML=item.iconHTML;row.append(icon)}else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','b3-menu__icon');row.append(svg)}
    const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(label);
    if(item.type==='submenu'){row.addEventListener('mouseenter',()=>{document.querySelectorAll('.b3-menu--submenu').forEach(e=>e.remove());const sub=document.createElement('div');sub.className='b3-menu b3-menu--submenu';(item.submenu||[]).forEach(x=>sub.append(renderItem(x)));document.body.append(sub)})}
    else row.addEventListener('click',()=>{if(!row.disabled)item.click?.()});return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){const s=document.createElement('div');s.className='b3-menu__separator';this.element.append(s)}open(){document.body.append(this.element)}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.className='b3-dialog';this.element.dataset.dialogTitle=options.title||'';const scrim=document.createElement('div');scrim.className='b3-dialog__scrim';const container=document.createElement('div');container.className='b3-dialog__container';if(options.width)container.style.width=options.width;if(options.height)container.style.height=options.height;container.innerHTML=options.content||'';this.element.append(scrim,container);document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
body{margin:0;background:#fff;color:#202124}.b3-dialog{position:fixed;z-index:110;inset:0}.b3-dialog__scrim{position:absolute;inset:0;background:rgba(0,0,0,.2)}.b3-dialog__container{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;background:#fff;overflow:hidden}.b3-dialog__content{box-sizing:border-box}.b3-button{min-height:28px}.b3-menu{position:fixed;z-index:99;left:20px;top:70px;display:flex;flex-direction:column;width:300px;padding:6px;background:#fff}.b3-menu__item{display:flex;align-items:center;min-height:30px;border:0;background:transparent}.b3-menu__label{flex:1;text-align:left}
'''

def rect(page, locator):
    return locator.evaluate("e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height}}")

def intersects(a,b):
    return a['left'] < b['right'] and a['right'] > b['left'] and a['top'] < b['bottom'] and a['bottom'] > b['top']

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':760})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1260px;height:740px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();window.__plugin=plugin;plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0927','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'icon-node',text:'图标节点',icon:['yemarkerpriority_priority-03'],yemindTodo:{checked:false,text:'待办预览'},yemindNote:{html:'<p>备注预览</p>',updatedAt:1},yemindComments:[{id:'c1',text:'批注预览',createdAt:1,updatedAt:1}],tag:['PCIe','RAS'],hyperlink:'https://example.com',outerFrame:{groupId:'frame1'}},children:[]},
        {data:{uid:'clip-node',text:'剪贴图节点',image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'剪贴图',imageSize:{width:80,height:80,custom:true},yemindClipartId:'technology-011'},children:[]}
      ]};
      await plugin.repository.update(map.id,{data:map.data});window.__mapId=map.id;
      const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);
      window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});
    }""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.locator('[data-action="view-outline"]').click()
    row=page.locator('.ymz-outline-row[data-outline-uid="icon-node"]')
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="icon-node"]')

    marker=row.locator('[data-outline-icon-action]')
    if marker.count()!=1: raise RuntimeError('outline marker action missing')
    marker_style=marker.locator('.ymz-marker-sprite').evaluate("e=>({background:getComputedStyle(e).backgroundImage,pattern:e.innerHTML.includes('<pattern')})")
    if marker_style['background']=='none' or marker_style['pattern']:
        raise RuntimeError(f'outline marker sprite invalid: {marker_style}')
    marker_rect=rect(page,marker)
    marker.click()
    page.wait_for_selector('.ymz-marker-dialog')
    dialog=page.locator('.b3-dialog:has(.ymz-marker-dialog)')
    header=dialog.locator('.ymz-local-asset-dialog__header')
    if header.locator('strong').inner_text()!='图标' or dialog.locator('[data-asset-dialog-action="close"]').count()<1:
        raise RuntimeError('marker custom title/close missing')
    container_rect=rect(page,dialog.locator('.b3-dialog__container'))
    if container_rect['width']>625 or intersects(marker_rect,container_rect):
        raise RuntimeError(f'marker dialog width/placement invalid: marker={marker_rect}, dialog={container_rect}')
    dialog.locator('.ymz-local-asset-dialog__header [data-asset-dialog-action="close"]').click()

    todo=row.locator('.ymz-outline-accessories__todo')
    todo_box=todo.evaluate("e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,border:getComputedStyle(e).borderWidth,parent:e.parentElement.className})")
    if abs(todo_box['w']-17)>1 or abs(todo_box['h']-17)>1 or 'status--todo' in todo_box['parent']:
        raise RuntimeError(f'outline todo geometry invalid: {todo_box}')

    for kind, needle in [('note','备注预览'),('comments','批注预览'),('todo','待办预览'),('tags','PCIe'),('link','example.com'),('outer-frame','已有外框')]:
        anchor=row.locator(f'[data-outline-content="{kind}"]')
        anchor.hover()
        page.wait_for_selector(f'.ymz-node-hover-preview[data-type="{kind}"]:not([hidden])')
        text=page.locator('.ymz-node-hover-preview').inner_text()
        if needle not in text: raise RuntimeError(f'{kind} hover preview missing {needle}: {text}')
        page.mouse.move(1200,700)
        page.wait_for_timeout(220)

    clip=page.locator('.ymz-outline-row[data-outline-uid="clip-node"] [data-outline-image-action]')
    clip.dblclick()
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])')
    page.locator('.ymz-image-lightbox [data-action="close"]').click()
    clip.click()
    page.wait_for_timeout(280)
    page.wait_for_selector('.ymz-clipart-dialog')
    clip_dialog=page.locator('.b3-dialog:has(.ymz-clipart-dialog)')
    clip_rect=rect(page,clip_dialog.locator('.b3-dialog__container'))
    if clip_rect['width']>685 or intersects(rect(page,clip),clip_rect):
        raise RuntimeError(f'clipart dialog width/placement invalid: {clip_rect}')
    clip_dialog.locator('.ymz-local-asset-dialog__header [data-asset-dialog-action="close"]').click()

    # Keep outline text dirty, then update icon data and verify accessory-only synchronization.
    editor=row.locator('[data-outline-editor]')
    editor.click()
    page.keyboard.press('End')
    page.keyboard.type('X')
    marker.click()
    page.wait_for_selector('.ymz-marker-dialog')
    picker=page.locator('.b3-dialog:has(.ymz-marker-dialog)')
    selected_before=picker.locator('.ymz-marker-option.is-selected').count()
    picker.locator('.ymz-marker-option:not(.is-selected)').first.click()
    page.wait_for_timeout(600)
    selected_after=picker.locator('.ymz-marker-option.is-selected').count()
    picker.locator('.ymz-local-asset-dialog__header [data-asset-dialog-action="close"]').click()
    page.wait_for_timeout(600)
    dirty_state={'icons':row.locator('[data-outline-icon-action]').count(),'text':editor.inner_text(),'selectedBefore':selected_before,'selectedAfter':selected_after}
    if dirty_state['icons']!=2 or not dirty_state['text'].endswith('X'):
        raise RuntimeError(f'outline accessory synchronization lost icons or editable text: {dirty_state}')

    page.locator('[data-action="view-map"]').click()
    page.wait_for_timeout(700)
    todo_node=page.locator('.smm-node').filter(has_text='图标节点').first
    checkbox=todo_node.locator('.ymz-node-todo-checkbox')
    text_host=todo_node.locator('.smm-richtext-node-wrap')
    if checkbox.count()!=1 or text_host.count()!=1:
        raise RuntimeError('map todo prefix or text missing')
    cb=rect(page,checkbox); tx=rect(page,text_host)
    if abs((cb['top']+cb['height']/2)-(tx['top']+tx['height']/2))>3:
        raise RuntimeError(f'map todo vertical alignment invalid: checkbox={cb}, text={tx}')

    # Canvas clipart opens the picker directly and never shows the ordinary image selection frame.
    map_clip_node=page.locator('.smm-node').filter(has_text='剪贴图节点').first
    map_clip_img=map_clip_node.locator('image').first
    if map_clip_img.count()!=1:
        raise RuntimeError('canvas clipart image missing')
    map_clip_rect=rect(page,map_clip_img)
    map_clip_img.click()
    page.wait_for_timeout(260)
    page.wait_for_selector('.ymz-clipart-dialog')
    map_clip_picker=page.locator('.b3-dialog:has(.ymz-clipart-dialog)')
    map_clip_picker_rect=rect(page,map_clip_picker.locator('.b3-dialog__container'))
    if page.locator('.ymz-node-image-frame[data-mode="selected"]:visible').count()!=0:
        raise RuntimeError('canvas clipart still opened the ordinary image selection toolbar')
    if intersects(map_clip_rect,map_clip_picker_rect):
        raise RuntimeError(f'canvas clipart picker obscured its source image: image={map_clip_rect}, dialog={map_clip_picker_rect}')
    map_clip_picker.locator('.ymz-local-asset-dialog__header [data-asset-dialog-action="close"]').click()
    map_clip_img.dblclick()
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])')
    page.locator('.ymz-image-lightbox [data-action="close"]').click()

    # Closing a changed note through the backdrop commits it; explicit Cancel remains the discard path.
    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="icon-node"]')
    note_action=page.locator('.ymz-outline-row[data-outline-uid="icon-node"] [data-outline-content="note"]')
    note_action.click()
    page.wait_for_selector('.ymz-note-dialog')
    note_editor=page.locator('.ymz-note-dialog [data-field="note"]')
    note_editor.evaluate("(e)=>{e.innerHTML='<p>遮罩自动保存</p>';e.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertText',data:'遮罩自动保存'}))}")
    page.locator('.b3-dialog:has(.ymz-note-dialog) .b3-dialog__scrim').click(position={'x':5,'y':5})
    page.wait_for_selector('.ymz-note-dialog',state='detached')
    note_action=page.locator('.ymz-outline-row[data-outline-uid="icon-node"] [data-outline-content="note"]')
    note_action.hover()
    page.wait_for_selector('.ymz-node-hover-preview[data-type="note"]:not([hidden])')
    if '遮罩自动保存' not in page.locator('.ymz-node-hover-preview').inner_text():
        raise RuntimeError('note backdrop autosave did not update the shared outline projection')

    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'markerDialog':container_rect,'clipartDialog':clip_rect,'hoverTypes':6,'dirtyIcons':2,'todoCenterDelta':abs((cb['top']+cb['height']/2)-(tx['top']+tx['height']/2)),'mapClipartDirect':True,'noteBackdropAutosave':True})
    browser.close()
