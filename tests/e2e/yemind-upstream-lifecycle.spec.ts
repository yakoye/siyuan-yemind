import { expect, test } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

const canvasEditor = (page: import('@playwright/test').Page) => (
  page.locator('body > .smm-richtext-node-edit-wrap .ql-editor')
);

test.describe('YeMind upstream-owned canvas text lifecycle', () => {
  test('opens the body-portal editor focused without a blank text frame', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop canvas text lifecycle');
    const errors = recordPageErrors(page);
    await resetWebApp(page);
    const node = page.locator('.ymw-editor > .ymz-editor .smm-node').first();
    const originalText = (await node.textContent())?.trim() ?? '';

    await page.evaluate(() => {
      const frames: Array<{ staticText: string; editorText: string; focused: boolean }> = [];
      let remaining = 40;
      const capture = (): void => {
        const node = document.querySelector('.ymw-editor > .ymz-editor .smm-node');
        const editor = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap .ql-editor');
        const editorStyle = editor ? getComputedStyle(editor) : null;
        const editorVisible = Boolean(editor
          && editorStyle?.display !== 'none'
          && editorStyle?.visibility !== 'hidden'
          && editor.getBoundingClientRect().width > 0);
        frames.push({
          staticText: node?.textContent?.trim() ?? '',
          editorText: editorVisible ? editor?.textContent?.trim() ?? '' : '',
          focused: !editorVisible || document.activeElement === editor,
        });
        remaining -= 1;
        if (remaining > 0) requestAnimationFrame(capture);
      };
      (window as any).__yemindUpstreamFrames = frames;
      requestAnimationFrame(capture);
    });

    await node.dblclick();
    const editor = canvasEditor(page);
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(editor).toContainText(originalText);
    await page.waitForTimeout(700);

    const frames = await page.evaluate(() => (window as any).__yemindUpstreamFrames as Array<{
      staticText: string;
      editorText: string;
      focused: boolean;
    }>);
    expect(frames.length).toBeGreaterThanOrEqual(25);
    expect(frames.every((frame) => frame.staticText || frame.editorText)).toBe(true);
    expect(frames.filter((frame) => frame.editorText).every((frame) => frame.focused)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('types, closes and reopens through the upstream editor without an extra click', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop canvas text lifecycle');
    const errors = recordPageErrors(page);
    await resetWebApp(page);
    const shell = page.locator('.ymw-editor > .ymz-editor');
    const node = shell.locator('.smm-node').first();
    const editor = canvasEditor(page);

    await node.dblclick();
    await expect(editor).toBeFocused();
    await editor.press('Control+A');
    await editor.pressSequentially('上游生命周期连续输入123', { delay: 35 });
    await expect(editor).toHaveText('上游生命周期连续输入123');

    await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
    await expect(editor).toBeHidden();
    await expect(node).toContainText('上游生命周期连续输入123');

    await node.dblclick();
    await expect(editor).toBeFocused();
    await expect(editor).toHaveText('上游生命周期连续输入123');
    expect(errors).toEqual([]);
  });

  for (const shortcut of ['Tab', 'Enter'] as const) {
    test(`${shortcut} creates one node through the upstream inserting editor with immediate text and caret`, async ({
      page,
      isMobile,
    }) => {
      test.skip(isMobile, 'desktop inserted-node lifecycle');
      const errors = recordPageErrors(page);
      await resetWebApp(page);
      const shell = page.locator('.ymw-editor > .ymz-editor');
      const nodes = shell.locator('.smm-node');
      await nodes.first().click();
      if (shortcut === 'Enter') {
        await page.keyboard.press('Tab');
        await expect(canvasEditor(page)).toBeFocused();
        await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
        await expect(canvasEditor(page)).toBeHidden();
        await nodes.last().click();
      }
      const originalCount = await nodes.count();

      await page.keyboard.press(shortcut);

      const editor = canvasEditor(page);
      await expect(editor).toBeVisible();
      await expect(editor).toBeFocused();
      await expect(editor).toHaveText('新节点');
      await expect(nodes).toHaveCount(originalCount + 1);
      await editor.pressSequentially('已编辑', { delay: 20 });
      await expect(editor).toContainText('已编辑');
      expect(errors).toEqual([]);
    });
  }
});
