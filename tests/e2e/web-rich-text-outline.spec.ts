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

test('outline paste treats browser soft wrapping as one node and Delete edits the saved text range', async ({ page, isMobile }) => {
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
    transfer.setData('text/plain', '浏览器软\n换行内容');
    transfer.setData('text/html', '<p>浏览器软换行内容</p>');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('[data-outline-drag-source="true"]')).toHaveCount(1);
  await expect(childText).toContainText('浏览器软换行内容');

  await childText.click({ clickCount: 3 });
  await expect(editor.locator('.ymz-rich-toolbar')).toBeVisible();
  await page.keyboard.press('Delete');
  await expect(childText).toHaveText('');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
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
