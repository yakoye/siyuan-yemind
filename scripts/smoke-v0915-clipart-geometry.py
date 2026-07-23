"""v0.9.15 proportional clipart insertion and legacy repair browser smoke."""
from pathlib import Path
from urllib.parse import unquote
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  window.__menus=[];window.__dialogs=[];
  class Plugin{
    constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}}
    async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{
    constructor(id){this.id=id;this.items=[];this.element=document.createElement('div');window.__menus.push(this)}
    addItem(item){this.items.push(item);return document.createElement('div')}
    addSeparator(){this.items.push({separator:true});return document.createElement('div')}
    open(pos){this.pos=pos;window.__lastMenu=this} close(){}
  }
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element);window.__dialogs.push(this);window.__lastDialog=this}destroy(){this.element.remove();if(window.__lastDialog===this)window.__lastDialog=null}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def svg_for(url: str) -> str:
    decoded = unquote(url)
    if '003_牛.svg' in decoded:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="160" height="80" viewBox="0 0 160 80"><rect width="160" height="80" rx="10" fill="#d8b48a"/><circle cx="80" cy="40" r="18" fill="#fff"/></svg>'
    if '022_猫.svg' in decoded:
        return '<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 80 160"><rect width="80" height="160" rx="12" fill="#e7a85b"/><circle cx="40" cy="55" r="22" fill="#fff"/></svg>'
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" rx="12" fill="#d9e4ec"/></svg>'


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page_errors, console_errors, failed_requests = [], [], []
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.on('requestfailed', lambda request: failed_requests.append(request.url))
    def handle_local(route):
        url = route.request.url
        if '/assets/clipart/' in url:
            route.fulfill(status=200, content_type='image/svg+xml', body=svg_for(url))
        elif '/assets/layout-thumbnails/' in url:
            route.fulfill(status=200, content_type='image/svg+xml', body='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 80"><rect width="120" height="80" fill="#eef2f7"/></svg>')
        elif '/api/file/getFile' in url:
            route.fulfill(status=200, content_type='application/octet-stream', body=b'')
        else:
            route.continue_()
    page.route('http://yemind.local/**', handle_local)
    page.set_content('<!doctype html><html><head><base href="http://yemind.local/"></head><body style="margin:0;--b3-list-hover:#e5e7eb;--b3-theme-background:#fff;--b3-theme-on-background:#1f2937;--b3-border-color:#d1d5db"><div id="host" style="width:1400px;height:860px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const fresh=await plugin.repository.create('v0915 clipart geometry','logicalStructure');
      fresh.data.data={...fresh.data.data,uid:'legacy-cow',text:'旧版牛',image:'/plugins/siyuan-yemind/assets/clipart/01_动物/003_牛.svg',imageTitle:'牛',imageSize:{width:72,height:72,custom:true},yemindClipartId:'animal-003'};
      fresh.data.children=[
        {data:{uid:'new-cat',text:'新猫节点'},children:[]},
        {data:{uid:'ordinary-image',text:'普通图片',image:'/plugins/siyuan-yemind/assets/clipart/01_动物/003_牛.svg',imageSize:{width:72,height:72,custom:true}},children:[]},
        {data:{uid:'manual-clipart',text:'手动尺寸',image:'/plugins/siyuan-yemind/assets/clipart/01_动物/003_牛.svg',imageSize:{width:90,height:40,custom:true},yemindClipartId:'animal-003'},children:[]}
      ];
      await plugin.repository.update(fresh.id,{data:fresh.data});
      const container=document.createElement('div');container.style.cssText='width:1360px;height:820px;display:block';host.append(container);
      const context={element:container,data:{mapId:fresh.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,fresh,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_function("""()=>{
      const data=window.__smoke.plugin.repository.get(window.__smoke.fresh.id).data.data;
      return data.imageSize?.width===72 && data.imageSize?.height===36 && data.yemindClipartGeometryVersion===2;
    }""", timeout=30000)
    page.wait_for_timeout(250)

    legacy = page.evaluate("""()=>{
      const doc=window.__smoke.plugin.repository.get(window.__smoke.fresh.id);
      const root=doc.data.data;
      const ordinary=doc.data.children.find(n=>n.data.uid==='ordinary-image').data;
      const manual=doc.data.children.find(n=>n.data.uid==='manual-clipart').data;
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.textContent.includes('旧版牛'));
      const image=node?.querySelector('image');
      return {root:{size:root.imageSize,version:root.yemindClipartGeometryVersion},ordinary:ordinary.imageSize,manual:manual.imageSize,rendered:image?{width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))}:null};
    }""")
    if legacy['root']['size'] != {'width': 72, 'height': 36, 'custom': True} or legacy['root']['version'] != 2:
        raise RuntimeError(f'Legacy clipart was not repaired proportionally: {legacy}')
    if legacy['ordinary'] != {'width': 72, 'height': 72, 'custom': True}:
        raise RuntimeError(f'Ordinary image was unexpectedly migrated: {legacy}')
    if legacy['manual'] != {'width': 90, 'height': 40, 'custom': True}:
        raise RuntimeError(f'Manually resized clipart was unexpectedly migrated: {legacy}')
    if legacy['rendered'] != {'width': 72, 'height': 36}:
        raise RuntimeError(f'Rendered legacy clipart size is wrong: {legacy}')

    # Select the child node and insert a portrait clipart through the real picker.
    page.evaluate("""()=>{
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.textContent.includes('新猫节点'));
      const rect=node.getBoundingClientRect();
      node.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true,clientX:rect.x+rect.width/2,clientY:rect.y+rect.height/2,button:2}));
    }""")
    opened = page.evaluate("""()=>{
      const add=window.__lastMenu?.items?.find(item=>item.label==='添加');
      const clipart=add?.submenu?.find(item=>item.label==='剪贴图');
      clipart?.click();return Boolean(clipart);
    }""")
    if not opened:
        raise RuntimeError('Clipart picker menu item was not available')
    page.wait_for_selector('.ymz-clipart-dialog')
    page.locator('[data-role="clipart-search"]').fill('猫')
    page.wait_for_function("()=>[...document.querySelectorAll('.ymz-clipart-option')].some(button=>button.title==='猫')")
    page.locator('.ymz-clipart-option[title="猫"]').click()
    page.wait_for_function("""()=>{
      const node=window.__smoke.plugin.repository.get(window.__smoke.fresh.id).data.children.find(n=>n.data.uid==='new-cat')?.data;
      return node?.imageSize?.width===36 && node?.imageSize?.height===72 && node?.yemindClipartGeometryVersion===2;
    }""", timeout=30000)
    page.wait_for_timeout(250)
    inserted = page.evaluate("""()=>{
      const data=window.__smoke.plugin.repository.get(window.__smoke.fresh.id).data.children.find(n=>n.data.uid==='new-cat').data;
      const node=[...document.querySelectorAll('g.smm-node')].find(n=>n.textContent.includes('新猫节点'));
      const image=node?.querySelector('image');
      return {id:data.yemindClipartId,size:data.imageSize,version:data.yemindClipartGeometryVersion,rendered:image?{width:Number(image.getAttribute('width')),height:Number(image.getAttribute('height'))}:null};
    }""")
    if inserted['id'] != 'animal-022' or inserted['size'] != {'width': 36, 'height': 72, 'custom': True} or inserted['version'] != 2:
        raise RuntimeError(f'Portrait clipart insertion lost its aspect ratio: {inserted}')
    if inserted['rendered'] != {'width': 36, 'height': 72}:
        raise RuntimeError(f'Rendered portrait clipart size is wrong: {inserted}')

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors) + '\nFailed URLs:\n' + '\n'.join(failed_requests))
    print({'legacyRepair': legacy, 'portraitInsertion': inserted, 'pageErrors': 0, 'consoleErrors': 0})
    browser.close()
