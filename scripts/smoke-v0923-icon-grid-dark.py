"""Browser regression for the shared 22px icon column and dark YeMind states."""
from pathlib import Path
import os
import subprocess
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
gallery_output = root / '.tmp-v0923-icon-gallery.js'
gallery_manifest = root / '.tmp-v0923-icon-gallery.json'
env = dict(os.environ)
env.update({
    'YEMIND_BUNDLE_ENTRY': 'tests/offline/iconGalleryV0923BrowserEntry.ts',
    'YEMIND_BUNDLE_OUTPUT': str(gallery_output),
    'YEMIND_BUNDLE_MANIFEST': str(gallery_manifest),
})
subprocess.run(['node', 'scripts/build-offline-bundle.mjs'], cwd=root, env=env, check=True, capture_output=True, text=True)
gallery_bundle = gallery_output.read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  const nativeIcon=(name)=>`<svg class="b3-menu__icon" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h12M10 4v12" fill="none" stroke="currentColor" stroke-width="1.5"/></svg>`;
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';
    if(item.iconHTML){const icon=document.createElement('span');icon.className='b3-menu__icon';icon.innerHTML=item.iconHTML;row.append(icon)}else{row.insertAdjacentHTML('beforeend',nativeIcon(item.icon||'iconBlank'))}
    const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(label);
    if(item.accelerator){const accelerator=document.createElement('span');accelerator.className='b3-menu__accelerator';accelerator.textContent=item.accelerator;row.append(accelerator)}
    if(Array.isArray(item.submenu)){const arrow=document.createElement('span');arrow.className='b3-menu__submenu';arrow.textContent='›';row.append(arrow);const sub=document.createElement('div');sub.className='b3-menu ymz-context-menu';item.submenu.forEach(child=>sub.append(renderItem(child)));row.append(sub)}
    row.addEventListener('click',()=>item.click?.());return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){const s=document.createElement('div');s.className='b3-menu__separator';this.element.append(s)}open(){document.body.append(this.element);window.__lastMenu=this}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.innerHTML=options.content||'';document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{
 --b3-theme-background:#f8fafc;--b3-theme-surface:#ffffff;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#6f7580;
 --b3-theme-primary:#176b50;--b3-theme-primary-lighter:#dcefe8;--b3-border-color:#d7dce2;--b3-list-hover:#edf0f3;--b3-font-family:Arial,sans-serif;
}
html[data-theme-mode="dark"]{
 --b3-theme-background:#17191d;--b3-theme-surface:#22252b;--b3-theme-on-background:#eef1f5;--b3-theme-on-surface:#d7dbe2;--b3-theme-on-surface-light:#aab0ba;
 --b3-theme-primary:#62d1a8;--b3-theme-primary-lighter:#203f35;--b3-border-color:#3a3f48;--b3-list-hover:#2b3037;
}
.b3-menu{position:fixed;left:30px;top:80px;display:flex;flex-direction:column;width:290px;padding:6px;background:var(--b3-theme-surface);color:var(--b3-theme-on-background)}
.b3-menu__item{position:relative;display:flex;align-items:center;min-height:30px;padding:2px 8px;border:0;background:transparent;color:inherit;text-align:left}
.b3-menu__label{flex:1}.b3-menu__accelerator,.b3-menu__submenu{margin-left:auto}.b3-menu .b3-menu{position:absolute;left:270px;top:0}
'''

def rgba_tuple(value):
    value=value.strip()
    if value.startswith('color(srgb '):
        inner=value[len('color(srgb '):].rstrip(')')
        if ' / ' in inner:
            channels,alpha=inner.split(' / ',1)
            a=float(alpha)
        else:
            channels=inner
            a=1.0
        r,g,b=[float(x)*255 for x in channels.split()[:3]]
        return r,g,b,a
    inner=value.replace('rgba(','').replace('rgb(','').replace(')','')
    parts=[float(x.strip()) for x in inner.split(',')]
    return parts[0],parts[1],parts[2],parts[3] if len(parts)>3 else 1.0

def rgb_tuple(value, under=None):
    r,g,b,a=rgba_tuple(value)
    if a<1 and under is not None:
        ur,ug,ub,_=rgba_tuple(under)
        r,g,b=r*a+ur*(1-a),g*a+ug*(1-a),b*a+ub*(1-a)
    return r,g,b

def lum(value, under=None):
    r,g,b=rgb_tuple(value,under)
    return 0.2126*r+0.7152*g+0.0722*b

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1400,'height':900})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1360px;height:860px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('dark icon grid','logicalStructure');map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'n1',text:'一级节点'},children:[{data:{uid:'n2',text:'二级节点'},children:[]}]}]};await plugin.repository.update(map.id,{data:map.data});const container=document.createElement('div');container.style.cssText='width:1320px;height:820px';host.append(container);window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});}""")
    page.wait_for_selector('[data-action="open-search"] .ymz-icon-slot',timeout=30000)
    target=page.locator('g.smm-node').filter(has_text='一级节点').first
    target.click(button='right',force=True)
    page.wait_for_selector('.ymz-context-menu .b3-menu__item')
    light=page.evaluate("""()=>{
      const menu=document.querySelector('.ymz-context-menu');const items=[...menu.querySelectorAll(':scope>.b3-menu__item')];
      const custom=[...menu.querySelectorAll('.ymz-icon-slot')];const source=[...menu.querySelectorAll('img.ymz-operation-icon--light')];
      const labels=items.slice(0,8).map(row=>row.querySelector('.b3-menu__label')?.getBoundingClientRect().left).filter(Number.isFinite);
      return {slots:custom.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}),images:source.map(e=>{const r=e.getBoundingClientRect();return [r.width,r.height]}),labelSpread:Math.max(...labels)-Math.min(...labels),native:[...menu.querySelectorAll('svg.b3-menu__icon')].map(e=>{const r=e.getBoundingClientRect();const s=getComputedStyle(e);return [r.width,r.height,s.paddingTop,s.paddingLeft]})};
    }""")
    if not light['slots'] or any(abs(w-22)>0.2 or abs(h-22)>0.2 for w,h in light['slots']): raise RuntimeError(f'custom icon slots are not 22px: {light}')
    if not light['images'] or any(abs(w-15)>0.2 or abs(h-15)>0.2 for w,h in light['images']): raise RuntimeError(f'custom artwork is not 15px: {light}')
    if light['labelSpread']>1.1: raise RuntimeError(f'menu labels are not aligned: {light}')
    if any(abs(w-22)>0.2 or abs(h-22)>0.2 or ptop!='3.5px' or pleft!='3.5px' for w,h,ptop,pleft in light['native']): raise RuntimeError(f'native menu icons do not share the 22/15 grid: {light}')

    page.evaluate("document.documentElement.setAttribute('data-theme-mode','dark')")
    page.wait_for_function("document.querySelector('.ymz-editor')?.dataset.appearance==='dark'")
    page.wait_for_timeout(100)
    dark_icons=page.evaluate("""async()=>{const imgs=[...document.querySelectorAll('img.ymz-operation-icon--dark')].filter(img=>getComputedStyle(img).display!=='none');return {count:imgs.length,lightVisible:[...document.querySelectorAll('img.ymz-operation-icon--light')].filter(img=>getComputedStyle(img).display!=='none').length,loaded:imgs.every(img=>img.complete&&img.naturalWidth>0)};}""")
    if dark_icons['count']<4 or dark_icons['lightVisible']!=0 or not dark_icons['loaded']: raise RuntimeError(f'dark icon variants are not active: {dark_icons}')

    gallery=browser.new_page(viewport={'width':900,'height':240})
    gallery.set_content('<div id="gallery" class="ymz-editor" data-appearance="dark"></div>')
    gallery.add_style_tag(content=host_css+'\n'+stylesheet+'\n#gallery{display:flex;gap:12px;align-items:center;padding:20px;background:#17191d}')
    gallery.add_script_tag(content='window.require=()=>({});'+gallery_bundle)
    gallery.evaluate("gallery.innerHTML=window.__yemindIconGallery")
    gallery.wait_for_function("[...document.querySelectorAll('img.ymz-operation-icon--dark')].every(img=>img.complete&&img.naturalWidth>0)")
    gallery_result=gallery.evaluate("""()=>{
      const images=[...document.querySelectorAll('img.ymz-operation-icon--dark')];
      const samples=images.map(img=>{const c=document.createElement('canvas');c.width=32;c.height=32;const ctx=c.getContext('2d');ctx.drawImage(img,0,0,32,32);const d=ctx.getImageData(0,0,32,32).data;let pixels=0,lum=0;for(let i=0;i<d.length;i+=4){if(d[i+3]>20){pixels++;lum+=(.2126*d[i]+.7152*d[i+1]+.0722*d[i+2])}}return {pixels,lum:pixels?lum/pixels:0,display:getComputedStyle(img).display};});
      return {count:images.length,lightVisible:[...document.querySelectorAll('img.ymz-operation-icon--light')].filter(img=>getComputedStyle(img).display!=='none').length,samples};
    }""")
    if gallery_result['count']!=14 or gallery_result['lightVisible']!=0: raise RuntimeError(f'all dark icon variants were not rendered: {gallery_result}')
    if any(item['display']=='none' or item['pixels']<8 or item['lum']<105 for item in gallery_result['samples']): raise RuntimeError(f'a dark icon is not visibly bright: {gallery_result}')
    gallery.close()

    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row')
    row=page.locator('.ymz-outline-row:not(.is-active)').first
    base_bg=page.evaluate("getComputedStyle(document.querySelector('.ymz-editor')).backgroundColor")
    row.hover()
    hover_bg=row.evaluate("e=>getComputedStyle(e).backgroundColor")
    row.evaluate("e=>e.classList.add('is-active')")
    active_state=row.evaluate("e=>{e.classList.add('is-active');const s=getComputedStyle(e);return {cls:e.className,bg:s.backgroundColor,color:s.color,match:e.matches('.ymz-outline-row.is-active')}}")
    active_bg=active_state['bg']
    active_color=active_state['color']
    active_button=page.locator('[data-action="view-outline"]')
    button_bg=active_button.evaluate("e=>getComputedStyle(e).backgroundColor")
    button_color=active_button.evaluate("e=>getComputedStyle(e).color")
    if hover_bg==base_bg or active_bg in (base_bg,hover_bg): raise RuntimeError(f'outline dark states are indistinguishable: {base_bg}, {hover_bg}, {active_bg}')
    if lum(hover_bg,base_bg)>110 or lum(active_bg,base_bg)>125: raise RuntimeError(f'outline dark states are too bright: {hover_bg}, {active_bg}')
    if abs(lum(active_color)-lum(active_bg,base_bg))<70: raise RuntimeError(f'outline active contrast too low: {active_color} on {active_bg}')
    if abs(lum(button_color)-lum(button_bg,base_bg))<70: raise RuntimeError(f'topbar active contrast too low: {button_color} on {button_bg}')
    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'light':light,'darkIcons':dark_icons,'allDarkIcons':gallery_result,'outline':[base_bg,hover_bg,active_bg,active_color,active_state],'activeButton':[button_bg,button_color]})
    browser.close()

for temporary in (gallery_output, gallery_manifest):
    temporary.unlink(missing_ok=True)
