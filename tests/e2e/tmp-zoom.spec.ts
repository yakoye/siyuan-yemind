import { test, expect } from '@playwright/test';
import { resetWebApp } from './helpers';

test.use({ viewport: { width: 643, height: 702 } });

test('insertion at a zoomed-out canvas', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await resetWebApp(page);
  await page.waitForTimeout(700);
  const editor = page.locator('.ymw-editor > .ymz-editor');

  const zoomOut = editor.locator('[data-action="zoom-out"]').first();
  await expect(zoomOut).toBeVisible();
  for (let i = 0; i < 4; i += 1) { await zoomOut.click(); await page.waitForTimeout(180); }
  const zoom = await page.evaluate(() => document.querySelector('.ymz-editor [data-role="zoom-percent"],.ymz-editor [data-action="zoom-reset"]')?.textContent);
  console.log('Z_ZOOM', zoom);

  // Build a few children so the tree extends past the small viewport.
  for (let i = 0; i < 4; i += 1) {
    await editor.locator('.smm-node').first().click();
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(700);
    await page.keyboard.press('Escape');
    await page.mouse.click(600, 660);
    await page.waitForTimeout(350);
  }

  // Push the map to the right edge so the next inserted child lands outside
  // the viewport and checkNodeOuter() has to pan the canvas to reveal it.
  await page.mouse.move(320, 350);
  await page.mouse.wheel(-900, 0);
  await page.waitForTimeout(500);
  const rootBefore = await page.evaluate(() => {
    const r = document.querySelector('.smm-node .smm-node-shape')?.getBoundingClientRect();
    return r ? [Math.round(r.left), Math.round(r.top)] : null;
  });
  console.log('Z_ROOT_BEFORE', JSON.stringify(rootBefore));

  await editor.locator('.smm-node').first().click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(900);

  const g = await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
    const b = h && h.style.display !== 'none' ? h.getBoundingClientRect() : null;
    const t = document.querySelector('.smm-node.active g[data-width]')?.getBoundingClientRect();
    return {
      host: b ? [Math.round(b.left), Math.round(b.top)] : null,
      hostStyleLeftTop: [h?.style.left, h?.style.top],
      nodeText: t ? [Math.round(t.left), Math.round(t.top)] : null,
      editorText: h?.querySelector('.ql-editor')?.textContent,
    };
  });
  console.log('Z_GEO', JSON.stringify(g));
  console.log('Z_DELTA', JSON.stringify(g.host && g.nodeText ? [g.host[0] - g.nodeText[0], g.host[1] - g.nodeText[1]] : null));
  await page.screenshot({ path: 'output/zoom-insert.png' });
  expect(true).toBe(true);
});
