"""Browser regression for v0.9.29 floating toolbars, relation hit target, view cleanup, quick actions, zoom, title and shared outline preview."""
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
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-theme-primary-lightest:#dcefe9;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
body{margin:0;background:#fff;color:#202124}.b3-dialog{position:fixed;z-index:110;inset:0}.b3-dialog__scrim{position:absolute;inset:0;background:rgba(0,0,0,.2)}.b3-dialog__container{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;background:#fff;overflow:hidden}.b3-dialog__content{box-sizing:border-box}.b3-dialog__header{display:flex}.b3-dialog__action{display:flex}.b3-button{min-height:28px}
'''

def state_of(data, uid):
    if data.get('data',{}).get('uid') == uid:
        return data
    for child in data.get('children',[]):
        found=state_of(child,uid)
        if found:return found
    return None

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
      const map=await plugin.repository.create('v0929','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'source',text:'Source',expand:true,associativeLineTargets:['target'],associativeLineText:{target:'关联'}},children:[{data:{uid:'child',text:'Child',expand:true},children:[{data:{uid:'grand',text:'Grand'},children:[]}]}]},
        {data:{uid:'target',text:'Target'},children:[]},
        {data:{uid:'image',text:'Image',image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'Preview',imageSize:{width:120,height:90,custom:true}},children:[]}
      ]};
      await plugin.repository.update(map.id,{data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);
      window.__tabTitle='';
      window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(v){window.__tabTitle=v},close(){}}});
      window.__mapId=map.id;
    }""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.wait_for_timeout(900)
    editor=page.locator('.ymz-editor:not(.ymz-measurement-host)')
    hidden=editor.evaluate("e=>({top:e.dataset.topbarVisible,bottom:e.dataset.statusbarVisible,left:e.dataset.leftbarVisible,pinned:e.dataset.toolbarsPinned})")
    if hidden != {'top':'true','bottom':'true','left':'true','pinned':'true'}:
        raise RuntimeError(f'pinned defaults invalid: {hidden}')

    # Toggle automatic hiding, verify all three edges, then pin them again.
    editor.locator('[data-action="toggle-toolbar-pin"]').click()
    page.mouse.move(640,360)
    page.wait_for_timeout(900)
    auto_hidden=editor.evaluate("e=>({top:e.dataset.topbarVisible,bottom:e.dataset.statusbarVisible,left:e.dataset.leftbarVisible,pinned:e.dataset.toolbarsPinned})")
    if auto_hidden != {'top':'false','bottom':'false','left':'false','pinned':'false'}:
        raise RuntimeError(f'three-edge auto-hide invalid: {auto_hidden}')
    page.mouse.move(640,735)
    page.wait_for_timeout(80)
    if editor.get_attribute('data-statusbar-visible')!='true': raise RuntimeError('bottom hot zone did not reveal statusbar')
    editor.locator('[data-action="toggle-toolbar-pin"]').click(force=True)
    page.wait_for_timeout(80)
    if editor.get_attribute('data-toolbars-pinned')!='true': raise RuntimeError('toolbar pin did not persist in editor state')

    # Direct zoom entry.
    zoom=editor.locator('[data-role="zoom"]')
    zoom.fill('125%')
    zoom.press('Enter')
    page.wait_for_timeout(100)
    if zoom.input_value()!='125%': raise RuntimeError(f'editable zoom failed: {zoom.input_value()}')
    zoom_applied=zoom.input_value()

    # Inline title rename and tab propagation.
    editor.locator('[data-role="title"]').click()
    title_input=editor.locator('[data-role="title-input"]')
    title_input.fill('重新命名')
    title_input.press('Enter')
    page.wait_for_timeout(150)
    title_state=page.evaluate("""()=>({repo:window.__plugin.repository.get(window.__mapId)?.title,tab:window.__tabTitle,label:document.querySelector('[data-role=title]')?.textContent})""")
    if title_state != {'repo':'重新命名','tab':'重新命名','label':'重新命名'}:
        raise RuntimeError(f'title rename mismatch: {title_state}')

    # Relation uses a wide transparent hit path but selected style remains normal width.
    relation=editor.locator('[data-yemind-relation-hit="true"]').first
    relation.wait_for()
    relation_style=relation.evaluate("e=>({width:Number(e.getAttribute('stroke-width')||getComputedStyle(e).strokeWidth.replace('px','')),pointer:e.getAttribute('pointer-events'),fill:e.getAttribute('fill')})")
    if relation_style['width'] < 10 or relation_style['pointer']!='stroke':
        raise RuntimeError(f'relation hit target invalid: {relation_style}')
    relation.dispatch_event('click')
    page.wait_for_timeout(50)
    active_width=relation.evaluate("e=>Number(e.getAttribute('stroke-width')||getComputedStyle(e).strokeWidth.replace('px',''))")
    if active_width > 5: raise RuntimeError(f'active relation visual became too thick: {active_width}')

    # Quick action anchor follows the rendered child branch in every supported layout.
    source=editor.locator('.smm-node').filter(has_text='Source').first
    layout_sides={}
    for layout in ['logicalStructure','logicalStructureLeft','mindMap','organizationStructure','catalogOrganization']:
        page.evaluate("layout=>{const select=document.querySelector('.ymz-editor:not(.ymz-measurement-host) [data-action=layout]');select.value=layout;select.dispatchEvent(new Event('change',{bubbles:true}))}",layout)
        page.wait_for_timeout(240)
        source=editor.locator('.smm-node').filter(has_text='Source').first
        source.click()
        page.wait_for_timeout(80)
        quick_probe=editor.locator('.ymz-node-quick-actions[data-node-uid="source"]')
        quick_probe.wait_for()
        geometry=page.evaluate("()=>{const root=document.querySelector('.ymz-editor:not(.ymz-measurement-host)');const q=root.querySelector('.ymz-node-quick-actions[data-node-uid=source]');const nodes=[...root.querySelectorAll('.smm-node')];const source=nodes.find(n=>n.textContent.includes('Source'));const child=nodes.find(n=>n.textContent.includes('Child'));const a=source.getBoundingClientRect(),b=child.getBoundingClientRect();const dx=b.left+b.width/2-(a.left+a.width/2),dy=b.top+b.height/2-(a.top+a.height/2);const expected=Math.abs(dx)>=Math.abs(dy)?(dx<0?'left':'right'):(dy<0?'top':'bottom');return{actual:q.dataset.quickSide,expected}}")
        layout_sides[layout]=geometry
        if geometry['actual']!=geometry['expected']:
            raise RuntimeError(f'quick action branch side mismatch for {layout}: {geometry}')
    page.evaluate("()=>{const select=document.querySelector('.ymz-editor:not(.ymz-measurement-host) [data-action=layout]');select.value='logicalStructure';select.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.wait_for_timeout(240)
    source=editor.locator('.smm-node').filter(has_text='Source').first
    source.click()
    page.wait_for_timeout(100)
    quick=editor.locator('.ymz-node-quick-actions[data-node-uid="source"]')
    quick.wait_for()
    collapse=quick.locator('[data-node-quick-action="collapse"]')
    if collapse.get_attribute('title')!='折叠 1 个下级节点': raise RuntimeError(f'direct-child label invalid: {collapse.get_attribute("title")}')
    collapse.click()
    page.wait_for_timeout(650)
    collapsed=page.evaluate("()=>window.__plugin.repository.get(window.__mapId).data")
    source_data=state_of(collapsed,'source'); child_data=state_of(collapsed,'child')
    if source_data['data'].get('expand') is not False or child_data['data'].get('expand') is not False:
        raise RuntimeError('collapse did not recursively close descendants')
    source=editor.locator('.smm-node').filter(has_text='Source').first
    source.click()
    page.wait_for_timeout(80)
    editor.locator('.ymz-node-quick-actions[data-node-uid="source"] [data-node-quick-action="expand"]').click()
    page.wait_for_timeout(650)
    expanded=page.evaluate("()=>window.__plugin.repository.get(window.__mapId).data")
    source_data=state_of(expanded,'source'); child_data=state_of(expanded,'child')
    if source_data['data'].get('expand') is not True or child_data['data'].get('expand') is not False:
        raise RuntimeError('expand did not open exactly one level')

    # Resource overlay is cleared on view switch, and outline double click uses shared lightbox.
    image_node=editor.locator('.smm-node').filter(has_text='Image').first
    image_node.locator('image').first.click()
    editor.locator('.ymz-node-image-frame[data-mode="selected"]:visible').wait_for()
    editor.locator('[data-action="view-outline"]').click()
    page.wait_for_timeout(120)
    if editor.locator('.ymz-node-image-frame[data-mode="selected"]:visible').count():
        raise RuntimeError('image edit frame survived outline switch')
    outline_image=editor.locator('.ymz-outline-row[data-outline-uid="image"] [data-outline-image-action]')
    outline_image.dblclick(delay=100)
    page.wait_for_selector('.ymz-image-lightbox:not([hidden])')
    if page.locator('.b3-dialog:has(.ymz-image-preview)').count():
        raise RuntimeError('outline image preview opened edit dialog instead of shared lightbox')

    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'pinnedDefault':hidden,'autoHidden':auto_hidden,'zoomApplied':zoom_applied,'title':title_state,'relation':relation_style,'activeWidth':active_width,'layoutSides':layout_sides,'lightbox':True})
    browser.close()
