"""Browser regression for v0.9.25 import dialog, dark project panels and outline accessories."""
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
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.className='b3-dialog';const container=document.createElement('div');container.className='b3-dialog__container';if(options.width)container.style.width=options.width;if(options.height)container.style.height=options.height;container.innerHTML=options.content||'';this.element.append(container);document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
html[data-theme-mode="dark"]{--b3-theme-background:#17191d;--b3-theme-surface:#22252b;--b3-theme-on-background:#eef1f5;--b3-theme-on-surface:#d7dbe2;--b3-theme-on-surface-light:#aab0ba;--b3-theme-primary:#62d1a8;--b3-list-hover:#2b3037;--b3-border-color:#3a3f48}
body{margin:0;background:var(--b3-theme-background);color:var(--b3-theme-on-background)}
.b3-menu{position:fixed;z-index:99;left:20px;top:70px;display:flex;flex-direction:column;width:280px;padding:6px;background:var(--b3-theme-surface);color:var(--b3-theme-on-background)}
.b3-menu--submenu{left:310px;top:180px}.b3-menu__item{display:flex;align-items:center;min-height:30px;border:0;background:transparent;color:inherit}.b3-menu__label{flex:1;text-align:left}
.b3-dialog{position:fixed;z-index:110;inset:0;display:grid;place-items:center;background:rgba(0,0,0,.2)}.b3-dialog__container{display:flex;flex-direction:column;max-width:calc(100vw - 24px);max-height:calc(100vh - 24px);background:var(--b3-theme-background);color:var(--b3-theme-on-background);overflow:hidden}.b3-dialog__content{padding:16px;box-sizing:border-box}.b3-dialog__action{display:flex;padding:12px}.fn__space{flex:1}
'''

def rgb_luma(rgb):
    values = [int(v) for v in rgb.replace('rgba(', '').replace('rgb(', '').replace(')', '').split(',')[:3]]
    return sum(values) / 3

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1280,'height':760})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1260px;height:740px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();window.__plugin=plugin;plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0925','logicalStructure');map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'target',text:'导入位置',expand:true,icon:['yemind_star','priority_1'],image:'data:image/gif;base64,R0lGODlhAQABAAAAACw=',imageTitle:'示例图片',imageSize:{width:1,height:1,custom:false},yemindClipartId:'sample'},children:[]}]};await plugin.repository.update(map.id,{data:map.data});window.__mapId=map.id;const container=document.createElement('div');container.style.cssText='width:1240px;height:720px';host.append(container);window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});}""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="target"]')
    accessories=page.locator('.ymz-outline-row[data-outline-uid="target"] .ymz-outline-accessories')
    if accessories.count()!=1: raise RuntimeError('outline accessories were not projected')
    if accessories.locator('.ymz-outline-accessories__icon').count()!=2: raise RuntimeError('outline icons missing')
    if accessories.locator('.ymz-outline-accessories__image').count()!=1: raise RuntimeError('outline image/clipart missing')

    row=page.locator('.ymz-outline-row[data-outline-uid="target"]')
    row.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    add=page.locator('.ymz-context-menu--outline > .b3-menu__item').filter(has_text='添加').first
    add.hover()
    page.wait_for_selector('.b3-menu--submenu')
    child_labels=page.locator('.b3-menu--submenu .b3-menu__label').all_text_contents()
    if child_labels != ['图标','剪贴图','图片']: raise RuntimeError(f'outline add submenu mismatch: {child_labels}')
    page.locator('.ymz-context-menu--outline').get_by_text('文本转导图…', exact=True).click()
    page.wait_for_selector('.ymz-text-map-dialog')
    box=page.locator('.b3-dialog__container').bounding_box()
    if not box or box['height'] > 708 or box['width'] > 1232: raise RuntimeError(f'dialog escaped viewport: {box}')
    page.locator('[data-field="mode"]').select_option('unicode-tree')
    long_text='这是一个超过二十个汉字但不应该修改原始文字内容的节点标题'
    page.locator('[data-field="source"]').fill('PCIe RAS\n├─ RAS D.E.S.\n│  └─ '+long_text+'\n└─ RAS DP')
    page.wait_for_function("document.querySelector('[data-action=apply]')?.disabled===false")
    preview=page.locator('[data-role="preview"]')
    preview_text=preview.inner_text()
    if '├─' in preview_text or '│' in preview_text: raise RuntimeError(f'preview still contains source tree symbols: {preview_text}')
    if long_text not in preview_text: raise RuntimeError('processed preview lost node text')
    if preview.locator('.ymz-text-map-dialog__preview-row').count()!=4: raise RuntimeError('processed preview row count mismatch')
    page.locator('[data-action="apply"]').click()
    page.wait_for_function("[...document.querySelectorAll('.ymz-outline-row__editor')].some(e=>e.textContent.includes('超过二十个汉字'))")
    page.wait_for_timeout(900)
    stored=page.evaluate("""async()=>{const map=window.__plugin.repository.get(window.__mapId);const target=map.data.children[0];const long=target.children[0].children[0].children[0];return {text:long.data.text,width:long.data.width,customTextWidth:long.data.customTextWidth}}""")
    if stored['width']!=280 or stored['customTextWidth']!=280: raise RuntimeError(f'import width policy not persisted: {stored}')
    if '\n' in stored['text']: raise RuntimeError('width policy inserted source newline')

    page.evaluate("document.documentElement.setAttribute('data-theme-mode','dark')")
    page.wait_for_function("document.querySelector('.ymz-editor')?.dataset.appearance==='dark'")
    page.locator('[data-action="theme-gallery"]').click()
    page.wait_for_selector('[data-role="theme-choice-panel"]:not([hidden])')
    panel=page.locator('[data-role="theme-choice-panel"]')
    panel_bg=panel.evaluate('e=>getComputedStyle(e).backgroundColor')
    if rgb_luma(panel_bg)>100: raise RuntimeError(f'dark theme panel is too bright: {panel_bg}')
    selected=panel.locator('.ymz-project-choice-panel__item.is-selected')
    if selected.count()!=1: raise RuntimeError('theme selected item missing')
    normal_color=page.locator('[data-action="layout-gallery"]').evaluate('e=>getComputedStyle(e).color')
    theme_color=page.locator('[data-action="theme-gallery"]').evaluate('e=>getComputedStyle(e).color')
    save_color=page.locator('[data-role="save-state"]').evaluate('e=>getComputedStyle(e).color')
    if rgb_luma(theme_color)<90 or rgb_luma(normal_color)<150 or rgb_luma(save_color)<130: raise RuntimeError(f'dark toolbar text too dim: {normal_color} {theme_color} {save_color}')
    page.locator('[data-action="line-style-gallery"]').click()
    page.wait_for_selector('[data-role="line-style-choice-panel"]:not([hidden])')
    if page.locator('[data-role="line-style-choice-panel"] .ymz-project-choice-panel__item').count()!=3: raise RuntimeError('line style custom choices missing')
    if page.locator('.ymz-topbar select:not([hidden])').count()!=0: raise RuntimeError('native theme/line select remained visible')
    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'dialog':box,'previewRows':4,'outlineAccessories':True,'addSubmenu':child_labels,'storedWidth':stored['width'],'darkPanel':panel_bg,'toolbarColors':[normal_color,theme_color,save_color]})
    browser.close()
