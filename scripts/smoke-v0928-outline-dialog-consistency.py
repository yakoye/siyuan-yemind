"""Browser regression for v0.9.28 outline marker geometry, semantic status icons, preview arbitration, clipart controls and unified dialog chrome."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';row.disabled=!!item.disabled;const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(label);row.addEventListener('click',()=>{if(!row.disabled)item.click?.()});return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){this.element.append(document.createElement('hr'))}open(){document.body.append(this.element)}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';const scrim=document.createElement('div');scrim.className='b3-dialog__scrim';const container=document.createElement('div');container.className='b3-dialog__container';if(options.width)container.style.width=options.width;if(options.height)container.style.height=options.height;if(!options.hideCloseIcon){const header=document.createElement('div');header.className='b3-dialog__header';const title=document.createElement('span');title.textContent=options.title||'';const close=document.createElement('button');close.className='b3-dialog__close';close.textContent='×';close.addEventListener('click',()=>this.destroy());header.append(title,close);container.append(header)}const body=document.createElement('div');body.innerHTML=options.content||'';while(body.firstChild)container.append(body.firstChild);this.element.append(scrim,container);document.body.append(this.element)}destroy(){this.options?.destroyCallback?.();this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
body{margin:0;background:#fff;color:#202124}.b3-dialog{position:fixed;z-index:110;inset:0}.b3-dialog__scrim{position:absolute;inset:0;background:rgba(0,0,0,.2)}.b3-dialog__container{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;background:#fff;overflow:hidden}.b3-dialog__content{box-sizing:border-box}.b3-dialog__header{display:flex}.b3-dialog__action{display:flex}.b3-button{min-height:28px}
'''

def rect(locator):
    return locator.evaluate("e=>{const r=e.getBoundingClientRect();return {left:r.left,top:r.top,right:r.right,bottom:r.bottom,width:r.width,height:r.height,centerY:r.top+r.height/2}}")

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
      const map=await plugin.repository.create('v0928','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'status-node',text:'状态节点',icon:['yemarkerpriority_priority-03'],yemindNote:{html:'<p>完整备注预览内容</p>',updatedAt:1},yemindComments:[{id:'c1',text:'第一条很长的批注预览内容，用于验证第一次悬停即可完整测量。',createdAt:1,updatedAt:1},{id:'c2',text:'第二条批注内容。',createdAt:2,updatedAt:2}]},children:[]},
        {data:{uid:'image-node',text:'普通图片',image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'普通图片',imageSize:{width:120,height:90,custom:true}},children:[]},
        {data:{uid:'clip-node',text:'剪贴图节点',image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'剪贴图',imageSize:{width:80,height:80,custom:true},yemindClipartId:'technology-011'},children:[]}
      ]};await plugin.repository.update(map.id,{data:map.data});const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});
    }""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.locator('[data-action="view-outline"]').click()
    row=page.locator('.ymz-outline-row[data-outline-uid="status-node"]')
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="status-node"]')

    marker=row.locator('[data-outline-icon-action]')
    style=marker.evaluate("e=>({w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height,size:getComputedStyle(e).backgroundSize,pos:getComputedStyle(e).backgroundPosition,children:e.children.length})")
    if abs(style['w']-18)>1 or abs(style['h']-18)>1 or style['children']!=0 or '244.286' not in style['size']:
        raise RuntimeError(f'compact marker geometry invalid: {style}')

    note=row.locator('[data-outline-content="note"]')
    comments=row.locator('[data-outline-content="comments"]')
    if note.locator('use[href="#iconYeMindNote"]').count()!=1 or comments.locator('use[href="#iconYeMindComment"]').count()!=1:
        raise RuntimeError('semantic outline note/comment icons missing')
    if comments.inner_text().strip():
        raise RuntimeError(f'comment count leaked into line prefix: {comments.inner_text()}')

    comments.hover()
    page.wait_for_selector('.ymz-node-hover-preview[data-type="comments"]:not([hidden])')
    page.wait_for_timeout(80)
    preview=page.locator('.ymz-node-hover-preview')
    preview_text=preview.inner_text()
    preview_box=preview.evaluate("e=>({scrollHeight:e.scrollHeight,clientHeight:e.clientHeight,visibility:getComputedStyle(e).visibility})")
    if '第一条很长' not in preview_text or '第二条批注' not in preview_text or preview_box['visibility']=='hidden':
        raise RuntimeError(f'first hover preview incomplete: {preview_text} {preview_box}')

    image=page.locator('.ymz-outline-row[data-outline-uid="image-node"] [data-outline-image-action]')
    image.dblclick(delay=120)
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])')
    if page.locator('.b3-dialog:has(.ymz-image-preview)').count()!=0:
        raise RuntimeError('outline image double-click opened image edit dialog before lightbox')
    page.locator('.ymz-image-lightbox [data-action="close"]').click()
    image.click()
    page.wait_for_timeout(430)
    page.wait_for_selector('.b3-dialog:has(.ymz-image-preview)')
    image_dialog=page.locator('.b3-dialog:has(.ymz-image-preview)')
    if 'ymz-dialog-shell' not in image_dialog.get_attribute('class').split():
        raise RuntimeError('image dialog missing unified dialog class')
    header=image_dialog.locator('.b3-dialog__header')
    action=image_dialog.locator('.b3-dialog__action')
    chrome=page.evaluate("""([h,a])=>{const hs=getComputedStyle(h),as=getComputedStyle(a);const hr=h.getBoundingClientRect();const close=h.querySelector('.b3-dialog__close')?.getBoundingClientRect();return{height:hr.height,weight:hs.fontWeight,justify:as.justifyContent,delta:close?Math.abs((close.top+close.height/2)-(hr.top+hr.height/2)):999}}""",[header.element_handle(),action.element_handle()])
    if chrome['height']<45 or int(chrome['weight'])<700 or chrome['justify']!='flex-end' or chrome['delta']>1:
        raise RuntimeError(f'unified dialog chrome invalid: {chrome}')
    image_dialog.locator('.b3-dialog__close').click()

    page.locator('[data-action="view-map"]').click()
    page.wait_for_timeout(500)
    clip=page.locator('.smm-node').filter(has_text='剪贴图节点').first.locator('image').first
    clip.click()
    page.wait_for_selector('.ymz-node-image-frame[data-mode="selected"][data-asset-kind="clipart"]:visible')
    frame=page.locator('.ymz-node-image-frame[data-mode="selected"][data-asset-kind="clipart"]:visible')
    if frame.locator('.ymz-node-image-resize-handle').count()!=8 or frame.locator('.ymz-node-image-delete').count()!=1:
        raise RuntimeError('clipart resize/delete controls missing')
    if frame.locator('.ymz-node-image-toolbar').is_visible():
        raise RuntimeError('clipart ordinary text toolbar should stay hidden')
    page.wait_for_selector('.ymz-clipart-dialog',timeout=30000)
    picker=page.locator('.b3-dialog:has(.ymz-clipart-dialog)')
    placement=picker.locator('.b3-dialog__container').get_attribute('data-asset-dialog-placement')
    if placement not in {'right','left','bottom','top','right-bottom','right-top','left-bottom','left-top'}:
        raise RuntimeError(f'invalid anchored placement: {placement}')

    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'marker':style,'preview':preview_box,'dialogChrome':chrome,'clipartHandles':8,'placement':placement})
    browser.close()
