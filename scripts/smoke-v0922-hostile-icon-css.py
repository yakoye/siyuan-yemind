"""Ensure hostile SiYuan/custom SVG CSS cannot fill supplied YeMind artwork."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  const nativeIcon=(name)=>`<svg class="b3-menu__icon" viewBox="0 0 20 20"><use href="#${name}"></use></svg>`;
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';const icon=document.createElement('span');icon.className='b3-menu__icon-wrap';icon.innerHTML=item.iconHTML||nativeIcon(item.icon||'iconBlank');const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(icon,label);if(Array.isArray(item.submenu)){const sub=document.createElement('div');item.submenu.forEach(child=>sub.append(renderItem(child)));row.append(sub)}row.addEventListener('click',()=>item.click?.());return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){}open(){document.body.append(this.element);window.__lastMenu=this}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
hostile_css = r'''
svg, svg *, .b3-menu svg, .b3-menu svg path, .ymz-toolbar svg path {
  fill: rgb(0,0,0) !important;
  stroke: rgb(0,0,0) !important;
  stroke-width: 9px !important;
}
img.ymz-operation-icon { filter: none !important; opacity: 1 !important; }
'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':800})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1240px;height:760px"></div>')
    page.add_style_tag(content=stylesheet+'\n'+hostile_css+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('hostile css','logicalStructure');map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'n1',text:'目标'},children:[]}]};await plugin.repository.update(map.id,{data:map.data});const container=document.createElement('div');container.style.cssText='width:1200px;height:720px';host.append(container);window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});}""")
    page.wait_for_selector('[data-action="open-search"] img.ymz-operation-icon',timeout=30000)
    target=page.locator('g.smm-node').filter(has_text='目标').first
    target.click(button='right',force=True)
    page.wait_for_selector('.b3-menu__item')
    result=page.evaluate("""()=>{
      const toolbarSelectors=['[data-action=open-search] img','[data-action=project-style] img','[data-action=undo] img','[data-action=redo] img'];
      const toolbar=toolbarSelectors.map(selector=>document.querySelector(selector)).filter(Boolean);
      const menu=[...document.querySelectorAll('.b3-menu img.ymz-operation-icon')];
      const all=[...toolbar,...menu];
      const suppliedSlugs=['insert-parent','insert-sibling','insert-child','outer-frame','summary','relation','project-style','node-style','clipart','marker','search','redo','undo','fullscreen'];
      const inlineSuppliedSvg=suppliedSlugs.reduce((count,slug)=>count+document.querySelectorAll(`svg.ymz-icon-${slug}`).length,0);
      return {toolbar:toolbar.length,menu:menu.length,all:all.length,loaded:all.every(img=>img.complete&&img.naturalWidth>0&&img.naturalHeight>0),dataUris:all.every(img=>img.src.startsWith('data:image/svg+xml;base64,')),inlineChildren:all.reduce((n,img)=>n+img.childElementCount,0),inlineSuppliedSvg,tags:[...new Set(all.map(img=>img.tagName))]};
    }""")
    if result['toolbar'] != 4 or result['menu'] < 7:
        raise RuntimeError(f'expected toolbar and menu supplied icons: {result}')
    if not result['loaded'] or not result['dataUris'] or result['inlineChildren'] != 0 or result['inlineSuppliedSvg'] != 0 or result['tags'] != ['IMG']:
        raise RuntimeError(f'hostile CSS isolation failed: {result}')
    if errors:
        raise RuntimeError('Page errors: '+'\n'.join(errors))
    print(result)
    browser.close()
