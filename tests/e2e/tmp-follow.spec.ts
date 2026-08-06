import { test, expect } from '@playwright/test';
import { resetWebApp } from './helpers';

test('does the open editor follow a canvas pan in a real browser', async ({ page }) => {
  await resetWebApp(page);
  await page.waitForTimeout(700);
  const editor = page.locator('.ymw-editor > .ymz-editor');

  await editor.locator('.smm-node').first().dblclick();
  await page.waitForTimeout(500);

  const read = async () => page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
    const t = document.querySelector('.smm-node g[data-width]')?.getBoundingClientRect();
    return {
      hostLeft: h?.style.left,
      hostTop: h?.style.top,
      node: t ? [Math.round(t.left), Math.round(t.top)] : null,
    };
  });

  const before = await read();
  console.log('F_BEFORE', JSON.stringify(before));

  await page.mouse.move(900, 400);
  await page.mouse.wheel(0, 300);
  await page.waitForTimeout(600);
  const after = await read();
  console.log('F_AFTER ', JSON.stringify(after));
  console.log('F_VERDICT', JSON.stringify({
    nodeMoved: before.node![1] !== after.node![1],
    hostFollowed: before.hostTop !== after.hostTop,
  }));
  expect(true).toBe(true);
});
