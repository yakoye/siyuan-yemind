import { expect, test } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

test('creates, renames and restores a map from IndexedDB', async ({ page, isMobile }) => {
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  await expect(page.locator('[data-web-map-id]')).toHaveCount(1);
  if (isMobile) await page.locator('[data-web-action="toggle-sidebar"]').click();
  await page.locator('[data-web-action="new-map"]').click();
  await expect(page.locator('[data-web-map-id]')).toHaveCount(2);

  page.once('dialog', async (dialog) => dialog.accept('浏览器验收导图'));
  await page.locator('[data-web-map-id]').last().locator('[data-web-action="rename-map"]').click();
  await expect(page.locator('[data-web-map-id]').last().locator('strong')).toHaveText('浏览器验收导图');
  await page.reload();
  await expect(page.locator('[data-web-map-id]').last().locator('strong')).toHaveText('浏览器验收导图');
  expect(errors).toEqual([]);
});

test('switches map, split and outline views without losing the editor', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-split"]').click();
  await expect(editor).toHaveAttribute('data-view', 'split');
  await editor.locator('[data-action="view-outline"]').click();
  await expect(editor).toHaveAttribute('data-view', 'outline');
  await expect(editor.locator('[data-role="outline"]')).toBeVisible();
  await editor.locator('[data-action="view-map"]').click();
  await expect(editor).toHaveAttribute('data-view', 'map');
});

test('cycles appearance and reveals the outline drag grip only on approach', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const appearance = editor.locator('[data-action="cycle-appearance"]');
  await appearance.click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await appearance.click();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');

  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click();
  const addChild = editor.locator('[data-node-quick-action="add-child"]').first();
  await expect(addChild).toBeVisible();
  await addChild.click();
  await editor.locator('[data-action="view-outline"]').click();
  const handle = editor.locator('[data-outline-drag-source="true"] [data-outline-drag-handle]').first();
  const grip = handle.locator('.ymz-outline-drag-grip');
  await expect(handle).toBeVisible();
  await expect(grip).toHaveCSS('opacity', '0');
  await handle.hover();
  await expect(grip).toHaveCSS('opacity', '0.9');
});

test('keeps hidden toolbars discoverable through three edge markers', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="toggle-toolbar-pin"]').click();
  await expect(editor).toHaveAttribute('data-toolbars-pinned', 'false');
  await page.mouse.move(680, 380);
  await expect.poll(async () => editor.getAttribute('data-topbar-visible'), { timeout: 5_000 }).toBe('false');
  const edge = editor.locator('[data-toolbar-edge="top"]');
  await expect(edge).toBeVisible();
  const edgeBox = await edge.boundingBox();
  expect(edgeBox).not.toBeNull();
  await page.mouse.move(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  await expect(editor).toHaveAttribute('data-topbar-visible', 'true');
});
