"""v0.9.21 supplied SVG geometry and double-click rich-toolbar smoke."""
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
      const map=await plugin.repository.create('v0921 icons and toolbar','logicalStructure');
      map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'a',text:'双击选择文字'},children:[]}]};
      await plugin.repository.update(map.id,{data:map.data});
      const container=document.createElement('div');container.style.cssText='width:1360px;height:820px';host.append(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__smoke={plugin,map,container,context};window.__tabOptions.init.call(context);
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)
    page.wait_for_timeout(800)

    # Toolbar supplied icons use one outer viewBox and centered source viewport.
    toolbar = page.evaluate("""()=>{
      const selectors={search:'[data-action=open-search] svg',style:'[data-action=project-style] svg',undo:'[data-action=undo] svg',redo:'[data-action=redo] svg'};
      const out={};
      for(const [name,selector] of Object.entries(selectors)){
        const svg=document.querySelector(selector);const nested=svg?.querySelector(':scope > svg');
        out[name]={exists:!!svg,viewBox:svg?.getAttribute('viewBox'),nested:nested?{x:nested.getAttribute('x'),y:nested.getAttribute('y'),width:nested.getAttribute('width'),height:nested.getAttribute('height'),viewBox:nested.getAttribute('viewBox')}:null,html:svg?.outerHTML||'',color:svg?getComputedStyle(svg).color:''};
      }
      return out;
    }""")
    for name, info in toolbar.items():
        if not info['exists'] or info['viewBox'] != '0 0 20 20':
            raise RuntimeError(f'{name} is not normalized to 20x20: {info}')
        if info['nested'] != {'x':'1','y':'1','width':'18','height':'18','viewBox':info['nested']['viewBox']}:
            raise RuntimeError(f'{name} source viewport is not centered: {info}')
        low=info['html'].lower()
        if '#1e2024' in low or '#333' in low or '#636774' in low or '#888' in low:
            raise RuntimeError(f'{name} still contains fixed dark artwork colors')
        if 'currentcolor' not in low:
            raise RuntimeError(f'{name} does not inherit theme color')

    # Open node menu and inspect supplied relationship/asset icons in real DOM slots.
    node = page.locator('g.smm-node').filter(has_text='双击选择文字').first
    node.click(button='right', force=True)
    page.wait_for_selector('.ymz-context-menu--node')
    menu = page.evaluate("""()=>{
      const labels=['插入上级节点','插入同级节点','插入下级节点','节点样式','外框','图标','剪贴图'];
      const result={};
      for(const label of labels){
        const row=[...document.querySelectorAll('.b3-menu__item')].find(el=>el.querySelector(':scope > .b3-menu__label')?.textContent===label);
        const svg=row?.querySelector(':scope > .b3-menu__icon-wrap svg');const nested=svg?.querySelector(':scope > svg');
        result[label]={exists:!!svg,viewBox:svg?.getAttribute('viewBox'),nested:nested?{x:nested.getAttribute('x'),y:nested.getAttribute('y'),width:nested.getAttribute('width'),height:nested.getAttribute('height')}:null,html:svg?.outerHTML||'',slot:row?.querySelector(':scope > .b3-menu__icon-wrap')?.getBoundingClientRect().toJSON()||null};
      }
      return result;
    }""")
    for label, info in menu.items():
        if not info['exists'] or info['viewBox'] != '0 0 20 20':
            raise RuntimeError(f'{label} supplied icon missing or wrong outer viewBox: {info}')
        if info['nested'] != {'x':'1','y':'1','width':'18','height':'18'}:
            raise RuntimeError(f'{label} artwork is not centered in the common viewport: {info}')
        if 'currentcolor' not in info['html'].lower():
            raise RuntimeError(f'{label} does not use currentColor')

    # Verify inherited color changes rather than fixed black in a dark host surface.
    dark = page.evaluate("""()=>{
      const editor=document.querySelector('.ymz-editor');editor.style.color='rgb(230, 235, 242)';
      const menu=document.querySelector('.ymz-context-menu--node');menu.style.color='rgb(230, 235, 242)';menu.style.setProperty('--b3-theme-on-background','rgb(230, 235, 242)');menu.querySelectorAll('.b3-menu__item,.b3-menu__icon-wrap,svg').forEach(el=>el.style.color='rgb(230, 235, 242)');
      const toolbarSvg=document.querySelector('[data-action=open-search] svg');
      const menuSvg=[...document.querySelectorAll('.b3-menu__item')].find(el=>el.querySelector(':scope > .b3-menu__label')?.textContent==='插入上级节点')?.querySelector('svg');
      return {toolbar:getComputedStyle(toolbarSvg).color,menu:getComputedStyle(menuSvg).color};
    }""")
    if dark['toolbar'] != 'rgb(230, 235, 242)' or dark['menu'] != 'rgb(230, 235, 242)':
        raise RuntimeError(f'supplied icons did not inherit dark-theme color: {dark}')

    # Close menu, double-click node text, and require immediate selected text + toolbar.
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
    print({'toolbarIcons':list(toolbar.keys()),'menuIcons':list(menu.keys()),'darkTheme':dark,'richToolbar':rich,'pageErrors':0,'consoleErrors':0})
    browser.close()
