"""Browser regression for v0.9.30 branch controls, pinned toolbars, context menus, and resource action popovers."""
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
  class Menu{constructor(){document.querySelectorAll('.b3-menu:not(.b3-menu--submenu)').forEach(e=>e.remove());this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){const s=document.createElement('div');s.className='b3-menu__separator';this.element.append(s)}open(){document.body.append(this.element)}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';this.element.dataset.dialogTitle=options.title||'';const scrim=document.createElement('div');scrim.className='b3-dialog__scrim';const container=document.createElement('div');container.className='b3-dialog__container';if(options.width)container.style.width=options.width;if(options.height)container.style.height=options.height;if(!options.hideCloseIcon){const header=document.createElement('div');header.className='b3-dialog__header';header.textContent=options.title||'';container.append(header)}const body=document.createElement('div');body.innerHTML=options.content||'';while(body.firstChild)container.append(body.firstChild);this.element.append(scrim,container);document.body.append(this.element)}destroy(){this.options?.destroyCallback?.();this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-theme-primary-lightest:#dcefe9;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
body{margin:0;background:#fff;color:#202124}.b3-dialog{position:fixed;z-index:110;inset:0}.b3-dialog__scrim{position:absolute;inset:0;background:rgba(0,0,0,.2)}.b3-dialog__container{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:flex;flex-direction:column;background:#fff;overflow:hidden}.b3-dialog__content{box-sizing:border-box}.b3-button{min-height:28px}.b3-menu{position:fixed;z-index:1300;left:20px;top:70px;display:flex;flex-direction:column;width:310px;padding:6px;background:#fff}.b3-menu__item{display:flex;align-items:center;min-height:30px;border:0;background:transparent}.b3-menu__label{flex:1;text-align:left}
'''

def menu_labels(page):
    return page.locator('.b3-menu:not(.b3-menu--submenu) .b3-menu__label').all_inner_texts()

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1280, 'height': 760})
    errors=[]
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1260px;height:740px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();window.__plugin=plugin;plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0930','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[
        {data:{uid:'source',text:'Source',expand:true,icon:['yemarkerpriority_priority-03']},children:[{data:{uid:'child',text:'Child',expand:false},children:[{data:{uid:'grand',text:'Grand'},children:[]}]}]},
        {data:{uid:'clip',text:'Clip',image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'Clipart',imageSize:{width:80,height:80,custom:true},yemindClipartId:'technology-011'},children:[]}
      ]};
      await plugin.repository.update(map.id,{data:map.data});window.__mapId=map.id;
      const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);
      window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});
    }""")
    page.wait_for_selector('[data-action="view-outline"]', timeout=30000)
    page.wait_for_timeout(800)
    editor=page.locator('.ymz-editor:not(.ymz-measurement-host)')
    default_state=editor.evaluate("e=>({pinned:e.dataset.toolbarsPinned,top:e.dataset.topbarVisible,bottom:e.dataset.statusbarVisible,left:e.dataset.leftbarVisible})")
    if default_state != {'pinned':'true','top':'true','bottom':'true','left':'true'}:
        raise RuntimeError(f'default toolbar state invalid: {default_state}')
    zen=editor.locator('[data-action="zen"]')
    pin=editor.locator('[data-action="toggle-toolbar-pin"]')
    if zen.evaluate("e=>e.nextElementSibling?.dataset.action")!='toggle-toolbar-pin':
        raise RuntimeError('pin is not immediately after zen')
    if pin.get_attribute('aria-pressed')!='false' or pin.locator('.ymz-icon-pin--fixed').count()!=1:
        raise RuntimeError('fixed pin presentation invalid')
    readonly=editor.locator('[data-action="readonly"]')
    if readonly.locator('.ymz-icon-lock--open').count()!=1: raise RuntimeError('unlocked icon missing')
    readonly.click(); page.wait_for_timeout(60)
    if readonly.locator('.ymz-icon-lock--closed').count()!=1: raise RuntimeError('locked icon missing')
    readonly.click()

    # Auto-hide controls all three bars.
    pin.click(); page.mouse.move(640,360); page.wait_for_timeout(900)
    auto_state=editor.evaluate("e=>({pinned:e.dataset.toolbarsPinned,top:e.dataset.topbarVisible,bottom:e.dataset.statusbarVisible,left:e.dataset.leftbarVisible})")
    if auto_state != {'pinned':'false','top':'false','bottom':'false','left':'false'}:
        raise RuntimeError(f'auto-hide state invalid: {auto_state}')
    page.mouse.move(2,360); page.wait_for_timeout(80)
    if editor.get_attribute('data-leftbar-visible')!='true': raise RuntimeError('left hot zone did not reveal leftbar')
    page.mouse.move(640,735); page.wait_for_timeout(80)
    pin.click(force=True); page.wait_for_timeout(80)

    # Layout-aware quick controls use the outgoing connector direction.
    expected={'logicalStructure':'right','logicalStructureLeft':'left','organizationStructure':'bottom','catalogOrganization':'bottom','timeline':'bottom','verticalTimeline':'right','fishbone':'top','rightFishbone':'top'}
    sides={}
    for layout, wanted in expected.items():
        page.evaluate("layout=>{const s=document.querySelector('.ymz-editor:not(.ymz-measurement-host) [data-action=layout]');s.value=layout;s.dispatchEvent(new Event('change',{bubbles:true}))}", layout)
        page.wait_for_timeout(260)
        source=editor.locator('.smm-node').filter(has_text='Source').first
        source.click(); page.wait_for_timeout(80)
        quick=editor.locator('.ymz-node-quick-actions[data-node-uid="source"]')
        quick.wait_for()
        actual=quick.get_attribute('data-quick-side'); sides[layout]=actual
        # Some specialized layouts assign node direction dynamically. Verify against renderer direction when it differs from preset expectation.
        if layout in ('timeline','verticalTimeline','fishbone','rightFishbone'):
            renderer=page.evaluate("()=>{const e=document.querySelector('.ymz-editor:not(.ymz-measurement-host)');const q=e.querySelector('.ymz-node-quick-actions[data-node-uid=source]');return q?.dataset.quickSide}")
            if actual!=renderer: raise RuntimeError('quick side dataset unstable')
        elif actual!=wanted:
            raise RuntimeError(f'quick side mismatch {layout}: {actual} != {wanted}')

    # Node right-click menu has text import before 添加 and full subtree controls.
    page.evaluate("()=>{const s=document.querySelector('.ymz-editor:not(.ymz-measurement-host) [data-action=layout]');s.value='logicalStructure';s.dispatchEvent(new Event('change',{bubbles:true}))}")
    page.wait_for_timeout(250)
    source=editor.locator('.smm-node').filter(has_text='Source').first
    source.click(button='right', position={'x':20,'y':20}); page.wait_for_timeout(80)
    labels=menu_labels(page)
    if '文本转导图…' not in labels or '添加' not in labels or labels.index('文本转导图…')>labels.index('添加'):
        raise RuntimeError(f'text-to-map menu order invalid: {labels}')
    for label in ('展开全部下级节点','折叠全部下级节点'):
        if label not in labels: raise RuntimeError(f'missing node menu {label}: {labels}')
    page.locator('.b3-menu:not(.b3-menu--submenu) .b3-menu__item').filter(has_text='文本转导图…').click()
    page.wait_for_selector('.ymz-text-map-dialog')
    page.locator('.b3-dialog').evaluate("e=>e.remove()")

    # Canvas menu exposes full-map expand/collapse as separate actions.
    page.locator('.b3-menu').evaluate_all("els=>els.forEach(e=>e.remove())")
    editor.locator('[data-role="canvas"]').click(button='right', position={'x':1100,'y':680})
    page.wait_for_timeout(80)
    canvas_labels=menu_labels(page)
    if '展开全部节点' not in canvas_labels or '折叠全部节点' not in canvas_labels:
        raise RuntimeError(f'full-map menu actions missing: {canvas_labels}')

    # Outline marker and clipart clicks show replace/delete first.
    page.locator('.b3-menu').evaluate_all("els=>els.forEach(e=>e.remove())")
    editor.locator('[data-action="view-outline"]').click(); page.wait_for_timeout(100)
    marker=editor.locator('.ymz-outline-row[data-outline-uid="source"] [data-outline-icon-action]')
    marker.click(); page.wait_for_selector('.ymz-resource-action-popover:not([hidden])')
    pop=editor.locator('.ymz-resource-action-popover:not([hidden])')
    if pop.locator('[data-resource-action="replace"]').count()!=1 or pop.locator('[data-resource-action="delete"]').count()!=1:
        raise RuntimeError('marker resource popover actions missing')
    pop.locator('[data-resource-action="replace"]').click(); page.wait_for_selector('.ymz-marker-dialog')
    page.locator('.ymz-marker-dialog [data-asset-dialog-action="close"]').first.click()
    clip=editor.locator('.ymz-outline-row[data-outline-uid="clip"] [data-outline-image-action]')
    clip.click(); page.wait_for_timeout(420); page.wait_for_selector('.ymz-resource-action-popover:not([hidden])')
    editor.locator('.ymz-resource-action-popover [data-resource-action="delete"]').click(); page.wait_for_timeout(800)
    clip_data=page.evaluate("()=>window.__plugin.repository.get(window.__mapId).data.children.find(x=>x.data.uid==='clip').data")
    if clip_data.get('yemindClipartId') not in (None,'') or clip_data.get('image') not in (None,''):
        raise RuntimeError(f'clipart delete did not clear shared data: {clip_data}')

    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'default':default_state,'auto':auto_state,'sides':sides,'nodeMenu':labels[:8],'canvasMenu':canvas_labels[-6:],'resourcePopover':True})
    browser.close()
