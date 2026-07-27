import { expect, test } from '@playwright/test';
import { expectInsideViewport, resetWebApp } from './helpers';

test('keeps blank-canvas menus inside desktop and compact viewports', async ({ page }) => {
  await resetWebApp(page);
  const canvas = page.locator('.ymz-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    button: 'right',
    position: { x: Math.max(10, box!.width - 12), y: Math.max(10, box!.height - 12) },
  });
  await expect(page.locator('.ymw-menu')).toBeVisible();
  await expectInsideViewport(page, '.ymw-menu');
});

test('mobile sidebar remains explicitly discoverable and closable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only contract');
  await resetWebApp(page);
  const app = page.locator('.ymw-app');
  const toggle = page.locator('[data-web-action="toggle-sidebar"]');
  await expect(toggle).toBeVisible();
  await toggle.click();
  await expect(app).toHaveClass(/is-sidebar-open/);
  await toggle.click();
  await expect(app).not.toHaveClass(/is-sidebar-open/);
});
