import { expect, test } from '@playwright/test';
import { resetWebApp } from './helpers';

test('exposes the complete shared export catalog and import accept list', async ({ page, isMobile }) => {
  await resetWebApp(page);
  if (isMobile) await page.locator('[data-action="toggle-top-overflow"]').click();
  await page.locator('[data-action="export-file"]:visible').click();
  const panel = page.locator('[data-role="export-panel"]');
  await expect(panel).toBeVisible();
  for (const extension of [
    '.yemind.svg', '.svg', '.kmindz', '.yemind.zip',
    '.md', '.opml', '.xmind', '.png', '.txt', '.html', '.pdf',
  ]) {
    await expect(panel.getByText(extension, { exact: true }).first()).toBeVisible();
  }
  await expect(panel.getByText('.yemind.svg', { exact: true })).toHaveCount(2);
  await expect(panel.getByText('.html', { exact: true })).toHaveCount(2);
  const accept = await page.locator('[data-role="import-file-input"]').getAttribute('accept');
  for (const extension of ['.kmindz', '.svg', '.png', '.zip', '.xmind', '.kmind', '.json', '.md', '.opml', '.txt', '.mm']) {
    expect(accept).toContain(extension);
  }
});
