import { expect, test } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

const canvasEditor = (page: import('@playwright/test').Page) => (
  page.locator('body > .smm-richtext-node-edit-wrap .ql-editor')
);

type ViewportFrame = {
  scrollLeft: number;
  scrollTop: number;
  transform: string;
};

async function readViewportFrame(
  page: import('@playwright/test').Page,
): Promise<ViewportFrame> {
  return page.locator('.ymw-editor > .ymz-editor').evaluate((element) => ({
    scrollLeft: element.scrollLeft,
    scrollTop: element.scrollTop,
    transform: element.querySelector('.smm-container')?.getAttribute('transform') ?? '',
  }));
}

async function startViewportFrameCapture(
  page: import('@playwright/test').Page,
  frameCount = 50,
): Promise<void> {
  await page.evaluate((count) => {
    const frames: ViewportFrame[] = [];
    let remaining = count;
    const capture = (): void => {
      const shell = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor');
      frames.push({
        scrollLeft: shell?.scrollLeft ?? 0,
        scrollTop: shell?.scrollTop ?? 0,
        transform: shell?.querySelector('.smm-container')?.getAttribute('transform') ?? '',
      });
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    (window as any).__yemindViewportFrames = frames;
    requestAnimationFrame(capture);
  }, frameCount);
}

async function expectStableViewportFrames(
  page: import('@playwright/test').Page,
  before: ViewportFrame,
): Promise<void> {
  await page.waitForTimeout(900);
  const frames = await page.evaluate(() => (
    (window as any).__yemindViewportFrames as ViewportFrame[]
  ));
  expect(frames.length).toBeGreaterThanOrEqual(35);
  expect(frames.every((frame) => (
    frame.scrollLeft === before.scrollLeft
    && frame.scrollTop === before.scrollTop
    && frame.transform === before.transform
  ))).toBe(true);
}

test.describe('YeMind upstream-owned canvas text lifecycle', () => {
  test('keeps the fixed text editor outside the map scroll container without moving the viewport', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop canvas text lifecycle');
    await resetWebApp(page);
    const shell = page.locator('.ymw-editor > .ymz-editor');
    const node = shell.locator('.smm-node').first();
    const before = await readViewportFrame(page);
    await startViewportFrameCapture(page);

    await node.dblclick();

    const host = page.locator('.smm-richtext-node-edit-wrap');
    await expect(host).toBeVisible();
    expect(await host.evaluate((element) => element.parentElement === document.body)).toBe(true);
    await expectStableViewportFrames(page, before);
  });

  test('opens the upstream editor in its configured host without a blank text frame', async ({ page, isMobile }) => {
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
    await expect.poll(() => editor.evaluate((element) => {
      const selection = window.getSelection();
      return Boolean(selection?.rangeCount && element.contains(selection.anchorNode));
    })).toBe(true);
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
    await expect.poll(() => editor.evaluate((element) => {
      const selection = window.getSelection();
      return Boolean(selection?.rangeCount && element.contains(selection.anchorNode));
    })).toBe(true);
    expect(errors).toEqual([]);
  });

  test('switches edited nodes without a transient viewport jump', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop canvas text lifecycle');
    await resetWebApp(page);
    const shell = page.locator('.ymw-editor > .ymz-editor');
    const nodes = shell.locator('.smm-node');
    await nodes.first().click();
    await page.keyboard.press('Tab');
    await expect(canvasEditor(page)).toBeFocused();
    await canvasEditor(page).press('Control+A');
    await canvasEditor(page).fill('第二节点');
    await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
    await expect(nodes).toHaveCount(2);
    await nodes.first().dblclick();
    await expect(canvasEditor(page)).toBeFocused();
    const secondText = (await nodes.last().textContent())?.trim() ?? '';
    const before = await readViewportFrame(page);
    await startViewportFrameCapture(page);

    await nodes.last().dblclick();

    await expect(canvasEditor(page)).toBeFocused();
    await expect(canvasEditor(page)).toContainText(secondText);
    await expectStableViewportFrames(page, before);
  });

  test('commits a resized node as one geometry state before opening another editor', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop atomic text/geometry handoff');
    await resetWebApp(page);
    const shell = page.locator('.ymw-editor > .ymz-editor');
    const nodes = shell.locator('.smm-node');
    const editor = canvasEditor(page);
    await nodes.first().click();
    await page.keyboard.press('Tab');
    await editor.fill('第一节点');
    await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
    await expect(nodes.filter({ hasText: '第一节点' })).toBeVisible();
    await nodes.first().click();
    await page.keyboard.press('Tab');
    await editor.fill('第二节点');
    await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
    await expect(nodes.filter({ hasText: '第二节点' })).toBeVisible();

    const first = nodes.filter({ hasText: '第一节点' });
    const second = nodes.filter({ hasText: '第二节点' });
    await first.dblclick();
    await editor.fill('第一节点修改为一段明显更长、会改变节点尺寸并触发布局的内容');
    await shell.locator('.ymz-rich-toolbar').evaluate((element) => {
      (element as HTMLElement).style.pointerEvents = 'none';
    });
    await page.evaluate(() => {
      const frames: Array<{
        editorVisible: boolean;
        staticVisible: boolean;
        staticRect: { left: number; top: number; width: number; height: number } | null;
      }> = [];
      let remaining = 60;
      const capture = (): void => {
        const editor = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
        const editorStyle = editor ? getComputedStyle(editor) : null;
        const editorVisible = Boolean(
          editor
          && editor.checkVisibility({ checkVisibilityCSS: true })
          && editorStyle?.display !== 'none'
          && editorStyle?.visibility !== 'hidden'
          && editor.getBoundingClientRect().width > 0
          && editor.textContent?.includes('第一节点修改为一段明显更长'),
        );
        const target = Array.from(document.querySelectorAll<SVGGraphicsElement>('.smm-node'))
          .find((element) => element.textContent?.includes('第一节点修改为一段明显更长'));
        const staticText = target?.querySelector<HTMLElement>('.smm-richtext-node-wrap') ?? null;
        const staticStyle = staticText ? getComputedStyle(staticText) : null;
        const staticVisible = Boolean(
          staticText
          && staticText.checkVisibility({ checkVisibilityCSS: true })
          && staticStyle?.display !== 'none'
          && staticStyle?.visibility !== 'hidden'
          && staticText.getBoundingClientRect().width > 0,
        );
        const rect = staticVisible ? staticText!.getBoundingClientRect() : null;
        frames.push({
          editorVisible,
          staticVisible,
          staticRect: rect
            ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height }
            : null,
        });
        remaining -= 1;
        if (remaining > 0) requestAnimationFrame(capture);
      };
      (window as any).__yemindAtomicGeometryFrames = frames;
      requestAnimationFrame(capture);
    });

    await second.dblclick();
    await expect(editor).toBeFocused();
    await expect(editor).toContainText('第二节点');
    await page.waitForTimeout(1000);
    const frames = await page.evaluate(() => (
      (window as any).__yemindAtomicGeometryFrames as Array<{
        editorVisible: boolean;
        staticVisible: boolean;
        staticRect: { left: number; top: number; width: number; height: number } | null;
      }>
    ));
    expect(frames.length).toBeGreaterThanOrEqual(45);
    expect(frames.filter((frame) => !frame.editorVisible && !frame.staticVisible)).toEqual([]);
    const staticRects = frames.flatMap((frame) => frame.staticRect ? [frame.staticRect] : []);
    expect(staticRects.length).toBeGreaterThan(0);
    const finalRect = staticRects.at(-1)!;
    const misplaced = staticRects.filter((rect) => (
      Math.abs(rect.left - finalRect.left) > 1
      || Math.abs(rect.top - finalRect.top) > 1
      || Math.abs(rect.width - finalRect.width) > 1
      || Math.abs(rect.height - finalRect.height) > 1
    ));
    expect(misplaced, JSON.stringify({ finalRect, misplaced }, null, 2)).toEqual([]);
  });

  test('deleting a node does not scroll the map shell', async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop canvas deletion lifecycle');
    await resetWebApp(page);
    const shell = page.locator('.ymw-editor > .ymz-editor');
    const nodes = shell.locator('.smm-node');
    await nodes.first().click();
    await page.keyboard.press('Tab');
    await expect(canvasEditor(page)).toBeFocused();
    await canvasEditor(page).pressSequentially('待删除节点');
    await shell.locator('[data-role="canvas"]').click({ position: { x: 24, y: 90 } });
    await expect(canvasEditor(page)).toBeHidden();
    const countBefore = await nodes.count();
    const before = await readViewportFrame(page);
    await nodes.filter({ hasText: '待删除节点' }).click();
    await startViewportFrameCapture(page);

    await page.keyboard.press('Delete');

    await expect(nodes).toHaveCount(countBefore - 1);
    await expectStableViewportFrames(page, before);
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
