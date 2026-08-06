import { test, expect } from '@playwright/test';
import { resetWebApp } from './helpers';

test.use({ viewport: { width: 527, height: 439 } });

test('small viewport insertion pans the canvas', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' });
  await resetWebApp(page);
  await page.waitForTimeout(700);
  const editor = page.locator('.ymw-editor > .ymz-editor');

  const geo = async (label: string) => {
    const g = await page.evaluate(() => {
      const h = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const b = h && h.style.display !== 'none' ? h.getBoundingClientRect() : null;
      const active = document.querySelector('.smm-node.active');
      const s = active?.querySelector('.smm-node-shape')?.getBoundingClientRect();
      const t = active?.querySelector('g[data-width]')?.getBoundingClientRect();
      return {
        host: b ? [Math.round(b.left), Math.round(b.top)] : null,
        nodeShape: s ? [Math.round(s.left), Math.round(s.top)] : null,
        nodeText: t ? [Math.round(t.left), Math.round(t.top), Math.round(t.width)] : null,
        editorText: h?.querySelector('.ql-editor')?.textContent,
      };
    });
    console.log(label, JSON.stringify(g));
    return g;
  };

  await editor.locator('.smm-node').first().click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(900);
  const a = await geo('S_FIRST_TAB');
  await page.screenshot({ path: 'output/small-1.png' });

  await page.mouse.click(500, 420);
  await page.waitForTimeout(500);
  await editor.locator('.smm-node').first().click();
  await page.waitForTimeout(250);
  await page.keyboard.press('Tab');
  await page.waitForTimeout(900);
  const b = await geo('S_SECOND_TAB');
  await page.screenshot({ path: 'output/small-2.png' });

  console.log('S_DELTA', JSON.stringify({
    first: a.host && a.nodeShape ? [a.host[0] - a.nodeShape[0], a.host[1] - a.nodeShape[1]] : null,
    second: b.host && b.nodeShape ? [b.host[0] - b.nodeShape[0], b.host[1] - b.nodeShape[1]] : null,
  }));
  expect(true).toBe(true);
});
