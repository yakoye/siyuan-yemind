"""Browser regression for v0.9.24 outline import, menu order and dark-theme geometry."""
from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__clipboardText='';
Object.defineProperty(navigator,'clipboard',{configurable:true,value:{
  async write(){window.__clipboardText='rich'},
  async writeText(value){window.__clipboardText=String(value)},
  async readText(){return window.__clipboardText}
}});
window.__siyuanMock=(()=>{
  const renderItem=(item)=>{const row=document.createElement('button');row.className='b3-menu__item';row.disabled=!!item.disabled;
    if(item.iconHTML){const icon=document.createElement('span');icon.className='b3-menu__icon';icon.innerHTML=item.iconHTML;row.append(icon)}else{const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('class','b3-menu__icon');row.append(svg)}
    const label=document.createElement('span');label.className='b3-menu__label';label.textContent=item.label||'';row.append(label);
    row.addEventListener('click',()=>{if(!row.disabled)item.click?.()});return row};
  class Plugin{constructor(){this.name='siyuan-yemind';this.app={};this.setting={addItem(){}};this.eventBus={on(){},off(){}}}addIcons(){}addTab(o){window.__tabOptions=o;return()=>({})}addDock(){return{}}addTopBar(){return document.body.appendChild(document.createElement('button'))}addCommand(){}getOpenedTab(){return{}}async loadData(){return null}async saveData(){}async removeData(){}openSetting(){}}
  class Menu{constructor(){this.element=document.createElement('div');this.element.className='b3-menu'}addItem(item){const row=renderItem(item);this.element.append(row);return row}addSeparator(){const s=document.createElement('div');s.className='b3-menu__separator';this.element.append(s)}open(){document.body.append(this.element);window.__lastMenu=this}close(){this.element.remove()}}
  class Dialog{constructor(options={}){this.element=document.createElement('div');this.element.className='b3-dialog';this.element.innerHTML=options.content||'';document.body.append(this.element)}destroy(){this.element.remove()}}
  class Setting{addItem(){}}
  return{Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};{const module=window.__outerModule;const exports=module.exports;const require=(name)=>{if(name==='siyuan')return window.__siyuanMock;throw new Error('Unexpected '+name)};\n" + bundle + "\nwindow.__YeMindExport=module.exports;}"
host_css = r'''
:root{--b3-theme-background:#fff;--b3-theme-surface:#f7f8fa;--b3-theme-on-background:#202124;--b3-theme-on-surface:#34373d;--b3-theme-on-surface-light:#737984;--b3-theme-primary:#176b50;--b3-list-hover:#edf0f3;--b3-border-color:#d7dce2;--b3-font-family:Arial,sans-serif}
html[data-theme-mode="dark"]{--b3-theme-background:#17191d;--b3-theme-surface:#22252b;--b3-theme-on-background:#eef1f5;--b3-theme-on-surface:#d7dbe2;--b3-theme-on-surface-light:#aab0ba;--b3-theme-primary:#62d1a8;--b3-list-hover:#2b3037;--b3-border-color:#3a3f48}
.b3-menu{position:fixed;z-index:99;left:20px;top:70px;display:flex;flex-direction:column;width:280px;padding:6px;background:var(--b3-theme-surface);color:var(--b3-theme-on-background)}
.b3-menu__item{display:flex;align-items:center;min-height:30px;border:0;background:transparent;color:inherit}.b3-menu__label{flex:1;text-align:left}.b3-dialog{position:fixed;z-index:110;inset:40px;background:var(--b3-theme-background);color:var(--b3-theme-on-background);overflow:auto}.b3-dialog__content{padding:16px}.b3-dialog__action{display:flex;padding:12px}.fn__space{flex:1}
'''

with sync_playwright() as p:
    browser=p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page=browser.new_page(viewport={'width':1400,'height':900})
    errors=[]
    page.on('pageerror',lambda exc:errors.append(str(exc)))
    page.set_content('<div id="host" style="width:1360px;height:860px"></div>')
    page.add_style_tag(content=host_css+'\n'+stylesheet+'\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas{min-width:1px;min-height:1px}')
    page.add_script_tag(content=wrapped)
    page.evaluate("""async()=>{const P=window.__YeMindExport;const plugin=new P();plugin.onload();await plugin.whenReady();const map=await plugin.repository.create('v0924','logicalStructure');map.data={data:{uid:'root',text:'中心主题',expand:true},children:[{data:{uid:'target',text:'导入位置',expand:true},children:[]}]};await plugin.repository.update(map.id,{data:map.data});const container=document.createElement('div');container.style.cssText='width:1320px;height:820px';host.append(container);window.__tabOptions.init.call({element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}});}""")
    page.wait_for_selector('[data-action="view-outline"]',timeout=30000)
    page.locator('[data-action="view-outline"]').click()
    page.wait_for_selector('.ymz-outline-row[data-outline-uid="target"]')
    row=page.locator('.ymz-outline-row[data-outline-uid="target"]')
    row.click(button='right')
    page.wait_for_selector('.ymz-context-menu--outline')
    labels=page.locator('.ymz-context-menu--outline > .b3-menu__item .b3-menu__label').all_text_contents()
    sequence=page.locator('.ymz-context-menu--outline').evaluate("e=>[...e.children].map(x=>x.classList.contains('b3-menu__separator')?'---':x.querySelector('.b3-menu__label')?.textContent||'')")
    expected=['编辑节点','插入上级节点','插入同级节点','插入下级节点','文本转导图…','添加','复制（当前行）','剪切（当前行）','粘贴（当前光标处）','粘贴（纯文本）','上移节点','下移节点','展开/折叠（下级节点）','删除当前行和子级','仅删除当前行']
    if labels != expected: raise RuntimeError(f'outline menu order mismatch: {labels}')
    expected_sequence=expected[:6]+['---']+expected[6:10]+['---']+expected[10:13]+['---']+expected[13:]
    if sequence != expected_sequence: raise RuntimeError(f'outline menu separators mismatch: {sequence}')
    page.get_by_text('文本转导图…', exact=True).click()
    page.wait_for_selector('.ymz-text-map-dialog')
    mode=page.locator('[data-field="mode"]')
    mode.select_option('unicode-tree')
    placeholder=page.locator('[data-field="source"]').get_attribute('placeholder') or ''
    if '├─ 节点A' not in placeholder: raise RuntimeError(f'unicode placeholder missing: {placeholder}')
    page.locator('[data-field="source"]').fill('PCIe RAS\n├─ RAS D.E.S.\n│  └─ Event Counter\n└─ RAS DP')
    page.wait_for_function("document.querySelector('[data-action=apply]')?.disabled===false")
    preview=page.locator('[data-role="preview"]').inner_text()
    if 'Event Counter' not in preview: raise RuntimeError(f'import preview missing: {preview}')
    page.locator('[data-action="apply"]').click()
    page.wait_for_function("[...document.querySelectorAll('.ymz-outline-row__editor')].some(e=>e.textContent.includes('PCIe RAS'))")
    event_editor=page.locator('.ymz-outline-row__editor').filter(has_text='Event Counter').first
    event_row=event_editor.locator('xpath=..')
    original_depth=event_row.evaluate("e=>Number(getComputedStyle(e).getPropertyValue('--ymz-outline-depth')||e.style.getPropertyValue('--ymz-outline-depth'))")
    event_editor.click()
    page.keyboard.press('End')
    page.keyboard.press('Enter')
    page.wait_for_timeout(80)
    active=page.locator('.ymz-outline-row.is-active')
    empty_depth=active.evaluate("e=>Number(e.style.getPropertyValue('--ymz-outline-depth'))")
    if empty_depth!=original_depth: raise RuntimeError(f'new sibling depth mismatch: {original_depth} -> {empty_depth}')
    page.keyboard.press('Enter')
    page.wait_for_timeout(100)
    promoted_depth=page.locator('.ymz-outline-row.is-active').evaluate("e=>Number(e.style.getPropertyValue('--ymz-outline-depth'))")
    if promoted_depth!=original_depth-1: raise RuntimeError(f'empty Enter did not promote one level: {empty_depth} -> {promoted_depth}')
    promotion_depths=[empty_depth,promoted_depth]
    while promotion_depths[-1] > 1:
        page.keyboard.press('Enter')
        page.wait_for_timeout(80)
        promotion_depths.append(page.locator('.ymz-outline-row.is-active').evaluate("e=>Number(e.style.getPropertyValue('--ymz-outline-depth'))"))
    empty_uid=page.locator('.ymz-outline-row.is-active').get_attribute('data-outline-uid')
    page.keyboard.press('Enter')
    page.wait_for_timeout(100)
    if page.locator(f'.ymz-outline-row[data-outline-uid="{empty_uid}"]').count()!=0: raise RuntimeError('root-child empty Enter did not remove the empty row')
    if page.locator('.ymz-outline-row.is-active').get_attribute('data-outline-uid')!='root': raise RuntimeError('root-child empty Enter did not focus the root')

    # Cutting a line clears only its text and keeps the node and imported subtree.
    target=page.locator('.ymz-outline-row[data-outline-uid="target"]')
    target.click(button='right')
    page.locator('.ymz-context-menu--outline').last.get_by_text('剪切（当前行）', exact=True).click()
    page.wait_for_timeout(120)
    if page.locator('.ymz-outline-row[data-outline-uid="target"]').count()!=1: raise RuntimeError('cut current line removed the node')
    if page.locator('.ymz-outline-row[data-outline-uid="target"] [data-outline-editor]').inner_text().strip(): raise RuntimeError('cut current line did not clear text')
    imported=page.locator('.ymz-outline-row__editor').filter(has_text='PCIe RAS').first.locator('xpath=..')
    if imported.get_attribute('data-outline-parent-uid')!='target': raise RuntimeError('cut current line changed or removed the subtree')

    page.locator('[data-action="view-map"]').click()
    page.wait_for_selector('g.smm-node')
    before=page.locator('g.smm-node').filter(has_text='中心主题').first.bounding_box()
    page.evaluate("document.documentElement.setAttribute('data-theme-mode','dark')")
    page.wait_for_function("document.querySelector('.ymz-editor')?.dataset.appearance==='dark'")
    page.wait_for_timeout(250)
    after=page.locator('g.smm-node').filter(has_text='中心主题').first.bounding_box()
    if before and after and abs(before['x']-after['x'])>1.1: raise RuntimeError(f'root drifted after dark switch: {before} -> {after}')
    page.locator('[data-action="theme-gallery"]').click()
    page.wait_for_selector('[data-role="theme-choice-panel"]:not([hidden])')
    theme_panel=page.locator('[data-role="theme-choice-panel"]').evaluate("e=>getComputedStyle(e).backgroundColor")
    page.locator('[data-action="line-style-gallery"]').click()
    page.wait_for_selector('[data-role="line-style-choice-panel"]:not([hidden])')
    line_count=page.locator('[data-role="line-style-choice-panel"] .ymz-project-choice-panel__item').count()
    if line_count!=3: raise RuntimeError(f'line choices missing: {line_count}')
    if page.locator('.ymz-topbar select:not([hidden])').count()!=0: raise RuntimeError('native theme or line control is still visible')
    if errors: raise RuntimeError('Page errors: '+'\n'.join(errors))
    print({'menu':labels,'separators':sequence.count('---'),'placeholder':placeholder,'preview':preview,'enterDepths':[original_depth,*promotion_depths],'rootBoundaryRemoved':True,'cutPreservedSubtree':True,'rootDelta':0 if not before or not after else after['x']-before['x'],'themePanel':theme_panel,'lineChoices':line_count})
    browser.close()
