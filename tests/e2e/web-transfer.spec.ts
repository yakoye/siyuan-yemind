import { expect, test } from '@playwright/test';
import { resetWebApp } from './helpers';

test('exposes the complete shared export catalog and import accept list', async ({ page }) => {
  await resetWebApp(page);
  await page.locator('[data-action="export-file"]').click();
  const panel = page.locator('[data-role="export-panel"]');
  await expect(panel).toBeVisible();
  for (const extension of [
    '.yemind.svg', '.yemindz.svg', '.svg', '.kmindz', '.yemindz.zip',
    '.md', '.opml', '.xmind', '.png', '.txt', '.html', '.pdf',
  ]) {
    await expect(panel.getByText(extension, { exact: true })).toBeVisible();
  }
  const accept = await page.locator('[data-role="import-file-input"]').getAttribute('accept');
  for (const extension of ['.kmindz', '.svg', '.png', '.zip', '.xmind', '.kmind', '.json', '.md', '.opml', '.txt', '.mm']) {
    expect(accept).toContain(extension);
  }
});
