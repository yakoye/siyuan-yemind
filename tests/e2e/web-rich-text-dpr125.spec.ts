import { expect, test } from '@playwright/test';
import { resetWebApp } from './helpers';

test.use({ deviceScaleFactor: 1.25 });

const editorRoot = (page: import('@playwright/test').Page) => page.locator('.ymw-editor > .ymz-editor');
const canvasEditor = (page: import('@playwright/test').Page) => page.locator('body > .smm-richtext-node-edit-wrap .ql-editor');

async function commitEdit(page: import('@playwright/test').Page): Promise<void> {
  const canvas = editorRoot(page).locator('[data-role="canvas"]');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width - 30, y: box!.height - 100 } });
  await expect(canvasEditor(page)).toBeHidden();
}

test('DPR 1.25 keeps the live editor glyph anchored to the static node content box', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop DPR regression');
  await resetWebApp(page);
  const root = editorRoot(page).locator('.smm-node').first();
  const live = canvasEditor(page);
  const text = '电源、参考时钟、PERST#\n↓\nPCIe 子系统时钟和复位释放\n↓\n内部 PLL Lock';

  await root.dblclick();
  await live.fill(text);
  await commitEdit(page);

  const before = await root.evaluate((element) => {
    const shape = element.querySelector<SVGGraphicsElement>('.smm-node-shape')!;
    const content = element.querySelector<SVGGraphicsElement>('g[data-width][data-height]')!;
    const painted = content.firstElementChild as SVGGraphicsElement;
    const shapeRect = shape.getBoundingClientRect();
    const textRect = painted.getBoundingClientRect();
    return { x: textRect.left - shapeRect.left, y: textRect.top - shapeRect.top };
  });

  await root.dblclick();
  await expect(live).toBeVisible();
  const frames = await page.evaluate(async () => {
    const values: Array<{ x: number; y: number; text: string }> = [];
    for (let index = 0; index < 12; index += 1) {
      const node = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor .smm-node')!;
      const shape = node.querySelector<SVGGraphicsElement>('.smm-node-shape')!;
      const liveEditor = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap .ql-editor')!;
      const range = document.createRange();
      range.selectNodeContents(liveEditor);
      const glyph = Array.from(range.getClientRects()).find((rect) => rect.width > 0 && rect.height > 0)!;
      const shapeRect = shape.getBoundingClientRect();
      values.push({
        x: glyph.left - shapeRect.left,
        y: glyph.top - shapeRect.top,
        text: liveEditor.innerText
          .split(/\n/)
          .filter((line) => line.length > 0)
          .join('\n')
          .trim(),
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return values;
  });

  expect(frames).toHaveLength(12);
  frames.forEach((frame) => {
    expect(frame.text).toBe(text);
    expect(Math.abs(frame.x - before.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.y - before.y)).toBeLessThanOrEqual(1);
  });
});

test('DPR 1.25 width drag keeps painted text anchored inside the shape on every frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop DPR regression');
  await resetWebApp(page);
  const root = editorRoot(page).locator('.smm-node').first();
  const live = canvasEditor(page);
  await root.dblclick();
  await live.fill('准备：\nLTSSM 状态读取及历史记录；\n当前 Link Speed、Link Width；\nLane 状态和 PHY PLL/CDR 状态；\n是否卡在 Detect、Polling.Active；');
  await commitEdit(page);
  await root.click();

  const handle = root.locator('rect[style*="ew-resize"]').last();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.evaluate(() => {
    const node = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor .smm-node')!;
    const content = node.querySelector<SVGGraphicsElement>('g[data-width][data-height]')!;
    const painted = content.firstElementChild as SVGGraphicsElement;
    const frames: Array<{
      phase: 'drag' | 'released';
      x: number;
      y: number;
      shapeWidth: number;
      shapeHeight: number;
      textWidth: number;
      textHeight: number;
      text: string;
      sameContent: boolean;
      samePainted: boolean;
    }> = [];
    (window as any).__yemindDprDragFrames = frames;
    (window as any).__yemindDprDragContent = content;
    (window as any).__yemindDprDragPainted = painted;
    (window as any).__yemindDprDragDetachCount = 0;
    (window as any).__yemindDprDragPhase = 'drag';
    const observer = new MutationObserver((records) => {
      for (const record of records) {
        for (const removed of Array.from(record.removedNodes)) {
          if (removed === content || (removed instanceof Element && removed.contains(content))) {
            (window as any).__yemindDprDragDetachCount += 1;
          }
        }
      }
    });
    observer.observe(node, { childList: true, subtree: true });
    (window as any).__yemindDprDragObserver = observer;
    (window as any).__yemindDprDragActive = true;
    const capture = (): void => {
      if (!(window as any).__yemindDprDragActive) return;
      const node = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor .smm-node');
      const shape = node?.querySelector<SVGGraphicsElement>('.smm-node-shape');
      const content = node?.querySelector<SVGGraphicsElement>('g[data-width][data-height]');
      const painted = content?.firstElementChild as SVGGraphicsElement | null;
      if (shape && content && painted) {
        const shapeRect = shape.getBoundingClientRect();
        const textRect = painted.getBoundingClientRect();
        frames.push({
          phase: (window as any).__yemindDprDragPhase,
          x: textRect.left - shapeRect.left,
          y: textRect.top - shapeRect.top,
          shapeWidth: shapeRect.width,
          shapeHeight: shapeRect.height,
          textWidth: textRect.width,
          textHeight: textRect.height,
          text: content.textContent ?? '',
          sameContent: content === (window as any).__yemindDprDragContent,
          samePainted: painted === (window as any).__yemindDprDragPainted,
        });
      }
      requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  });

  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + 180, box!.y + box!.height / 2, { steps: 24 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.evaluate(() => { (window as any).__yemindDprDragPhase = 'released'; });
  await page.mouse.up();
  await page.evaluate(() => new Promise<void>((resolve) => {
    let remaining = 8;
    const next = (): void => {
      remaining -= 1;
      if (remaining <= 0) resolve();
      else requestAnimationFrame(next);
    };
    requestAnimationFrame(next);
  }));
  const result = await page.evaluate(() => {
    (window as any).__yemindDprDragActive = false;
    (window as any).__yemindDprDragObserver.disconnect();
    return {
      detachCount: (window as any).__yemindDprDragDetachCount as number,
      frames: (window as any).__yemindDprDragFrames as Array<{
        phase: 'drag' | 'released';
        x: number;
        y: number;
        shapeWidth: number;
        shapeHeight: number;
        textWidth: number;
        textHeight: number;
        text: string;
        sameContent: boolean;
        samePainted: boolean;
      }>,
    };
  });
  const { frames, detachCount } = result;

  expect(frames.length).toBeGreaterThan(3);
  expect(detachCount).toBe(0);
  expect(Math.max(...frames.map((frame) => frame.x)) - Math.min(...frames.map((frame) => frame.x)))
    .toBeLessThanOrEqual(1);
  expect(Math.max(...frames.map((frame) => frame.y)) - Math.min(...frames.map((frame) => frame.y)))
    .toBeLessThanOrEqual(1);
  frames.forEach((frame) => {
    expect(frame.text).toContain('LTSSM 状态读取及历史记录');
    expect(frame.sameContent).toBe(true);
    expect(frame.samePainted).toBe(true);
  });
  const finalDragFrame = frames.filter((frame) => frame.phase === 'drag').at(-1)!;
  const releasedFrames = frames.filter((frame) => frame.phase === 'released');
  expect(releasedFrames.length).toBeGreaterThanOrEqual(2);
  releasedFrames.forEach((frame) => {
    expect(Math.abs(frame.x - finalDragFrame.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.y - finalDragFrame.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.shapeWidth - finalDragFrame.shapeWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.shapeHeight - finalDragFrame.shapeHeight)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.textWidth - finalDragFrame.textWidth)).toBeLessThanOrEqual(1);
    expect(Math.abs(frame.textHeight - finalDragFrame.textHeight)).toBeLessThanOrEqual(1);
  });
  await expect(root).toContainText('LTSSM 状态读取及历史记录');
});
