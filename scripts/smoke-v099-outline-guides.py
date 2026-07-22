from pathlib import Path
from playwright.sync_api import sync_playwright

root = Path(__file__).resolve().parents[1]
stylesheet = (root / 'index.css').read_text(encoding='utf-8')

rows = []
for depth, label, is_root, has_children in [
    (0, '未命名导图', True, True),
    (1, '另一个主题2', False, True),
    (2, '主要主题1', False, False),
    (1, 'fdsafsd', False, True),
    (2, '新节点2', False, True),
    (3, '新节点1', False, False),
    (1, '342432', False, True),
    (2, '新节点0', False, False),
]:
    marker = (
        '<span class="ymz-outline-row__triangle" data-direction="down"></span>'
        if has_children
        else '<span class="ymz-outline-row__leaf-square"></span>'
    )
    rows.append(
        f'<div class="ymz-outline-row" data-outline-root="{str(is_root).lower()}" '
        f'data-outline-uid="n{len(rows)}" style="--ymz-outline-depth:{depth}">'
        '<span class="ymz-outline-row__drag"></span>'
        f'<span class="ymz-outline-row__branch">{marker}</span>'
        f'<div class="ymz-outline-row__editor">{label}</div></div>'
    )

html = f'''<!doctype html><html><body style="margin:0;background:#fafafa">
<div class="ymz-editor" data-view="outline" style="width:560px;height:540px">
  <div class="ymz-outline" style="height:100%;--ymz-accent:#167d67">
    <div class="ymz-structured-outline" data-role="outline-tree"
      style="--ymz-outline-guide-1:#91b2ff;--ymz-outline-guide-2:#f0b867;--ymz-outline-guide-3:#75cda6;--ymz-outline-guide-4:#bb91e8">
      {''.join(rows)}
    </div>
  </div>
</div></body></html>'''


def close(a, b, tolerance=0.2):
    return abs(a - b) <= tolerance


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path='/usr/bin/chromium', args=['--no-sandbox'])
    page = browser.new_page(viewport={'width': 800, 'height': 620})
    errors = []
    page.on('pageerror', lambda exc: errors.append(str(exc)))
    page.set_content(html)
    page.add_style_tag(content=stylesheet)
    page.wait_for_selector('[data-outline-uid="n5"]')

    metrics = page.evaluate('''()=>[...document.querySelectorAll('.ymz-outline-row')].map(row=>{
      const rowRect=row.getBoundingClientRect();
      const branch=row.querySelector('.ymz-outline-row__branch').getBoundingClientRect();
      const drag=row.querySelector('.ymz-outline-row__drag').getBoundingClientRect();
      const pseudo=getComputedStyle(row,'::before');
      return {
        uid:row.dataset.outlineUid,
        depth:Number(row.style.getPropertyValue('--ymz-outline-depth')||0),
        rowLeft:rowRect.left,
        markerCenter:branch.left+branch.width/2,
        dragLeft:drag.left,
        dragRight:drag.right,
        dragWidth:drag.width,
        guideContent:pseudo.content,
        guideLeft:Number.parseFloat(pseudo.left)||0,
        guideWidth:Number.parseFloat(pseudo.width)||0,
        background:pseudo.backgroundImage,
      };
    })''')
    by_uid = {item['uid']: item for item in metrics}
    root_row = by_uid['n0']
    level1 = by_uid['n1']
    level2 = by_uid['n2']
    level3 = by_uid['n5']

    if root_row['guideContent'] != 'none':
        raise RuntimeError(f'Root guide must be disabled: {root_row}')

    first_guide = level1['rowLeft'] + level1['guideLeft']
    expected_first = (root_row['markerCenter'] + level1['markerCenter']) / 2
    if not close(first_guide, expected_first):
        raise RuntimeError(f'First guide is not centered: actual={first_guide}, expected={expected_first}')

    second_guide = level2['rowLeft'] + level2['guideLeft'] + 22
    expected_second = (level1['markerCenter'] + level2['markerCenter']) / 2
    if not close(second_guide, expected_second):
        raise RuntimeError(f'Second guide is not centered: actual={second_guide}, expected={expected_second}')

    third_guide = level3['rowLeft'] + level3['guideLeft'] + 44
    parent_depth2 = by_uid['n4']
    expected_third = (parent_depth2['markerCenter'] + level3['markerCenter']) / 2
    if not close(third_guide, expected_third):
        raise RuntimeError(f'Third guide is not centered: actual={third_guide}, expected={expected_third}')

    if [round(level1['guideWidth']), round(level2['guideWidth']), round(level3['guideWidth'])] != [1, 23, 45]:
        raise RuntimeError(f'Unexpected guide widths: {level1["guideWidth"]}, {level2["guideWidth"]}, {level3["guideWidth"]}')

    for item in (level1, level2, level3):
        deepest = item['rowLeft'] + item['guideLeft'] + (item['depth'] - 1) * 22
        if not (item['dragLeft'] <= deepest <= item['dragRight']):
            raise RuntimeError(f'Deepest guide must remain inside drag indent cell: {item}, guide={deepest}')
        if not close(item['dragWidth'], 22):
            raise RuntimeError(f'Drag gutter changed size: {item}')

    before = page.evaluate('''()=>{const row=document.querySelector('[data-outline-uid="n5"]');const b=row.querySelector('.ymz-outline-row__branch').getBoundingClientRect();const p=getComputedStyle(row,'::before');return{marker:b.left+b.width/2,left:Number.parseFloat(p.left),width:Number.parseFloat(p.width)}}''')
    page.evaluate("document.querySelector('[data-outline-uid=\"n5\"]').classList.add('is-active')")
    page.hover('[data-outline-uid="n5"]')
    after = page.evaluate('''()=>{const row=document.querySelector('[data-outline-uid="n5"]');const b=row.querySelector('.ymz-outline-row__branch').getBoundingClientRect();const p=getComputedStyle(row,'::before');return{marker:b.left+b.width/2,left:Number.parseFloat(p.left),width:Number.parseFloat(p.width)}}''')
    if before != after:
        raise RuntimeError(f'Hover/active shifted guide geometry: before={before}, after={after}')

    if 'rgb(145, 178, 255)' not in level3['background'] or 'rgb(240, 184, 103)' not in level3['background']:
        raise RuntimeError(f'Rainbow guide colors not resolved: {level3["background"]}')

    page.screenshot(path=str(root / '.tmp-v099-outline-guides.png'), full_page=True)
    if errors:
        raise RuntimeError(f'Page errors: {errors}')

    print({
        'rootGuide': root_row['guideContent'],
        'firstGuide': first_guide,
        'firstMidpoint': expected_first,
        'secondGuide': second_guide,
        'secondMidpoint': expected_second,
        'thirdGuide': third_guide,
        'thirdMidpoint': expected_third,
        'guideWidths': [level1['guideWidth'], level2['guideWidth'], level3['guideWidth']],
        'dragWidth': level3['dragWidth'],
        'stableAfterActiveHover': before == after,
        'pageErrors': len(errors),
    })
    browser.close()
