"""v0.9.22 exact supplied SVG image-boundary and double-click rich-toolbar smoke."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock=(()=>{
  window.__menus=[];
  const nativeIcon=(name)=>`<svg class="b3-menu__icon" viewBox="0 0 20 20" aria-hidden="true"><use href="#${name}"></use></svg>`;
  const renderItem=(item)=>{
    const row=document.createElement('button');
    row.type='button'; row.className='b3-menu__item'; row.dataset.label=item.label||'';
    const icon=document.createElement('span'); icon.className='b3-menu__icon-wrap';
    icon.innerHTML=item.iconHTML||nativeIcon(item.icon||'iconBlank');
    const label=document.createElement('span'); label.className='b3-menu__label'; label.textContent=item.label||'';
    row.append(icon,label);
    if(item.disabled) row.disabled=true;
    if(Array.isArray(item.submenu)){
      const sub=document.createElement('div'); sub.className='b3-menu__submenu';
      item.submenu.forEach(child=>sub.append(renderItem(child)));
      row.append(sub);
    }
    row.addEventListener('click',(event)=>{event.stopPropagation();if(!item.disabled)item.click?.()});
    return row;
  };
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}
    addIcons(){} addTab(o){window.__tabOptions=o;return()=>({})} addDock(){return{}}
    addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu{
    constructor(id=''){this.id=id;this.element=document.createElement('div');this.element.className='b3-menu';this.items=[]}
    addItem(item){this.items.push(item);const row=renderItem(item);this.element.append(row);return row}
    addSeparator(){const sep=document.createElement('div');sep.className='b3-menu__separator';this.element.append(sep);return sep}
    open(){document.querySelectorAll('.b3-menu[data-yemind-mock]').forEach(x=>x.remove());this.element.dataset.yemindMock='true';document.body.append(this.element);window.__lastMenu=this;window.__menus.push(this)}
    close(){this.element.remove()}
  }
  class Dialog{constructor(options={}){this.options=options;this.element=document.createElement('div');this.element.className='b3-dialog';this.element.innerHTML=options.content||'';document.body.appendChild(this.element)}destroy(){this.element.remove();this.options.destroyCallback?.()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"


def assert_exact_image(info, label):
    if not info['exists'] or info['tag'] != 'IMG':
        raise RuntimeError(f'{label} is not an isolated IMG: {info}')
    if not info['src'].startswith('data:image/svg+xml;base64,'):
        raise RuntimeError(f'{label} does not retain a Base64 SVG source')
    if info['width'] != 18 or info['height'] != 18:
        raise RuntimeError(f'{label} outer box is not 18x18: {info}')
    if not info['complete'] or info['naturalWidth'] <= 0 or info['naturalHeight'] <= 0:
        raise RuntimeError(f'{label} SVG image did not load: {info}')
    if info['children'] != 0:
        raise RuntimeError(f'{label} exposes child SVG geometry to host CSS: {info}')


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 1440, 'height': 900})
    page_errors=[]; console_errors=[]
    page.on('pageerror', lambda exc: page_errors.append(getattr(exc, 'stack', None) or str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1380px;height:850px"></div></body></html>')
    page.add_style_tag(content=stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{
      const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();
      const map=await plugin.repository.create('v0922 icons and toolbar','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'a',text:'双击选择文字'},children:[]}]};
      await plugin.repository.update(map.id,{data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1360px;height:820px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_selector('[data-action="open-search"] img.ymz-operation-icon', timeout=10000)
    page.wait_for_timeout(500)

    toolbar = page.evaluate("""()=>{
      const selectors={search:'[data-action=open-search] img',style:'[data-action=project-style] img',undo:'[data-action=undo] img',redo:'[data-action=redo] img'};
      const out={};
      for(const [name,selector] of Object.entries(selectors)){
        const image=document.querySelector(selector);const rect=image?.getBoundingClientRect();
        out[name]={exists:!!image,tag:image?.tagName||'',src:image?.getAttribute('src')||'',width:Math.round(rect?.width||0),height:Math.round(rect?.height||0),complete:image?.complete||false,naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,children:image?.childElementCount||0,draggable:image?.getAttribute('draggable')};
      }
      return out;
    }""")
    for name, info in toolbar.items():
        assert_exact_image(info, name)
        if info['draggable'] != 'false':
            raise RuntimeError(f'{name} can start native image dragging: {info}')

    node = page.locator('g.smm-node').filter(has_text='双击选择文字').first
    node.click(button='right', force=True)
    page.wait_for_selector('.ymz-context-menu--node')
    page.wait_for_timeout(200)
    menu = page.evaluate("""()=>{
      const labels=['插入上级节点','插入同级节点','插入下级节点','节点样式','外框','图标','剪贴图'];
      const result={};
      for(const label of labels){
        const row=[...document.querySelectorAll('.b3-menu__item')].find(el=>el.querySelector(':scope > .b3-menu__label')?.textContent===label);
        const image=row?.querySelector(':scope > .b3-menu__icon-wrap img.ymz-operation-icon');const rect=image?.getBoundingClientRect();
        result[label]={exists:!!image,tag:image?.tagName||'',src:image?.getAttribute('src')||'',width:Math.round(rect?.width||0),height:Math.round(rect?.height||0),complete:image?.complete||false,naturalWidth:image?.naturalWidth||0,naturalHeight:image?.naturalHeight||0,children:image?.childElementCount||0,draggable:image?.getAttribute('draggable')};
      }
      return result;
    }""")
    for label, info in menu.items():
        assert_exact_image(info, label)

    page.evaluate("()=>window.__lastMenu?.close()")
    text_node = page.locator('g.smm-node').filter(has_text='双击选择文字').locator('.smm-richtext-node-wrap').first
    text_node.dblclick(force=True)
    page.wait_for_selector('.smm-richtext-node-edit-wrap .ql-editor', timeout=10000)
    page.wait_for_function("()=>{const t=document.querySelector('.ymz-rich-toolbar');return t&&!t.hidden}", timeout=10000)
    rich = page.evaluate("""()=>{
      const toolbar=document.querySelector('.ymz-rich-toolbar');
      const editor=document.querySelector('.smm-richtext-node-edit-wrap .ql-editor');
      const selection=window.getSelection();
      return {visible:!!toolbar&&!toolbar.hidden,text:editor?.innerText||'',selected:selection?.toString()||'',toolbarRect:toolbar?.getBoundingClientRect().toJSON()||null};
    }""")
    if not rich['visible'] or rich['selected'].strip() != '双击选择文字':
        raise RuntimeError(f'double-click selection toolbar contract failed: {rich}')

    if page_errors:
        raise RuntimeError('Page errors:\n'+'\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n'+'\n'.join(console_errors))
    print({'toolbarIcons':list(toolbar.keys()),'menuIcons':list(menu.keys()),'exactImageBoundary':True,'richToolbar':rich,'pageErrors':0,'consoleErrors':0})
    browser.close()
