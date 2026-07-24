"""v0.9.20 unified icons, flat asset dialogs, checkpoints and outline alignment smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  window.__dialogs=[];
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{constructor(){this.element=document.createElement('div');this.items=[]}addItem(i){this.items.push(i);return document.createElement('div')}addSeparator(){this.items.push({separator:true});return document.createElement('div')}open(){window.__lastMenu=this}close(){}}
  class Dialog{
    constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this);window.__lastDialog=this}
    destroy(){if(!this.element.isConnected)return;this.element.remove();this.options.destroyCallback?.();window.__dialogs=window.__dialogs.filter(x=>x!==this);window.__lastDialog=window.__dialogs.at(-1)||null}
  }
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1440,'height':900})
    page_errors=[]; console_errors=[]
    page.on('pageerror',lambda exc: page_errors.append(getattr(exc,'stack',None) or str(exc)))
    page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1380px;height:850px"></div></body></html>')
    page.add_style_tag(content=stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0919 UI','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'a',text:'节点A'},children:[{data:{uid:'b',text:'节点B'},children:[]}]}]};
      await plugin.repository.update(map.id,{data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1360px;height:820px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg',timeout=30000)
    page.wait_for_timeout(600)

    toolbar=page.evaluate("""()=>({
      search:document.querySelector('[data-action=open-search]')?.innerHTML||'',
      fullscreen:document.querySelector('[data-action=fullscreen]')?.innerHTML||'',
      undo:document.querySelector('[data-action=undo]')?.innerHTML||'',
      redo:document.querySelector('[data-action=redo]')?.innerHTML||'',
      mode:document.querySelector('[data-role=canvas-mode-icon]')?.innerHTML||''
    })""")
    if 'ymz-icon-search' not in toolbar['search'] or 'ymz-icon-fullscreen' not in toolbar['fullscreen']:
        raise RuntimeError(f'unified toolbar icons missing: {toolbar}')
    if any('#000' in value.lower() or '#1e2024' in value.lower() for value in toolbar.values()):
        raise RuntimeError(f'fixed black fill leaked into toolbar artwork: {toolbar}')
    if 'ymz-icon-canvas-pan' not in toolbar['mode']:
        raise RuntimeError('select-first mode must advertise hand/pan action')
    page.locator('[data-action="toggle-selection-mode"]').click(); page.wait_for_timeout(120)
    if 'ymz-icon-canvas-select' not in page.locator('[data-role="canvas-mode-icon"]').inner_html():
        raise RuntimeError('pan-first mode must advertise select action')

    # Node menu names/order and supplied artwork.
    page.locator('g.smm-node').filter(has_text='节点A').first.click(button='right',force=True)
    menu=page.evaluate("""()=>{
      const items=window.__lastMenu.items; const add=items.find(x=>x.label==='添加');
      return {labels:items.map(x=>x.label||''),icons:items.map(x=>x.iconHTML||''),add:(add?.submenu||[]).map(x=>({label:x.label,icon:x.iconHTML||''}))};
    }""")
    expected=['插入上级节点','插入同级节点','插入下级节点']
    positions=[menu['labels'].index(x) for x in expected]
    if not (positions[0]>=0 and positions[0]<positions[1]<positions[2]):
        raise RuntimeError(f'insert order wrong: {menu}')
    if not any('ymz-icon-relation' in icon for icon in menu['icons']):
        raise RuntimeError('relationship unified icon missing')
    if not any(x['label']=='剪贴图' and 'ymz-icon-clipart' in x['icon'] for x in menu['add']):
        raise RuntimeError('clipart supplied icon missing')
    if not any(x['label']=='外框' and 'ymz-icon-outer-frame' in x['icon'] for x in menu['add']):
        raise RuntimeError('outer-frame supplied icon missing')

    # Open marker dialog from Add > 图标.
    opened=page.evaluate("""()=>{const add=window.__lastMenu.items.find(x=>x.label==='添加');const item=add.submenu.find(x=>x.label==='图标');item.click();return true;}""")
    page.wait_for_function("()=>document.querySelectorAll('.ymz-marker-option').length===126")
    marker=page.evaluate("""()=>{const option=document.querySelector('.ymz-marker-option');const grid=document.querySelector('.ymz-marker-grid');return{tabs:document.querySelectorAll('.ymz-marker-dialog .ymz-asset-tab').length,sections:document.querySelectorAll('.ymz-marker-section').length,options:document.querySelectorAll('.ymz-marker-option').length,width:window.__lastDialog.options.width,height:window.__lastDialog.options.height,nativeClose:window.__lastDialog.options.hideCloseIcon===false,footer:getComputedStyle(document.querySelector('.ymz-marker-dialog .ymz-local-asset-dialog__footer')).justifyContent,optionBackground:getComputedStyle(option).backgroundColor,gridBackground:getComputedStyle(grid).backgroundColor}}""")
    if marker['tabs']!=9 or marker['sections']!=0 or marker['options']!=126 or marker['width']!='640px' or marker['height']!='620px' or not marker['nativeClose'] or marker['footer']!='flex-end':
        raise RuntimeError(f'marker dialog contract failed: {marker}')
    if marker['optionBackground']!='rgba(0, 0, 0, 0)' or marker['gridBackground']!='rgba(0, 0, 0, 0)':
        raise RuntimeError(f'marker surface is not flat/transparent: {marker}')
    page.locator('.ymz-marker-dialog .ymz-asset-tab').filter(has_text='进度').click()
    page.wait_for_timeout(350)
    marker_nav=page.evaluate("""()=>({options:document.querySelectorAll('.ymz-marker-option').length,scrollTop:document.querySelector('[data-role=marker-scroll]').scrollTop,active:document.querySelector('.ymz-marker-dialog .ymz-asset-tab.is-active')?.textContent})""")
    if marker_nav['options']!=126 or marker_nav['active']!='进度':
        raise RuntimeError(f'marker category navigation must scroll without filtering: {marker_nav}')
    page.evaluate("()=>window.__lastDialog.element.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))")
    page.wait_for_function("()=>!document.querySelector('.ymz-marker-dialog')")

    # Re-open node menu and clipart dialog, complete catalog and outside close.
    page.locator('g.smm-node').filter(has_text='节点A').first.click(button='right',force=True)
    page.evaluate("""()=>{const add=window.__lastMenu.items.find(x=>x.label==='添加');add.submenu.find(x=>x.label==='剪贴图').click()}""")
    page.wait_for_function("()=>document.querySelectorAll('.ymz-clipart-option').length===764")
    clipart=page.evaluate("""()=>{const grid=document.querySelector('.ymz-clipart-grid');const option=document.querySelector('.ymz-clipart-option');return{items:document.querySelectorAll('.ymz-clipart-option').length,more:!!document.querySelector('[data-action=clipart-more]'),width:window.__lastDialog.options.width,height:window.__lastDialog.options.height,nativeClose:window.__lastDialog.options.hideCloseIcon===false,gridBackground:getComputedStyle(grid).backgroundColor,optionBackground:getComputedStyle(option).backgroundColor}}""")
    if clipart['items']!=764 or clipart['more'] or clipart['width']!='760px' or clipart['height']!='620px' or not clipart['nativeClose']:
        raise RuntimeError(f'clipart dialog contract failed: {clipart}')
    if clipart['gridBackground']!='rgba(0, 0, 0, 0)':
        raise RuntimeError(f'clipart grid surface is not transparent: {clipart}')
    if '.ymz-clipart-option{' not in stylesheet or 'background:var(--b3-theme-background)!important' not in stylesheet:
        raise RuntimeError('clipart cards are not assigned the theme background')
    page.evaluate("()=>window.__lastDialog.element.dispatchEvent(new MouseEvent('mousedown',{bubbles:true}))")
    page.wait_for_function("()=>!document.querySelector('.ymz-clipart-dialog')")

    # Checkpoint manager opens directly and creation completes in the manager flow.
    page.locator('[data-action="checkpoints"]').click()
    page.wait_for_selector('.ymz-checkpoint-dialog')
    if page.locator('[data-checkpoint-dialog-action="create"]').count()!=1:
        raise RuntimeError('checkpoint manager has no create action')
    page.locator('[data-checkpoint-dialog-action="create"]').click()
    page.wait_for_selector('.b3-dialog input[placeholder="检查点名称"]')
    prompt=page.locator('.b3-dialog').filter(has=page.locator('input[placeholder="检查点名称"]')).last
    prompt.locator('input').fill('界面回归检查点')
    prompt.locator('.b3-button--text').click()
    page.wait_for_function("()=>document.querySelector('.ymz-checkpoint-list')?.textContent.includes('界面回归检查点')",timeout=8000)
    checkpoint_count=page.evaluate("()=>window.__smoke.plugin.checkpointRepository.list(window.__smoke.map.id).length")
    if checkpoint_count!=1:
        raise RuntimeError(f'checkpoint was not persisted: {checkpoint_count}')
    page.locator('[data-checkpoint-dialog-action="close"]').click()

    # Outline insertion indicator center equals target depth branch-marker center.
    page.locator('[data-action="view-outline"]').click(); page.wait_for_timeout(250)
    outline=page.evaluate("""()=>{
      const row=document.querySelector('[data-outline-uid="a"]');
      const indicator=row.querySelector('.ymz-outline-row__drop-indicator');
      row.style.setProperty('--ymz-outline-drop-depth',row.dataset.outlineDepth||'1');
      row.classList.add('is-drop-after');
      const branch=row.querySelector('.ymz-outline-row__branch').getBoundingClientRect();
      const line=indicator.getBoundingClientRect();
      return {branchCenter:branch.left+branch.width/2,lineLeft:line.left,delta:Math.abs(branch.left+branch.width/2-line.left)};
    }""")
    if outline['delta']>0.75:
        raise RuntimeError(f'outline insertion marker is not aligned: {outline}')

    if page_errors: raise RuntimeError('Page errors:\n'+'\n'.join(page_errors))
    if console_errors: raise RuntimeError('Console errors:\n'+'\n'.join(console_errors))
    print({'toolbarIcons':True,'menu':expected,'marker':marker,'markerNavigation':marker_nav,'clipart':clipart,'checkpoints':checkpoint_count,'outline':outline,'pageErrors':0,'consoleErrors':0})
    browser.close()
