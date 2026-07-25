"""Browser regression for v0.9.26 import geometry repair, collapse semantics and outline content parity."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__clipboardText='';
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
  async write(){window.__clipboardText='rich'},async writeText(value){window.__clipboardText=String(value)},async readText(){return window.__clipboardText}
}});
window.__siyuanMock=(()=>{
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';row.disabled=!!item.disabled;
    if(item.iconHTML){const icon=document.createElement('span');icon.className='b3-menu__icon';icon.innerHTML=item.iconHTML;row.append(icon)}else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','b3-menu__icon');row.append(svg)}
    const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(label);
    if(item.type==='submenu'){row.dataset.submenu='true';row.addEventListener('mouseenter',()=>{document.querySelectorAll('.b3-menu--submenu').forEach(e=>e.remove());const sub=document.createElement('div');sub.className='b3-menu b3-menu--submenu';(item.submenu||[]).forEach(x=>sub.append(renderItem(x)));document.body.append(sub);window.__lastSubmenu=sub})}
    else row.addEventListener('click',()=>{if(!row.disabled)item.click?.()});return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){const s=document.createElement('div');s.className='b3-menu__separator';this.element.append(s)}open(){document.body.append(this.element);window.__lastMenu=this}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.className='b3-dialog';this.element.dataset.dialogTitle=options.title||'';const container=document.createElement('div');container.className='b3-dialog__container';if(options.width)container.style.width=options.width;if(options.height)container.style.height=options.height;container.innerHTML=options.content||'';this.element.append(container);document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
body{margin:0;background:var(--b3-theme-background);color:var(--b3-theme-on-background)}
.b3-menu{position:fixed;z-index:99;left:20px;top:70px;display:flex;flex-direction:column;width:300px;padding:6px;background:var(--b3-theme-surface);color:var(--b3-theme-on-background)}
.b3-menu--submenu{left:330px;top:150px}.b3-menu__item{display:flex;align-items:center;min-height:30px;border:0;background:transparent;color:inherit}.b3-menu__label{flex:1;text-align:left}
.b3-dialog{position:fixed;z-index:110;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.2)}.b3-dialog__container{display:flex;flex-direction:column;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);background:var(--b3-theme-background);color:var(--b3-theme-on-background);overflow:hidden}.b3-dialog__content{padding:16px;box-sizing:border-box}.b3-dialog__action{display:flex;padding:12px}.fn__space{flex:1}
'''

def hidden_state(page, uid):
    return page.locator(f'.ymz-outline-row[data-outline-uid="{uid}"]').evaluate("e=>({hidden:e.hidden,display:getComputedStyle(e).display,expanded:e.dataset.outlineExpanded})")

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
      const map=await plugin.repository.create('v0926','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{
        data:{uid:'target',text:'内容节点',expand:true,icon:['yemind_star'],image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'示例图片',imageSize:{width:1,height:1,custom:false},yemindTodo:{checked:false,text:'待办'},tag:['PCIe','RAS'],hyperlink:'https://example.com',yemindNote:{html:'<p>备注</p>'},yemindComments:[{id:'c1',text:'批注'}],outerFrame:{groupId:'frame1'}},
        children:[{data:{uid:'child-a',text:'子节点A',expand:true},children:[{data:{uid:'grand-a',text:'孙节点A',expand:true},children:[{data:{uid:'great-a',text:'曾孙节点',expand:true},children:[]}]}]},{data:{uid:'legacy-width',text:'这是一个旧版本导入的超长节点，用于验证宽度修复和保存后稳定性',expand:true,width:280,customTextWidth:280,yemindImportedAutoWidth:true},children:[]}]
      },{data:{uid:'import-target',text:'导入位置',expand:true},children:[]}]};
      await plugin.repository.update(map.id,{data:map.data});window.__mapId=map.id;
      const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);
      window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});
    }""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="target"]')

    # v0.9.25 legacy dual-width data is repaired during editor initialization.
    page.wait_for_timeout(500)
    repaired=page.evaluate("""()=>{const find=(n)=>n.data.uid==='legacy-width'?n:(n.children||[]).map(find).find(Boolean);const n=find(window.__plugin.repository.get(window.__mapId).data);return {width:n.data.width,custom:n.data.customTextWidth,auto:n.data.yemindImportedAutoWidth}}""")
    if repaired['width'] is not None or repaired['custom'] != 280 or repaired['auto'] is not True:
        raise RuntimeError(f'legacy dual-width node was not repaired: {repaired}')

    target=page.locator('.ymz-outline-row[data-outline-uid="target"]')
    accessories=target.locator('.ymz-outline-accessories')
    required=['todo','tags','link','note','comments','outer-frame']
    for kind in required:
        if accessories.locator(f'[data-outline-content="{kind}"]').count()!=1:
            raise RuntimeError(f'outline content status missing: {kind}')
    image=accessories.locator('[data-outline-image-action]')
    if image.count()!=1: raise RuntimeError('outline image action missing')

    # Single click opens the shared image editor after the cancellable delay.
    image.click()
    page.wait_for_timeout(280)
    if page.locator('.b3-dialog[data-dialog-title="图片"]').count()!=1:
        raise RuntimeError('single-click outline image did not open image editor')
    page.locator('.b3-dialog[data-dialog-title="图片"]').evaluate('e=>e.remove()')

    # Double click cancels editing and opens the shared lightbox.
    image.dblclick()
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])')
    if page.locator('.b3-dialog[data-dialog-title="图片"]').count()!=0:
        raise RuntimeError('double-click image also opened editor')
    page.locator('.ymz-image-lightbox [data-action="close"]').click()

    # Complete outline content submenu contract.
    target.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    add=page.locator('.ymz-context-menu--outline > .b3-menu__item').filter(has_text='添加').first
    add.hover()
    page.wait_for_selector('.b3-menu--submenu')
    labels=page.locator('.b3-menu--submenu .b3-menu__label').all_text_contents()
    expected=['删除待办','删除外框','备注','批注','标签','图标','链接','剪贴图','图片','代码块','公式','行内链接']
    if labels != expected: raise RuntimeError(f'outline content submenu mismatch: {labels}')
    page.locator('.ymz-context-menu--outline').evaluate('e=>e.remove()')
    page.locator('.b3-menu--submenu').evaluate('e=>e.remove()')

    # Import while canvas is hidden, then reveal map and verify the deferred measured redraw.
    import_target=page.locator('.ymz-outline-row[data-outline-uid="import-target"]')
    import_target.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    page.locator('.ymz-context-menu--outline').get_by_text('文本转导图…', exact=True).click()
    page.wait_for_selector('.ymz-text-map-dialog')
    long_text='这是一个在纯大纲模式导入后必须保持文字边框和连线对齐的超长节点标题'
    page.locator('[data-field="mode"]').select_option('plain')
    page.locator('[data-field="source"]').fill(long_text)
    page.wait_for_function("document.querySelector('[data-action=apply]')?.disabled===false")
    page.locator('[data-action="apply"]').click()
    page.wait_for_function("text=>[...document.querySelectorAll('.ymz-outline-row__editor')].some(e=>e.textContent.includes(text))", arg=long_text)
    page.locator('[data-action="view-map"]').click()
    page.wait_for_timeout(1400)
    geometry=page.evaluate("""text=>{const nodes=[...document.querySelectorAll('.smm-node')];const node=nodes.find(e=>e.textContent.includes(text));const parent=nodes.find(e=>e.textContent.includes('导入位置'));if(!node||!parent)return null;const shape=node.querySelector('.smm-node-shape');const foreign=node.querySelector('foreignObject');const parentShape=parent.querySelector('.smm-node-shape');const rect=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom}};return{shape:rect(shape),foreign:rect(foreign),parentShape:rect(parentShape),textTransform:foreign.parentElement.parentElement.getAttribute('transform')}}""", long_text)
    if not geometry: raise RuntimeError('imported map node was not rendered')
    shape=geometry['shape']; foreign=geometry['foreign']; parent_shape=geometry['parentShape']
    if foreign['x'] < shape['x']-1 or foreign['right'] > shape['right']+1 or foreign['y'] < shape['y']-1 or foreign['bottom'] > shape['bottom']+1:
        raise RuntimeError(f'imported text escaped node border: {geometry}')
    if shape['x'] < parent_shape['right'] + 12:
        raise RuntimeError(f'imported child did not preserve branch spacing: {geometry}')
    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="target"]')
    page.evaluate("document.querySelectorAll('.ymz-context-menu--outline,.b3-menu--submenu').forEach(e=>e.remove())")

    # Deep collapse, then one-level expand.
    target=page.locator('.ymz-outline-row[data-outline-uid="target"]')
    target.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    page.locator('.ymz-context-menu--outline').last.get_by_text('折叠全部下级节点', exact=True).click()
    page.wait_for_timeout(500)
    child=hidden_state(page,'child-a'); grand=hidden_state(page,'grand-a'); great=hidden_state(page,'great-a')
    if child['display'] != 'none' or grand['display'] != 'none' or great['display'] != 'none':
        raise RuntimeError(f'deep collapse did not hide all descendants: {child} {grand} {great}')
    target.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    page.locator('.ymz-context-menu--outline').last.get_by_text('展开一级下级节点', exact=True).click()
    page.wait_for_timeout(500)
    child=hidden_state(page,'child-a'); grand=hidden_state(page,'grand-a'); great=hidden_state(page,'great-a')
    if child['display'] == 'none' or grand['display'] != 'none' or great['display'] != 'none':
        raise RuntimeError(f'one-level expand semantics failed: {child} {grand} {great}')
    states=page.evaluate("""()=>{const find=(n,u)=>n.data.uid===u?n:(n.children||[]).map(c=>find(c,u)).find(Boolean);const t=window.__plugin.repository.get(window.__mapId).data;return ['target','child-a','grand-a'].map(u=>[u,find(t,u).data.expand])}""")
    if states != [['target', True], ['child-a', False], ['grand-a', False]]:
        raise RuntimeError(f'persisted expand states mismatch: {states}')

    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'repaired':repaired,'contentMenu':labels,'singleClickEdit':True,'doubleClickPreview':True,'importGeometry':geometry,'expandStates':states})
    browser.close()
