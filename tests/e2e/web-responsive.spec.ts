import { expect, test } from '@playwright/test';
import { expectInsideViewport, resetWebApp } from './helpers';

test('keeps blank-canvas menus inside desktop and compact viewports', async ({ page }) => {
  await resetWebApp(page);
  const canvas = page.locator('.ymz-canvas');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    button: 'right',
    position: { x: Math.max(10, box!.width - 12), y: Math.max(10, box!.height - 60) },
  });
  await expect(page.locator('.ymw-menu')).toBeVisible();
  await expectInsideViewport(page, '.ymw-menu');
});

test('mobile sidebar remains explicitly discoverable and closable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'mobile-only contract');
  await resetWebApp(page);
  const app = page.locator('.ymw-app');
  const toggle = page.locator('[data-web-action="toggle-sidebar"]');
  const mapView = page.locator('[data-primary-view][data-action="view-map"]');
  await expect(toggle).toBeVisible();
  const [toggleBox, mapBox] = await Promise.all([toggle.boundingBox(), mapView.boundingBox()]);
  expect(toggleBox).not.toBeNull();
  expect(mapBox).not.toBeNull();
  expect(toggleBox!.x + toggleBox!.width).toBeLessThanOrEqual(mapBox!.x);
  await toggle.click();
  await expect(app).toHaveClass(/is-sidebar-open/);
  await toggle.click();
  await expect(app).not.toHaveClass(/is-sidebar-open/);
});

test('keeps the version47 shell complete at all five release widths', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-desktop', 'one five-width pass is sufficient');
  for (const width of [1440, 1280, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 800 });
    await resetWebApp(page);
    const editor = page.locator('.ymw-editor > .ymz-editor');
    const topbar = editor.locator('.ymz-topbar');
    const statusbar = editor.locator('.ymz-statusbar');
    await expect(topbar).toBeVisible();
    await expect(statusbar).toBeVisible();
    const shell = await editor.evaluate((root) => {
      const bounds = root.getBoundingClientRect();
      const inspect = (selector: string) => {
        const element = root.querySelector<HTMLElement>(selector)!;
        const rect = element.getBoundingClientRect();
        const visibleControls = Array.from(element.querySelectorAll<HTMLElement>('button,input'))
          .filter((control) => {
            const style = getComputedStyle(control);
            const controlRect = control.getBoundingClientRect();
            return style.display !== 'none' && style.visibility !== 'hidden' && controlRect.width > 0;
          })
          .map((control) => {
            const controlRect = control.getBoundingClientRect();
            return {
              label: control.getAttribute('aria-label') ?? control.title,
              left: controlRect.left,
              right: controlRect.right,
            };
          });
        return {
          clientWidth: element.clientWidth,
          scrollWidth: element.scrollWidth,
          left: rect.left,
          right: rect.right,
          visibleControls,
        };
      };
      return {
        editorWidth: bounds.width,
        left: bounds.left,
        right: bounds.right,
        top: inspect('.ymz-topbar'),
        bottom: inspect('.ymz-statusbar'),
      };
    });
    expect(shell.top.scrollWidth, `topbar overflow at ${width}px`).toBeLessThanOrEqual(shell.top.clientWidth + 1);
    expect(shell.bottom.scrollWidth, `statusbar overflow at ${width}px`).toBeLessThanOrEqual(shell.bottom.clientWidth + 1);
    for (const bar of [shell.top, shell.bottom]) {
      for (const control of bar.visibleControls) {
        expect(control.left, `${control.label} starts outside ${width}px`).toBeGreaterThanOrEqual(shell.left - 1);
        expect(control.right, `${control.label} ends outside ${width}px`).toBeLessThanOrEqual(shell.right + 1);
      }
    }
    if (shell.editorWidth <= 820) {
      await expect(editor.locator('[data-action="toggle-top-overflow"]')).toBeVisible();
    }
    if (shell.editorWidth <= 620) {
      const statusOverflow = editor.locator('[data-action="toggle-status-overflow"]');
      await expect(statusOverflow).toBeVisible();
      await statusOverflow.click();
      await expect(editor.locator('[data-role="status-overflow-menu"]')).toBeVisible();
      await expectInsideViewport(page, '[data-role="status-overflow-menu"]');
      await page.keyboard.press('Escape');
      await expect(editor).toHaveAttribute('data-status-overflow-open', 'false');
    }
    await page.screenshot({ path: testInfo.outputPath(`shell-${width}.png`), fullPage: true });
  }
});
