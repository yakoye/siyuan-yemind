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

test('opens the outline sidebar and returns to the map without losing the editor', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();
  await expect(editor).toHaveAttribute('data-view', 'split');
  await expect(editor.locator('[data-role="outline"]')).toBeVisible();
  await editor.locator('[data-primary-view][data-action="view-map"]').click();
  await expect(editor).toHaveAttribute('data-view', 'map');
});

test('cycles appearance and reveals the outline drag grip only on approach', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const clickAppearance = async () => {
    if (await editor.locator('[data-action="cycle-appearance"]:visible').count() === 0) {
      await editor.locator('[data-action="toggle-top-overflow"]').click();
    }
    await editor.locator('[data-action="cycle-appearance"]:visible').click();
  };
  await clickAppearance();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await clickAppearance();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');

  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click();
  const addChild = editor.locator('[data-node-quick-action="add-child"]').first();
  await expect(addChild).toBeVisible();
  await addChild.click();
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();
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
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await editor.locator('[data-action="toggle-status-overflow"]').click();
  }
  await editor.locator('[data-action="toggle-toolbar-pin"]').click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(editor).toHaveAttribute('data-toolbars-pinned', 'false');
  await page.mouse.move(680, 380);
  await expect.poll(async () => editor.getAttribute('data-topbar-visible'), { timeout: 5_000 }).toBe('false');
  const edge = editor.locator('[data-toolbar-edge="top"]');
  await expect(edge).toBeVisible();
  const edgeBox = await edge.boundingBox();
  expect(edgeBox).not.toBeNull();
  const editorBox = await editor.boundingBox();
  expect(edgeBox!.width).toBeGreaterThan(editorBox!.width * 0.9);
  await expect(edge.locator('span')).toHaveCSS('height', '3px');
  await page.mouse.move(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  await expect(editor).toHaveAttribute('data-topbar-visible', 'true');
});

test('clears transient image and search overlays before opening cards', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const search = editor.locator('[data-action="open-search"]:visible');
  if (await search.count()) await search.click();
  else {
    await editor.locator('[data-action="toggle-top-overflow"]').click();
    await editor.locator('[data-action="open-search"]:visible').click();
  }
  await expect(editor.locator('[data-role="search-panel"]')).toBeVisible();
  await editor.evaluate((root) => {
    const frame = document.createElement('div');
    frame.className = 'ymz-node-image-frame';
    frame.dataset.mode = 'selected';
    frame.style.display = 'block';
    root.appendChild(frame);
    const popover = root.querySelector<HTMLElement>('.ymz-resource-action-popover');
    if (popover) popover.hidden = false;
  });

  await editor.locator('[data-primary-view][data-action="view-cards"]').click();
  await expect(editor).toHaveAttribute('data-study-view', 'cards');
  await expect(editor.locator('[data-role="search-panel"]')).toBeHidden();
  await expect(editor.locator('.ymz-resource-action-popover')).toBeHidden();
  await expect(editor.locator('.ymz-node-image-frame')).toHaveCSS('display', 'none');
});

test('renders and toggles the real minimap and exposes reset zoom', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const minimap = editor.locator('[data-role="minimap"]');
  const minimapToggle = editor.locator('[data-action="toggle-minimap"]');
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await editor.locator('[data-action="toggle-status-overflow"]').click();
    await expect(editor.getByRole('button', { name: '重置缩放' })).toBeVisible();
    await expect(minimapToggle).toBeVisible();
    await expect(minimap).toBeHidden();
  } else {
    await expect(editor.getByRole('button', { name: '重置缩放' })).toBeVisible();
    await expect(minimapToggle).toBeVisible();
    await expect(minimap).toBeVisible();
    await expect.poll(async () => minimap.locator('svg').count()).toBeGreaterThan(0);
    await minimapToggle.click();
    await expect(minimap).toBeHidden();
    await minimapToggle.click();
    await expect(minimap).toBeVisible();
  }
});
