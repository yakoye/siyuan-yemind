from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
bundle = (root / 'index.js').read_text(encoding='utf-8')
stylesheet = (root / 'index.css').read_text(encoding='utf-8')
mock = r'''
window.__siyuanMock = (() => {
  class Plugin {
    constructor() { this.name='siyuan-yemind'; this.app={}; this.setting={addItem(){}}; this.eventBus={on(){},off(){}}; }
    addIcons() {} addTab(options){window.__tabOptions=options;return()=>({})} addDock(){return{}} addTopBar(){const b=document.createElement('button');document.body.appendChild(b);return b}
    addCommand(){} getOpenedTab(){return{}} async loadData(){return null} async saveData(){} async removeData(){} openSetting(){}
  }
  class Menu { constructor(){this.element=document.createElement('div')} addItem(){return document.createElement('div')} addSeparator(){return document.createElement('div')} open(){} close(){} }
  class Dialog { constructor(){this.element=document.createElement('div')} destroy(){} }
  class Setting { addItem(){} }
  return {Plugin,Menu,Dialog,Setting,openTab:async()=>({headElement:document.createElement('div'),updateTitle(){},close(){}}),confirm:(_t,_x,cb)=>cb?.(),showMessage:()=>{}};
})();
'''
wrapped = mock + "\nwindow.__outerModule={exports:{}};\n{ const module=window.__outerModule; const exports=module.exports; const require=(name)=>{ if(name==='siyuan') return window.__siyuanMock; throw new Error('Unexpected external '+name); };\n" + bundle + "\nwindow.__YeMindExport=module.exports; }\n"

sample = r"""0.6 About This Book; 60
    0.6.1 The MindShare Technology Series; 60
    0.6.2 Cautionary Note; 61
    0.6.6 Documentation Conventions; 62
        0.6.6.1 PCI Express™; 62
        0.6.6.2 Hexadecimal Notation; 63
        0.6.6.3 Binary Notation; 63
    1. Chapter 1\: Background; 68
        1.1 Introduction; 68
        1.2 PCI and PCI-X; 69
        1.3 PCI Basics; 70
            1.3.1 Basics of a PCI-Based System; 70
            1.3.2 PCI Bus Initiator and Target; 71
            1.3.3 Typical PCI Bus Cycle; 72
            1.3.4 Reflected-Wave Signaling; 75
        1.4 PCI Bus Architecture Perspective; 77
            1.4.1 PCI Transaction Models; 77
                1.4.1.1 Programmed I/O; 77
                1.4.1.2 Direct Memory Access (DMA); 78
                1.4.1.3 Peer-to-Peer; 79
    2. Chapter 2\: PCIe Architecture Overview; 98
        2.1 Introduction to PCI Express; 98
            2.1.1 Software Backward Compatibility; 100
            2.1.2 Serial Transport; 100
                2.1.2.1 The Need for Speed; 100
                    2.1.2.1.1 Overcoming Problems; 100
                    2.1.2.1.2 Bandwidth; 101
                2.1.2.2 PCIe Bandwidth Calculation; 102
                2.1.2.3 Differential Signals; 103
                2.1.2.4 No Common Clock; 104
                2.1.2.5 Packet-based Protocol; 105
            2.1.3 Links and Lanes; 105
                2.1.3.1 Scalable Performance; 105
                2.1.3.2 Flexible Topology Options; 106"""

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={"width": 1280, "height": 900})
    page_errors=[]
    console_errors=[]
    page.on('pageerror', lambda exc: page_errors.append(str(exc)))
    page.on('console', lambda msg: console_errors.append(msg.text) if msg.type == 'error' else None)
    page.set_content('<!doctype html><html><body style="margin:0"><div id="host" style="width:1200px;height:800px"></div></body></html>')
    page.add_style_tag(content=stylesheet + '\n#host,.ymz-editor,.ymz-workspace,.ymz-canvas-wrap,.ymz-canvas{min-width:1px;min-height:1px;}')
    page.add_script_tag(content=wrapped)
    setup = page.evaluate("""async () => {
      const Plugin=window.__YeMindExport; const plugin=new Plugin(); plugin.onload(); await plugin.whenReady();
      const map=await plugin.repository.create('v0.9.3 Interaction Smoke','logicalStructure');
      const container=document.createElement('div'); container.style.cssText='width:1100px;height:720px;display:block'; document.querySelector('#host').appendChild(container);
      const context={element:container,data:{mapId:map.id},tab:{headElement:document.createElement('button'),updateTitle(){},close(){}}};
      window.__pluginSmoke={plugin,map,container,context}; window.__tabOptions.init.call(context); return {mapId:map.id};
    }""")
    page.wait_for_selector('[data-role="canvas"] svg', timeout=30000)

    # Root fill follows the effective canvas/theme background, so links cannot show through text.
    page.select_option('select[data-action="theme"]', 'scheme-dawn')
    page.dispatch_event('select[data-action="theme"]', 'change')
    page.wait_for_function("""() => {
      const c=window.__pluginSmoke.container; const root=c.querySelector('.smm-node-shape');
      return root?.getAttribute('fill') === '#ffffff' && getComputedStyle(c.querySelector('[data-role="canvas"]')).backgroundColor === 'rgb(255, 255, 255)';
    }""", timeout=5000)
    root_fill = page.eval_on_selector('.smm-node-shape', "el => el.getAttribute('fill')")
    page.wait_for_timeout(250)

    # Hover a non-selected node, then cross the node/button gap and wait longer than the hide delay.
    shapes = page.locator('.smm-node-shape')
    if shapes.count() < 2:
        raise RuntimeError('Expected at least two rendered nodes for hover smoke')
    hover_actions = []
    hover_alive = False
    for index in range(shapes.count()):
        target_box = shapes.nth(index).bounding_box()
        if not target_box:
            continue
        page.mouse.move(target_box['x'] + target_box['width']/2, target_box['y'] + target_box['height']/2)
        page.wait_for_timeout(80)
        host = page.locator('.ymz-node-quick-actions[data-quick-hovered="true"]')
        if host.count() != 1:
            continue
        actions = host.locator('[data-node-quick-action]').evaluate_all("nodes => nodes.map(node => node.dataset.nodeQuickAction)")
        if 'add-child' not in actions or not ({'collapse', 'expand'} & set(actions)):
            continue
        host_box = host.bounding_box()
        page.mouse.move(host_box['x'] + host_box['width']/2, host_box['y'] + host_box['height']/2, steps=6)
        page.wait_for_timeout(350)
        hover_actions = actions
        hover_alive = host.count() == 1
        break

    # The outline defaults to one native text document: multiline selection and indentation paste are first-class.
    page.click('[data-action="view-split"]')
    page.wait_for_selector('[data-role="outline-text-editor"]:visible')
    mode = page.get_attribute('[data-role="outline"]', 'data-outline-mode')
    page.fill('[data-role="outline-text-editor"]', sample)
    page.wait_for_function("""() => window.__pluginSmoke.container.querySelector('[data-role="outline-text-status"]')?.textContent?.startsWith('已同步')""", timeout=5000)
    page.wait_for_timeout(900)
    outline_result = page.evaluate("""() => {
      const {plugin,map,container}=window.__pluginSmoke;
      const text=container.querySelector('[data-role="outline-text-editor"]');
      const firstThreeEnd=text.value.split('\\n').slice(0,3).join('\\n').length;
      text.focus(); text.setSelectionRange(0, firstThreeEnd);
      const doc=plugin.repository.get(map.id);
      return {
        mode: container.querySelector('[data-role="outline"]')?.dataset.outlineMode,
        selectedText: text.value.slice(text.selectionStart,text.selectionEnd),
        rootText: doc?.data?.data?.text,
        childTexts: doc?.data?.children?.map(node=>node.data.text),
        chapterChildren: doc?.data?.children?.[3]?.children?.map(node=>node.data.text),
        deepestChildren: doc?.data?.children?.[4]?.children?.[0]?.children?.[1]?.children?.[0]?.children?.map(node=>node.data.text),
        nodeCount: (() => { let count=0; const visit=node=>{ if(!node)return; count+=1; (node.children||[]).forEach(visit); }; visit(doc?.data); return count; })(),
        status: container.querySelector('[data-role="outline-text-status"]')?.textContent,
      };
    }""")

    def plain(value):
        if value is None:
            return value
        import re
        return re.sub(r'<[^>]+>', '', value).replace('&nbsp;', ' ').strip()
    outline_result['rootText'] = plain(outline_result['rootText'])
    outline_result['childTexts'] = [plain(value) for value in (outline_result['childTexts'] or [])]
    outline_result['chapterChildren'] = [plain(value) for value in (outline_result['chapterChildren'] or [])]
    outline_result['deepestChildren'] = [plain(value) for value in (outline_result['deepestChildren'] or [])]

    # The rich node tree remains available as a secondary structured mode and is synchronized from the same data.
    page.click('[data-outline-mode-button="tree"]')
    page.wait_for_selector('[data-role="outline-tree"] [data-outline-uid]')
    tree_mode = page.evaluate("""() => ({
      mode: window.__pluginSmoke.container.querySelector('[data-role="outline"]')?.dataset.outlineMode,
      rows: window.__pluginSmoke.container.querySelectorAll('[data-role="outline-tree"] [data-outline-uid]').length,
      text: window.__pluginSmoke.container.querySelector('[data-role="outline-tree"]')?.textContent || '',
    })""")
    page.click('[data-outline-mode-button="text"]')
    page.wait_for_selector('[data-role="outline-text-editor"]:visible')

    # A long Chinese IME composition must stay local until compositionend.
    ime_result = page.evaluate("""() => {
      const {container}=window.__pluginSmoke;
      const textarea=container.querySelector('[data-role="outline-text-editor"]');
      const original=textarea.value;
      textarea.dispatchEvent(new CompositionEvent('compositionstart',{bubbles:true,data:''}));
      textarea.value=original.replace('0.6.2 Cautionary Note; 61','0.6.2 Cautionary 笔记; 61');
      textarea.dispatchEvent(new InputEvent('input',{bubbles:true,inputType:'insertCompositionText',data:'笔记',isComposing:true}));
      return { original };
    }""")
    page.wait_for_timeout(700)
    ime_during = page.evaluate("""() => {
      const {plugin,map}=window.__pluginSmoke;
      return plugin.repository.get(map.id)?.data?.children?.[1]?.data?.text || '';
    }""")
    page.evaluate("""() => {
      const textarea=window.__pluginSmoke.container.querySelector('[data-role="outline-text-editor"]');
      textarea.dispatchEvent(new CompositionEvent('compositionend',{bubbles:true,data:'笔记'}));
    }""")
    page.wait_for_function("""() => String(window.__pluginSmoke.plugin.repository.get(window.__pluginSmoke.map.id)?.data?.children?.[1]?.data?.text || '').includes('笔记')""", timeout=5000)
    ime_after = page.evaluate("""() => String(window.__pluginSmoke.plugin.repository.get(window.__pluginSmoke.map.id)?.data?.children?.[1]?.data?.text || '')""")
    page.fill('[data-role="outline-text-editor"]', ime_result['original'])
    page.wait_for_function("""() => String(window.__pluginSmoke.plugin.repository.get(window.__pluginSmoke.map.id)?.data?.children?.[1]?.data?.text || '').includes('Cautionary Note')""", timeout=5000)
    ime_protected = 'Cautionary Note' in plain(ime_during) and 'Cautionary 笔记' in plain(ime_after)

    if page_errors:
        raise RuntimeError('Page errors:\n' + '\n'.join(page_errors))
    if console_errors:
        raise RuntimeError('Console errors:\n' + '\n'.join(console_errors))
    if root_fill != '#ffffff':
        raise RuntimeError(f'Root theme background failed: {root_fill}')
    if not hover_alive:
        raise RuntimeError(f'Hover quick actions or collapse/add controls failed: {hover_actions}')
    if not ime_protected:
        raise RuntimeError(f'IME composition was reconciled too early or not applied: during={ime_during!r}, after={ime_after!r}')
    if mode != 'text' or outline_result['mode'] != 'text':
        raise RuntimeError(f'Continuous outline is not the default mode: {mode}, {outline_result}')
    if outline_result['rootText'] != '0.6 About This Book; 60':
        raise RuntimeError(f'Indented paste root mismatch: {outline_result}')
    expected_children = [
        '0.6.1 The MindShare Technology Series; 60',
        '0.6.2 Cautionary Note; 61',
        '0.6.6 Documentation Conventions; 62',
        '1. Chapter 1: Background; 68',
        '2. Chapter 2: PCIe Architecture Overview; 98',
    ]
    if outline_result['childTexts'] != expected_children:
        raise RuntimeError(f'Indented paste hierarchy mismatch: {outline_result}')
    if outline_result['nodeCount'] != 34:
        raise RuntimeError(f'Full sample node count mismatch: {outline_result}')
    if outline_result['chapterChildren'] != ['1.1 Introduction; 68', '1.2 PCI and PCI-X; 69', '1.3 PCI Basics; 70', '1.4 PCI Bus Architecture Perspective; 77']:
        raise RuntimeError(f'Nested hierarchy mismatch: {outline_result}')
    if outline_result['deepestChildren'] != ['2.1.2.1.1 Overcoming Problems; 100', '2.1.2.1.2 Bandwidth; 101']:
        raise RuntimeError(f'Five-level hierarchy mismatch: {outline_result}')
    if outline_result['selectedText'].count('\n') != 2:
        raise RuntimeError(f'Multiline native selection failed: {outline_result}')
    if tree_mode['mode'] != 'tree' or tree_mode['rows'] != 34 or 'Chapter 1: Background' not in tree_mode['text']:
        raise RuntimeError(f'Tree/text mode synchronization failed: {tree_mode}')

    print({'setup': setup, 'rootFill': root_fill, 'hoverActions': hover_actions, 'hoverBridge': hover_alive, 'imeProtected': ime_protected, 'outline': outline_result, 'treeMode': tree_mode})
    browser.close()
