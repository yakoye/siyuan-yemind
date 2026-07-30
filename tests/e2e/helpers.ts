import { expect, type Page } from '@playwright/test';

export async function resetWebApp(page: Page): Promise<void> {
  await page.goto('/');
  await expect(page).toHaveTitle(/YeMind/);
  const origin = new URL(page.url()).origin;
  await page.goto('about:blank');
  const session = await page.context().newCDPSession(page);
  await session.send('Storage.clearDataForOrigin', {
    origin,
    storageTypes: 'indexeddb,local_storage',
  });
  await session.detach();
  await page.goto('/');
  await expect(page).toHaveTitle(/YeMind/);
  await expect(page.locator('.ymw-app')).toBeVisible();
  await expect(page.locator('.ymw-editor > .ymz-editor')).toBeVisible();
}

export function recordPageErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') {
      const location = message.location();
      errors.push(location.url ? `${message.text()} (${location.url})` : message.text());
    }
  });
  return errors;
}

export async function expectInsideViewport(page: Page, selector: string): Promise<void> {
  const box = await page.locator(selector).boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.x).toBeGreaterThanOrEqual(0);
  expect(box!.y).toBeGreaterThanOrEqual(0);
  expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width);
  expect(box!.y + box!.height).toBeLessThanOrEqual(viewport!.height);
}
