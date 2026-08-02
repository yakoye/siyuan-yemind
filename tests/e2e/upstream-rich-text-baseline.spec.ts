import { expect, test } from '@playwright/test';

test.describe('official simple-mind-map rich-text baseline', () => {
  test('keeps the upstream editor geometry stable while its padded active outline appears', async ({ page }) => {
    await page.goto('/upstream-baseline.html');
    const node = page.locator('#upstream-baseline .smm-node').first();
    await expect(node).toBeVisible();

    const before = await node.evaluate((element) => {
      const shape = element.querySelector<SVGGraphicsElement>('.smm-node-shape');
      const hover = element.querySelector<SVGGraphicsElement>('.smm-hover-node');
      return {
        node: element.getBoundingClientRect().toJSON(),
        shape: shape?.getBoundingClientRect().toJSON(),
        hover: hover?.getBoundingClientRect().toJSON(),
      };
    });

    await node.dblclick();
    const editor = page.locator('.smm-richtext-node-edit-wrap .ql-editor');
    await expect(editor).toBeFocused();
    const after = await node.evaluate((element) => {
      const shape = element.querySelector<SVGGraphicsElement>('.smm-node-shape');
      const hover = element.querySelector<SVGGraphicsElement>('.smm-hover-node');
      return {
        node: element.getBoundingClientRect().toJSON(),
        shape: shape?.getBoundingClientRect().toJSON(),
        hover: hover?.getBoundingClientRect().toJSON(),
      };
    });

    expect(after.shape).toEqual(before.shape);
    expect(after.hover).not.toBeNull();
    expect(after.hover!.width).toBeGreaterThan(after.shape!.width);
    expect(after.hover!.height).toBeGreaterThan(after.shape!.height);
  });

  test('opens an immediately focused editor without a blank text frame', async ({ page }) => {
    await page.goto('/upstream-baseline.html');
    const canvas = page.locator('#upstream-baseline');
    const node = canvas.locator('.smm-node').first();

    await expect(canvas).toBeVisible();
    await expect(node).toContainText('PCIe RAS 与 LTSSM 状态分析');

    await page.evaluate(() => {
      const samples: Array<{ staticText: string; editorText: string }> = [];
      (window as any).__UPSTREAM_FRAME_SAMPLES__ = samples;
      let remaining = 30;
      const sample = () => {
        const nodeText = document.querySelector('.smm-node')?.textContent?.trim() ?? '';
        const editor = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap .ql-editor');
        const editorVisible = !!editor && getComputedStyle(editor).display !== 'none'
          && getComputedStyle(editor).visibility !== 'hidden';
        samples.push({
          staticText: nodeText,
          editorText: editorVisible ? editor.textContent?.trim() ?? '' : '',
        });
        remaining -= 1;
        if (remaining > 0) requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });

    await node.dblclick();
    const editor = page.locator('.smm-richtext-node-edit-wrap .ql-editor');
    await expect(editor).toBeVisible();
    await expect(editor).toBeFocused();
    await expect(editor).toContainText('PCIe RAS 与 LTSSM 状态分析');
    await expect.poll(() => editor.evaluate((element) => {
      const selection = window.getSelection();
      return Boolean(selection?.rangeCount && element.contains(selection.anchorNode));
    })).toBe(true);
    await page.waitForTimeout(550);

    const samples = await page.evaluate(() => (window as any).__UPSTREAM_FRAME_SAMPLES__ as Array<{
      staticText: string;
      editorText: string;
    }>);
    expect(samples.length).toBeGreaterThanOrEqual(20);
    expect(samples.every((sample) => sample.staticText || sample.editorText)).toBe(true);
  });

  test('keeps multiline wrapping stable while typing and closing', async ({ page }) => {
    await page.goto('/upstream-baseline.html');
    const node = page.locator('#upstream-baseline .smm-node').first();
    const before = await node.boundingBox();

    await node.dblclick();
    const editor = page.locator('.smm-richtext-node-edit-wrap .ql-editor');
    await editor.press('End');
    await editor.type('，错误注入与恢复');
    await expect(editor).toContainText('错误注入与恢复');

    await page.locator('#upstream-baseline').click({ position: { x: 20, y: 20 } });
    await expect(editor).toBeHidden();
    await expect(node).toContainText('错误注入与恢复');
    const after = await node.boundingBox();

    expect(before).not.toBeNull();
    expect(after).not.toBeNull();
    expect(after!.height).toBeGreaterThanOrEqual(before!.height);
  });
});
