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
