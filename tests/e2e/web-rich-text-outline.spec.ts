import { expect, test } from '@playwright/test';
import { resetWebApp } from './helpers';

async function addRootChild(page: import('@playwright/test').Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-map"]').click();
  await editor.locator('.smm-node').first().click();
  const addChild = editor.locator('[data-node-quick-action="add-child"]').first();
  await expect(addChild).toBeVisible();
  await addChild.click();
}

async function commitCanvasEdit(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('.ymw-editor > .ymz-editor [data-role="canvas"]');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: {
      x: Math.max(16, box!.width - 24),
      y: Math.max(80, box!.height - 90),
    },
  });
  await expect(page.locator('.smm-richtext-node-edit-wrap .ql-editor')).toBeHidden();
}

async function expectQuickActionsAnchored(
  node: import('@playwright/test').Locator,
  actions: import('@playwright/test').Locator,
): Promise<void> {
  const nodeBox = await node.boundingBox();
  const actionBox = await actions.boundingBox();
  expect(nodeBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  const side = await actions.getAttribute('data-quick-side');
  const nodeCenterX = nodeBox!.x + nodeBox!.width / 2;
  const nodeCenterY = nodeBox!.y + nodeBox!.height / 2;
  const actionCenterX = actionBox!.x + actionBox!.width / 2;
  const actionCenterY = actionBox!.y + actionBox!.height / 2;
  if (side === 'left') {
    expect(Math.abs(actionBox!.x + actionBox!.width - nodeBox!.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterY - nodeCenterY)).toBeLessThanOrEqual(3);
  } else if (side === 'top') {
    expect(Math.abs(actionBox!.y + actionBox!.height - nodeBox!.y)).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterX - nodeCenterX)).toBeLessThanOrEqual(3);
  } else if (side === 'bottom') {
    expect(Math.abs(actionBox!.y - (nodeBox!.y + nodeBox!.height))).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterX - nodeCenterX)).toBeLessThanOrEqual(3);
  } else {
    expect(Math.abs(actionBox!.x - (nodeBox!.x + nodeBox!.width))).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterY - nodeCenterY)).toBeLessThanOrEqual(3);
  }
}

test('plain canvas editing keeps one measurement path and stable node geometry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill('中心主题稳定尺寸');
  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('中心主题稳定尺寸');
  const first = await rootNode.boundingBox();
  expect(first).not.toBeNull();

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toContainText('中心主题稳定尺寸');
  await commitCanvasEdit(page);
  const second = await rootNode.boundingBox();
  expect(second).not.toBeNull();
  expect(Math.abs(second!.width - first!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(second!.height - first!.height)).toBeLessThanOrEqual(1);
});

test('opening a multiline canvas editor does not jump between stale and live placement', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit-placement regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill('Power Good\nReference Clock\nPLL Lock\nController Reset Release');
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  const placements = await editor.locator('.smm-richtext-node-edit-wrap').evaluate(async (element) => {
    const result: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (let index = 0; index < 6; index += 1) {
      const rect = element.getBoundingClientRect();
      result.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return result;
  });
  const spread = (key: keyof (typeof placements)[number]) =>
    Math.max(...placements.map((item) => item[key])) - Math.min(...placements.map((item) => item[key]));
  expect(spread('x')).toBeLessThanOrEqual(1);
  expect(spread('y')).toBeLessThanOrEqual(1);
  expect(spread('width')).toBeLessThanOrEqual(1);
  expect(spread('height')).toBeLessThanOrEqual(1);
});

test('a newly inserted child receives one stable final editor placement', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inserted-node placement regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const editWrap = editor.locator('.smm-richtext-node-edit-wrap');
  await expect(editWrap).toBeVisible();
  const placements = await editWrap.evaluate(async (element) => {
    const result: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < 6; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const rect = element.getBoundingClientRect();
      result.push({ x: rect.x, y: rect.y });
    }
    return result;
  });
  const tail = placements.slice(1);
  expect(Math.max(...tail.map((item) => item.x)) - Math.min(...tail.map((item) => item.x)))
    .toBeLessThanOrEqual(1);
  expect(Math.max(...tail.map((item) => item.y)) - Math.min(...tail.map((item) => item.y)))
    .toBeLessThanOrEqual(1);
});

test('one Delete or Backspace removes a selected multiline canvas range', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop keyboard-selection regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

  for (const key of ['Delete', 'Backspace']) {
    await rootNode.dblclick();
    await textEditor.fill('第一行\n第二行\n第三行');
    await textEditor.press('Control+A');
    await textEditor.press(key);
    await expect(textEditor).toHaveText('');
    await textEditor.fill(`下一轮-${key}`);
    await commitCanvasEdit(page);
  }
});

test('width-handle drag grows the live node monotonically without disappearing or jumping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer-geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill('准备：\nLTSSM 状态读取及历史记录；\n当前 Link Speed、Link Width；\nLane 状态和 PHY PLL/CDR 状态；');
  await commitCanvasEdit(page);
  await rootNode.click();

  const handles = rootNode.locator('rect[style*="ew-resize"]');
  await expect(handles).toHaveCount(2);
  const handle = handles.last();
  const handleBox = await handle.boundingBox();
  const before = await rootNode.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(before).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  const widths = [before!.width];
  const tops = [before!.y];
  for (let step = 1; step <= 5; step += 1) {
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + step * 24,
      handleBox!.y + handleBox!.height / 2,
      { steps: 1 },
    );
    const box = await rootNode.boundingBox();
    expect(box).not.toBeNull();
    widths.push(box!.width);
    tops.push(box!.y);
  }
  await page.mouse.up();
  for (let index = 1; index < widths.length; index += 1) {
    expect(widths[index]).toBeGreaterThanOrEqual(widths[index - 1] - 1);
  }
  expect(widths.at(-1)!).toBeGreaterThan(widths[0] + 80);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
  await expect(rootNode).toBeVisible();
});

test('dragging a parent previews its visible descendants as one coherent subtree', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop structural-drag regression');
  await resetWebApp(page);
  await addRootChild(page);
  await commitCanvasEdit(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const nodes = editor.locator('.smm-node');
  await nodes.nth(1).click();
  await editor.locator('[data-node-quick-action="add-child"]').first().click();
  await commitCanvasEdit(page);
  await expect(nodes).toHaveCount(3);

  const parent = nodes.nth(1);
  const box = await parent.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 + 45, { steps: 6 });
  const preview = editor.locator('.ymz-drag-subtree-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('data-preview-node-count', '2');
  await expect(preview.locator('.smm-node')).toHaveCount(2);
  await page.mouse.up();
});

test('canvas paste keeps the live node border aligned with the growing text editor', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit-geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill('编辑态');
  await textEditor.press('End');
  await textEditor.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '、静态和大纲态统一使用归一化结果。');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await expect(textEditor).toContainText('编辑态、静态和大纲态统一使用归一化结果。');

  const editBox = await editor.locator('.smm-richtext-node-edit-wrap').boundingBox();
  const borderBox = await rootNode.locator('.smm-hover-node').boundingBox();
  expect(editBox).not.toBeNull();
  expect(borderBox).not.toBeNull();
  const editCenterX = editBox!.x + editBox!.width / 2;
  const borderCenterX = borderBox!.x + borderBox!.width / 2;
  expect(Math.abs(borderCenterX - editCenterX)).toBeLessThanOrEqual(2);
  expect(borderBox!.x).toBeLessThanOrEqual(editBox!.x + 2);
  expect(borderBox!.x + borderBox!.width).toBeGreaterThanOrEqual(editBox!.x + editBox!.width - 2);
  expect(borderBox!.width - editBox!.width).toBeLessThanOrEqual(24);
  expect(borderBox!.height - editBox!.height).toBeGreaterThanOrEqual(-2);
  expect(borderBox!.height - editBox!.height).toBeLessThanOrEqual(16);
});

test('outline text transactions keep node count, canvas geometry and quick-action anchoring stable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop split-view regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childUid = await childRow.getAttribute('data-outline-uid');
  expect(childUid).toBeTruthy();
  const childText = childRow.locator('[data-outline-editor]');
  await childText.fill('访问、启动、建链、枚举、传输');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  const canvasChild = editor.locator('.smm-node').filter({ hasText: '访问、启动、建链、枚举、传输' });
  await expect(canvasChild).toHaveCount(1);
  const textBox = await canvasChild.boundingBox();
  expect(textBox).not.toBeNull();
  expect(textBox!.width).toBeGreaterThan(40);
  expect(textBox!.width).toBeLessThan(500);

  await childText.click();
  const actions = editor.locator(`.ymz-node-quick-actions[data-node-uid="${childUid}"]`);
  await expect(actions).toBeVisible();
  await expectQuickActionsAnchored(canvasChild, actions);

  await childText.fill('43243');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  await expect(canvasChild).toHaveCount(0);
  const numericChild = editor.locator('.smm-node').filter({ hasText: '43243' });
  await expect(numericChild).toHaveCount(1);
  await childText.click();
  await expect(actions).toBeVisible();
  await expectQuickActionsAnchored(numericChild, actions);
});

test('outline paste trims browser boundary blank lines and Delete removes the pasted text completely', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop split-view regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childText = editor.locator('[data-outline-drag-source="true"]').first().locator('[data-outline-editor]');
  await childText.fill('准备替换');
  await childText.click();
  await childText.evaluate((element) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再\n\n');
    transfer.setData('text/html', '<p>\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再</p>');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('[data-outline-drag-source="true"]')).toHaveCount(1);
  await expect(childText).toHaveText('这表示该计划范围已落地，但不等于 YeMind 后续不会再');
  expect(await childText.evaluate((element) => element.textContent?.includes('\n') ?? false)).toBe(false);

  await childText.click({ clickCount: 3 });
  const toolbar = editor.locator('.ymz-rich-toolbar');
  await expect(toolbar).toBeVisible();
  await expect(toolbar).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(toolbar).toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Delete');
  await expect(childText).toHaveText('');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
});

test('fast reverse outline selection can overshoot the left grip and still Delete the selected text', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer-selection regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childText = childRow.locator('[data-outline-editor]');
  const grip = childRow.locator('[data-outline-drag-handle]');
  const textBox = await childText.boundingBox();
  const gripBox = await grip.boundingBox();
  expect(textBox).not.toBeNull();
  expect(gripBox).not.toBeNull();

  const y = textBox!.y + textBox!.height / 2;
  await page.mouse.move(textBox!.x + textBox!.width - 2, y);
  await page.mouse.down();
  await page.mouse.move(gripBox!.x + gripBox!.width / 2, y, { steps: 1 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? ''))
    .not.toBe('');

  await page.keyboard.press('Delete');
  await expect(childText).toHaveText('');
});

test('canvas selected text keeps its range while every direct format control runs', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('.smm-node').first().dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeVisible();
  await textEditor.selectText();
  const toolbar = editor.locator('.ymz-rich-toolbar');
  await expect(toolbar).toBeVisible();

  await toolbar.locator('[data-rich-action="bold"]').click();
  await expect(textEditor.locator('strong')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="italic"]').click();
  await expect(textEditor.locator('em')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="underline"]').click();
  await expect(textEditor.locator('u')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="strike"]').click();
  await expect(textEditor.locator('s')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="inline-code"]').click();
  await expect(textEditor.locator('code')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="color-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(textEditor.locator('[style*="color: rgb(255, 77, 61)"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(textEditor.locator('[style*="background-color: rgb(255, 77, 61)"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-field="size"]').selectOption('18px');
  await expect(textEditor.locator('[style*="font-size: 18px"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-field="font"]').selectOption('serif');
  await expect(textEditor.locator('[style*="font-family: serif"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(textEditor.locator('[style*="color: transparent"]')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(textEditor.locator('[style*="color: transparent"]')).toHaveCount(0);

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="clear"]').click();
  await expect.poll(() => textEditor.evaluate((element) =>
    element.querySelectorAll('strong, em, u, s, code, a, span[style]').length,
  )).toBe(0);
});

test('outline selection toolbar formats text and its context menu edits and deletes the requested row', async ({ page }) => {
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childText = childRow.locator('[data-outline-editor]');
  await childText.click({ clickCount: 3 });
  const toolbar = editor.locator('.ymz-rich-toolbar');
  await expect(toolbar).toBeVisible();
  await toolbar.locator('[data-rich-action="bold"]').click();
  await expect(childText.locator('b, strong')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="italic"]').click();
  await expect(childText.locator('i, em')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="underline"]').click();
  await expect(childText.locator('u')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="strike"]').click();
  await expect(childText.locator('strike, s')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="inline-code"]').click();
  await expect(childText.locator('code')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="color-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(childText.locator('[color="#ff4d3d"], [style*="255, 77, 61"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(childText.locator('[style*="background-color: rgb(255, 77, 61)"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-field="size"]').selectOption('18px');
  await expect(childText.locator('[style*="font-size: 18px"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-field="font"]').selectOption('serif');
  await expect(childText.locator('[style*="font-family: serif"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(childText.locator('[style*="transparent"]')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(childText.locator('[data-yemind-cloze]')).toHaveCount(0);

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="clear"]').click();
  await expect.poll(() => childText.evaluate((element) => {
    const textNode = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
    const style = getComputedStyle(textNode?.parentElement ?? element);
    return {
      bold: Number.parseInt(style.fontWeight, 10) >= 600,
      italic: style.fontStyle === 'italic',
      decorated: /underline|line-through/.test(style.textDecorationLine),
      transparent: style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)',
    };
  })).toEqual({ bold: false, italic: false, decorated: false, transparent: false });

  await childRow.click({ button: 'right' });
  const menu = page.locator('.ymw-menu');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: '编辑节点' }).click();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? '')).not.toBe('');
  await page.keyboard.type('编辑后节点');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(childText).toContainText('编辑后节点');

  await childRow.click({ button: 'right' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: '删除当前行和子级' }).click();
  await expect(editor.locator('[data-outline-drag-source="true"]')).toHaveCount(0);
});

test('canvas link, code-block and formula dialogs commit against the saved text range', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  const toolbar = editor.locator('.ymz-rich-toolbar');

  await editor.locator('.smm-node').first().dblclick();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="link"]').click();
  let dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="inline-link"]').fill('example.com');
  await dialog.locator('[data-action="save"]').click();
  await expect(textEditor.locator('a')).toHaveAttribute('href', /https:\/\/example\.com/);

  await editor.locator('.smm-node').first().dblclick();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="code-block"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="code"]').fill('const answer = 42;');
  await dialog.locator('[data-action="save"]').click();
  await expect(textEditor.locator('.ql-code-block')).toContainText('const answer = 42;');

  await editor.locator('.smm-node').first().dblclick();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="formula"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="formula"]').fill('e=mc^2');
  await dialog.locator('[data-dialog-action="save"]').click();
  await expect(textEditor.locator('.ql-formula')).toHaveAttribute('data-value', 'e=mc^2');
});

test('outline link, code-block and formula dialogs commit against the saved text range', async ({ page }) => {
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childText = editor.locator('[data-outline-drag-source="true"]').first().locator('[data-outline-editor]');
  const toolbar = editor.locator('.ymz-rich-toolbar');

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="link"]').click();
  let dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="inline-link"]').fill('example.com');
  await dialog.locator('[data-action="save"]').click();
  await expect(childText.locator('a')).toHaveAttribute('href', /https:\/\/example\.com/);

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="code-block"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="code"]').fill('const answer = 42;');
  await dialog.locator('[data-action="save"]').click();
  await expect(childText.locator('pre')).toContainText('const answer = 42;');

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="formula"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="formula"]').fill('e=mc^2');
  await dialog.locator('[data-dialog-action="save"]').click();
  await expect(childText.locator('.ql-formula')).toHaveAttribute('data-value', 'e=mc^2');
});
