from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock = (() => {
  class Plugin {
    constructor(){ this.name='siyuan-yemind'; this.app={}; this.setting={addItem(){}}; this.eventBus={on(){},off(){}}; }
    addIcons(){} addTab(options){window.__tabOptions=options; return ()=>({});} addDock(){return {}} addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b;} addCommand(){} getOpenedTab(){return {}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu {
    constructor(){ this.element=document.createElement('div'); this.items=[]; }
    addItem(item){ this.items.push(item); return document.createElement('div'); }
    addSeparator(){ this.items.push({separator:true}); return document.createElement('div'); }
    open(){ window.__lastMenu=this; } close(){}
  }
  class Dialog {
    constructor(options={}){ this.options=options; this.element=document.createElement('div'); this.element.className='b3-dialog'; this.element.innerHTML=options.content||''; document.body.appendChild(this.element); window.__lastDialog=this; }
    destroy(){ this.element.remove(); if(window.__lastDialog===this) window.__lastDialog=null; }
  }
  class Setting { addItem(){} }
  return {Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected external '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}\n"

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1360,'height':900})
    errors=[]; console_errors=[]
    page.on('pageerror',lambda exc: errors.append(str(exc)))
    page.on('console',lambda msg: console_errors.append(msg.text) if msg.type=='error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1280px;height:820px"></div></body></html>')
    page.add_style_tag(content=stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const Plugin=window.__YeMindExport; const plugin=new Plugin(); plugin.onload(); await plugin.whenReady();
      const map=await plugin.repository.create('Local Assets','logicalStructure');
      map.data.children=[{data:{uid:'asset-node',text:'本地资源节点',expand:true,icon:['yemarkerpriority_priority-05']},children:[]}];
      await plugin.repository.update(map.id,{data:map.data,layoutPresetId:'right-mindmap'});
      const container=document.createElement('div'); container.style.cssText='width:1200px;height:760px'; document.querySelector('#host').appendChild(container);
      const head=document.createElement('button');document.body.appendChild(head);
      const context={element:container,data:{mapId:map.id},tab:{headElement:head,updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context}; window.__tabOptions.init.call(context);
    }""")
    page.wait_for_function("()=>window.__smoke.container.querySelector('[data-role=canvas] svg')",timeout=30000)
    # layout gallery
    page.locator('[data-action="layout-gallery"]').click()
    page.wait_for_function("()=>document.querySelectorAll('.ymz-layout-gallery__item').length===28")
    gallery=page.evaluate("""()=>({count:document.querySelectorAll('.ymz-layout-gallery__item').length,groups:document.querySelectorAll('.ymz-layout-gallery__group').length,urls:[...document.querySelectorAll('.ymz-layout-gallery__item img')].slice(0,2).map(x=>x.getAttribute('src'))})""")
    page.locator('.ymz-layout-gallery__item[title="右向导图"]').click()
    # marker icon click opens same group picker
    page.evaluate("""()=>{const img=document.querySelector('image[href*=\"marker-sprite.png\"]'); img?.dispatchEvent(new MouseEvent('click',{bubbles:true,cancelable:true,clientX:100,clientY:100}));}""")
    page.wait_for_function("()=>document.querySelectorAll('.ymz-marker-option').length===126")
    marker=page.evaluate("""()=>({tabs:document.querySelectorAll('.ymz-marker-dialog .ymz-asset-tab').length,options:document.querySelectorAll('.ymz-marker-option').length,selected:document.querySelectorAll('.ymz-marker-option.is-selected').length,sprite:[...document.querySelectorAll('.ymz-marker-sprite')][0]?.style.backgroundImage||''})""")
    page.locator('.ymz-marker-option').nth(5).click()
    page.locator('.ymz-marker-dialog [data-action="close"]').click()
    # open node context menu then clipart submenu
    page.locator('.smm-node').first.click(button='right',force=True)
    clipart_menu=page.evaluate("""()=>{
      const add=window.__lastMenu?.items?.find(x=>x.label==='添加'); const item=add?.submenu?.find(x=>x.label==='剪贴图'); if(!item) return false; item.click(); return true;
    }""")
    if not clipart_menu: raise RuntimeError('Clipart menu item missing')
    page.wait_for_function("()=>document.querySelectorAll('.ymz-clipart-option').length===764")
    page.locator('[data-role="clipart-search"]').fill('河马')
    page.wait_for_function("()=>document.querySelectorAll('.ymz-clipart-option').length===1")
    clipart=page.evaluate("""()=>({tabs:document.querySelectorAll('.ymz-clipart-dialog .ymz-asset-tab').length,count:document.querySelector('[data-role=clipart-count]')?.textContent,url:document.querySelector('.ymz-clipart-option img')?.getAttribute('src'),label:document.querySelector('.ymz-clipart-option span')?.textContent})""")
    page.locator('.ymz-clipart-option').click()
    page.wait_for_timeout(800)
    persisted=page.evaluate("""()=>{const {plugin,map}=window.__smoke;const saved=plugin.repository.get(map.id);return {layout:saved.layout,layoutPresetId:saved.layoutPresetId,icons:saved.data.children[0].data.icon,clipartId:saved.data.data.yemindClipartId||saved.data.children[0].data.yemindClipartId||'',images:[saved.data.data.image,saved.data.children[0].data.image].filter(Boolean)}}""")
    if errors: raise RuntimeError('Page errors:\n'+'\n'.join(errors))
    if console_errors: raise RuntimeError('Console errors:\n'+'\n'.join(console_errors))
    if gallery['count']!=28 or gallery['groups']!=7: raise RuntimeError(f'gallery failed {gallery}')
    if marker['tabs']!=9 or marker['options']!=126 or 'marker-sprite.png' not in marker['sprite']: raise RuntimeError(f'marker failed {marker}')
    if clipart['label']!='河马' or '001_河马.svg' not in clipart['url']: raise RuntimeError(f'clipart failed {clipart}')
    if persisted['layoutPresetId']!='right-mindmap': raise RuntimeError(f'layout persistence failed {persisted}')
    if not persisted['images']: raise RuntimeError(f'clipart persistence failed {persisted}')
    print({'gallery':gallery,'marker':marker,'clipart':clipart,'persisted':persisted})
    browser.close()
