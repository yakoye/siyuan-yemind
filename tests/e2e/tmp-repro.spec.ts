import { test, expect } from '@playwright/test';
import { resetWebApp } from './helpers';

test('build a tree like the report and look at it', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await resetWebApp(page);
  await page.waitForTimeout(700);
  const editor = page.locator('.ymw-editor > .ymz-editor');

  const dump = async (label: string) => {
    const state = await page.evaluate(() => ({
      nodes: document.querySelectorAll('.smm-node').length,
      containers: document.querySelectorAll('.smm-container').length,
      nodeContainers: document.querySelectorAll('.smm-node-container').length,
      svgs: document.querySelectorAll('.ymz-canvas svg').length,
      hosts: document.querySelectorAll('.smm-richtext-node-edit-wrap').length,
      canvases: document.querySelectorAll('.ymz-canvas').length,
      editors: document.querySelectorAll('.ymz-editor').length,
    }));
    console.log(label, JSON.stringify(state));
  };

  // Grow the tree the way the report did: repeated Tab/Enter inserts.
  await editor.locator('.smm-node').first().click();
  for (let i = 0; i < 4; i += 1) {
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);
    await page.mouse.click(1250, 700);
    await page.waitForTimeout(350);
    await editor.locator('.smm-node').first().click();
    await page.waitForTimeout(200);
  }
  await dump('R_AFTER_TABS');

  // Now insert one more and leave the editor open, like the screenshot.
  await editor.locator('.smm-node').nth(2).click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(800);

  const geo = await page.evaluate(() => {
    const h = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
    const b = h?.getBoundingClientRect();
    const active = document.querySelector('.smm-node.active');
    const s = active?.querySelector('.smm-node-shape')?.getBoundingClientRect();
    return {
      host: b ? [Math.round(b.left), Math.round(b.top), Math.round(b.width), Math.round(b.height)] : null,
      nodeShape: s ? [Math.round(s.left), Math.round(s.top), Math.round(s.width), Math.round(s.height)] : null,
      editorText: h?.querySelector('.ql-editor')?.textContent,
    };
  });
  console.log('R_GEO', JSON.stringify(geo));
  await dump('R_WITH_EDITOR_OPEN');
  await page.screenshot({ path: 'output/repro-open.png', fullPage: false });
  expect(true).toBe(true);
});
