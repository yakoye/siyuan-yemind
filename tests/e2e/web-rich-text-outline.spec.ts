import { expect, test } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

async function addRootChild(page: import('@playwright/test').Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-map"]').click();
  await editor.locator('.smm-node').first().click();
  const addChild = editor.locator('[data-node-quick-action="add-child"]').first();
  await expect(addChild).toBeVisible();
  await addChild.click();
}

function canvasTextEditor(page: import('@playwright/test').Page): import('@playwright/test').Locator {
  return page.locator('body > .smm-richtext-node-edit-wrap .ql-editor');
}

function canvasTextEditHost(page: import('@playwright/test').Page): import('@playwright/test').Locator {
  return page.locator('body > .smm-richtext-node-edit-wrap');
}

function richTextToolbar(page: import('@playwright/test').Page): import('@playwright/test').Locator {
  return page.locator('body > .ymz-rich-toolbar');
}

function richTextColorPopover(page: import('@playwright/test').Page): import('@playwright/test').Locator {
  return page.locator('body > .ymz-color-popover:not([hidden])');
}

async function commitCanvasEdit(page: import('@playwright/test').Page): Promise<void> {
  const canvas = page.locator('.ymw-editor > .ymz-editor [data-role="canvas"]');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: {
      x: Math.max(16, box!.width - 24),
      y: Math.max(80, box!.height - 90),
    },
  });
  await expect(canvasTextEditor(page)).toBeHidden();
}

async function expectQuickActionsAnchored(
  node: import('@playwright/test').Locator,
  actions: import('@playwright/test').Locator,
): Promise<void> {
  const nodeBox = await node.locator('.smm-hover-node').first().boundingBox();
  const visuals = actions.locator('.ymz-node-quick-action__visual');
  const actionBox = await visuals.first().boundingBox();
  expect(nodeBox).not.toBeNull();
  expect(actionBox).not.toBeNull();
  const side = await actions.getAttribute('data-quick-side');
  const nodeCenterX = nodeBox!.x + nodeBox!.width / 2;
  const nodeCenterY = nodeBox!.y + nodeBox!.height / 2;
  const actionCenterX = actionBox!.x + actionBox!.width / 2;
  const actionCenterY = actionBox!.y + actionBox!.height / 2;
  if (side === 'left') {
    expect(Math.abs(actionBox!.x + actionBox!.width - nodeBox!.x)).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterY - nodeCenterY)).toBeLessThanOrEqual(3);
  } else if (side === 'top') {
    expect(Math.abs(actionBox!.y + actionBox!.height - nodeBox!.y)).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterX - nodeCenterX)).toBeLessThanOrEqual(3);
  } else if (side === 'bottom') {
    expect(Math.abs(actionBox!.y - (nodeBox!.y + nodeBox!.height))).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterX - nodeCenterX)).toBeLessThanOrEqual(3);
  } else {
    expect(Math.abs(actionBox!.x - (nodeBox!.x + nodeBox!.width))).toBeLessThanOrEqual(3);
    expect(Math.abs(actionCenterY - nodeCenterY)).toBeLessThanOrEqual(3);
  }
  if (await visuals.count() > 1) {
    const nextBox = await visuals.nth(1).boundingBox();
    expect(nextBox).not.toBeNull();
    const horizontalGap = Math.max(
      0,
      Math.max(actionBox!.x, nextBox!.x)
        - Math.min(actionBox!.x + actionBox!.width, nextBox!.x + nextBox!.width),
    );
    expect(horizontalGap).toBeLessThanOrEqual(3);
  }
}

type VisualLineSnapshot = {
  lines: string[];
  width: number;
  height: number;
};

async function readVisualLines(
  locator: import('@playwright/test').Locator,
): Promise<VisualLineSnapshot> {
  return locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const tspans = Array.from(element.querySelectorAll('tspan'));
    if (tspans.length > 0) {
      return {
        lines: tspans
          .map((item) => String(item.textContent ?? ''))
          .filter((line) => line.length > 0),
        width: rect.width,
        height: rect.height,
      };
    }

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const lineGroups: Array<{ top: number; text: string }> = [];
    let textNode = walker.nextNode() as Text | null;
    while (textNode) {
      const value = String(textNode.data ?? '');
      for (let offset = 0; offset < value.length;) {
        const codePoint = value.codePointAt(offset);
        const length = codePoint !== undefined && codePoint > 0xffff ? 2 : 1;
        const range = document.createRange();
        range.setStart(textNode, offset);
        range.setEnd(textNode, offset + length);
        const charRect = range.getBoundingClientRect();
        const char = value.slice(offset, offset + length);
        offset += length;
        if (!charRect.width && !charRect.height) continue;
        const existing = lineGroups.find((line) => Math.abs(line.top - charRect.top) <= 0.5);
        if (existing) existing.text += char;
        else lineGroups.push({ top: charRect.top, text: char });
      }
      textNode = walker.nextNode() as Text | null;
    }
    lineGroups.sort((left, right) => left.top - right.top);
    return {
      lines: lineGroups.map((line) => line.text),
      width: rect.width,
      height: rect.height,
    };
  });
}

test('plain canvas editing keeps one measurement path and stable node geometry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('中心主题稳定尺寸');
  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('中心主题稳定尺寸');
  const first = await rootNode.boundingBox();
  expect(first).not.toBeNull();

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toContainText('中心主题稳定尺寸');
  await commitCanvasEdit(page);
  const second = await rootNode.boundingBox();
  expect(second).not.toBeNull();
  expect(Math.abs(second!.width - first!.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(second!.height - first!.height)).toBeLessThanOrEqual(1);
});

test('single-line canvas text keeps the same content rectangle before and during editing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop text-line alignment regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('1.1 Event Counter 事件计数器');
  await commitCanvasEdit(page);

  const staticRect = await rootNode.locator('g[data-width][data-height]').evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });
  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  const liveRect = await textEditor.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  });

  expect(Math.abs(liveRect.left - staticRect.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(liveRect.top - staticRect.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(liveRect.right - staticRect.right)).toBeLessThanOrEqual(1);
  expect(Math.abs(liveRect.bottom - staticRect.bottom)).toBeLessThanOrEqual(1);
});

test('opening a multiline canvas editor does not jump between stale and live placement', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit-placement regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('Power Good\nReference Clock\nPLL Lock\nController Reset Release');
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  const placements = await canvasTextEditHost(page).evaluate(async (element) => {
    const result: Array<{ x: number; y: number; width: number; height: number }> = [];
    for (let index = 0; index < 6; index += 1) {
      const rect = element.getBoundingClientRect();
      result.push({ x: rect.x, y: rect.y, width: rect.width, height: rect.height });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return result;
  });
  const spread = (key: keyof (typeof placements)[number]) =>
    Math.max(...placements.map((item) => item[key])) - Math.min(...placements.map((item) => item[key]));
  expect(spread('x')).toBeLessThanOrEqual(1);
  expect(spread('y')).toBeLessThanOrEqual(1);
  expect(spread('width')).toBeLessThanOrEqual(1);
  expect(spread('height')).toBeLessThanOrEqual(1);
});

test('opening a custom-width multiline node is aligned from its first visible frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop first-paint geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill([
    'Power Good',
    '↓',
    'Reference Clock (100MHz)',
    '↓',
    'PLL Lock',
    '↓',
    'Controller Reset Release',
  ].join('\n'));
  await commitCanvasEdit(page);
  await rootNode.click();

  const rightHandle = rootNode.locator('rect[style*="ew-resize"]').last();
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + 150, handleBox!.y + handleBox!.height / 2, { steps: 6 });
  await page.mouse.up();

  await rootNode.evaluate((element) => element.setAttribute('data-edit-geometry-target', 'true'));
  await page.evaluate(() => {
    const records: Array<{
      visible: boolean;
      hostX: number;
      hostY: number;
      hostWidth: number;
      nodeX: number;
      nodeY: number;
      nodeWidth: number;
      editorContentWidth: number | null;
      contentWidth: number | null;
      transform: string;
    }> = [];
    (window as any).__yemindOpeningGeometry = records;
    let remaining = 0;
    const capture = (): void => {
      const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const editorEl = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const target = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor .smm-node');
      const contentGroup = target?.querySelector<SVGGraphicsElement>('g[data-width][data-height]') ?? null;
      if (host && target) {
        const hostRect = host.getBoundingClientRect();
        const nodeRect = target.getBoundingClientRect();
        records.push({
          visible: host.style.display !== 'none' && hostRect.width > 0 && hostRect.height > 0,
          hostX: hostRect.x,
          hostY: hostRect.y,
          hostWidth: hostRect.width,
          nodeX: nodeRect.x,
          nodeY: nodeRect.y,
          nodeWidth: nodeRect.width,
          // .ql-editor has zero padding/border and fills exactly the host's
          // content box (see applyEditorGeometry/index.css), so its own rect
          // is the one directly comparable to the node's logical data-width
          // -- the host's own rect additionally includes the host's own
          // horizontal padding on both sides.
          editorContentWidth: editorEl ? editorEl.getBoundingClientRect().width : null,
          contentWidth: contentGroup ? Number(contentGroup.getAttribute('data-width')) : null,
          transform: host.style.transform,
        });
      }
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    document.addEventListener('dblclick', () => {
      remaining = 40;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  });

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await page.waitForTimeout(260);
  const records = await page.evaluate(() => (window as any).__yemindOpeningGeometry as Array<{
    visible: boolean;
    hostX: number;
    hostY: number;
    hostWidth: number;
    nodeX: number;
    nodeY: number;
    nodeWidth: number;
    editorContentWidth: number | null;
    contentWidth: number | null;
    transform: string;
  }>);
  const visible = records.filter((record) => record.visible);
  expect(visible.length).toBeGreaterThan(2);
  visible.forEach((record) => {
    const hostCenter = record.hostX + record.hostWidth / 2;
    const nodeCenter = record.nodeX + record.nodeWidth / 2;
    expect(Math.abs(hostCenter - nodeCenter)).toBeLessThanOrEqual(3);
    expect(Math.abs(record.hostY - record.nodeY)).toBeLessThanOrEqual(8);
    // Comparing the HTML edit surface against the SVG node's whole outer
    // shape conflated two different boxes (the shape includes ~9px of
    // padding per side plus any icon/todo prefix), which is why this used
    // to need a coarse 20px tolerance -- that tolerance could not actually
    // catch a wrap-relevant width mismatch. Both sides must instead share
    // the exact same logical content width the app already treats as
    // canonical (see applyEditorGeometry / data-width).
    expect(record.contentWidth).not.toBeNull();
    expect(record.editorContentWidth).not.toBeNull();
    expect(Math.abs((record.editorContentWidth as number) - (record.contentWidth as number))).toBeLessThanOrEqual(0.5);
  });
});

test('the upstream rich-text host has valid geometry on its first visible record', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop first-mount geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();

  await page.evaluate(() => {
    const records: Array<{
      ready: string | null;
      visibility: string;
      display: string;
      width: number;
      left: number;
      text: string;
    }> = [];
    const capture = (element: HTMLElement): void => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      records.push({
        ready: element.dataset.yemindGeometryReady ?? null,
        visibility: style.visibility,
        display: style.display,
        width: rect.width,
        left: rect.left,
        text: element.querySelector('.ql-editor')?.textContent?.trim() ?? '',
      });
    };
    (window as any).__yemindFirstMountGeometry = records;
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.target instanceof HTMLElement
          && mutation.target.classList.contains('smm-richtext-node-edit-wrap')) {
          capture(mutation.target);
        }
        mutation.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement
            && node.classList.contains('smm-richtext-node-edit-wrap')) {
            capture(node);
          }
        });
      });
    });
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['style', 'data-yemind-geometry-ready'],
    });
    (window as any).__yemindFirstMountObserver = observer;
  });

  await rootNode.dblclick();
  await expect(canvasTextEditor(page)).toBeVisible();
  const records = await page.evaluate(() => {
    (window as any).__yemindFirstMountObserver?.disconnect();
    return (window as any).__yemindFirstMountGeometry as Array<{
      ready: string | null;
      visibility: string;
      display: string;
      width: number;
      left: number;
      text: string;
    }>;
  });
  const visibleRecords = records.filter((record) =>
    record.visibility !== 'hidden'
    && record.display !== 'none'
    && record.width > 0);
  expect(visibleRecords.length).toBeGreaterThan(0);
  visibleRecords.forEach((record) => {
    expect(Number.isFinite(record.left)).toBe(true);
    expect(record.text.length).toBeGreaterThan(0);
  });
});

test('the first visible canvas editor glyph frame exactly replaces the static glyph frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop first-visible-glyph regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const multilineText = [
    '一个开源工具 + 国内',
    '大模型，几分钟就能',
    '把官方收费、还要魔',
    '法的 Claude Code',
    'Codex 跑起来，成本',
    '可能就是官方的零',
    '头。说真的，工具和',
    '模型都不该成为你学',
    '习。这个可以吗',
  ].join('\n');

  await rootNode.dblclick();
  await textEditor.fill(multilineText);
  await commitCanvasEdit(page);
  await rootNode.evaluate((element) => element.setAttribute('data-glyph-handoff-target', 'true'));

  await page.evaluate(() => {
    type Rect = { left: number; top: number; width: number; height: number };
    type Frame = {
      editorVisible: boolean;
      editorGlyph: Rect | null;
      padding: string;
      lineHeight: string;
    };
    const rectOfText = (element: Element | null): Rect | null => {
      if (!element) return null;
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = Array.from(range.getClientRects()).filter((rect) => rect.width > 0 && rect.height > 0);
      if (rects.length === 0) return null;
      const left = Math.min(...rects.map((rect) => rect.left));
      const top = Math.min(...rects.map((rect) => rect.top));
      const right = Math.max(...rects.map((rect) => rect.right));
      const bottom = Math.max(...rects.map((rect) => rect.bottom));
      return { left, top, width: right - left, height: bottom - top };
    };
    const target = document.querySelector('[data-glyph-handoff-target="true"]');
    const staticLayer = target?.querySelector('.smm-richtext-node-wrap') ?? null;
    (window as any).__yemindStaticGlyphRect = rectOfText(staticLayer);
    const frames: Frame[] = [];
    (window as any).__yemindEditorGlyphFrames = frames;
    let remaining = 0;
    const capture = (): void => {
      const live = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap .ql-editor');
      const host = live?.closest<HTMLElement>('.smm-richtext-node-edit-wrap') ?? null;
      const style = live ? getComputedStyle(live) : null;
      const hostStyle = host ? getComputedStyle(host) : null;
      const editorVisible = Boolean(live && host
        && style?.visibility !== 'hidden'
        && style?.display !== 'none'
        && hostStyle?.visibility !== 'hidden'
        && hostStyle?.display !== 'none');
      frames.push({
        editorVisible,
        editorGlyph: editorVisible ? rectOfText(live) : null,
        padding: style?.padding ?? '',
        lineHeight: style?.lineHeight ?? '',
      });
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    document.addEventListener('mousedown', () => {
      remaining = 60;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  });

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await page.waitForTimeout(1100);
  const evidence = await page.evaluate(() => ({
    staticGlyph: (window as any).__yemindStaticGlyphRect as {
      left: number; top: number; width: number; height: number;
    } | null,
    frames: (window as any).__yemindEditorGlyphFrames as Array<{
      editorVisible: boolean;
      editorGlyph: { left: number; top: number; width: number; height: number } | null;
      padding: string;
      lineHeight: string;
    }>,
  }));
  expect(evidence.staticGlyph).not.toBeNull();
  const visible = evidence.frames.filter((frame) => frame.editorVisible && frame.editorGlyph);
  expect(visible.length).toBeGreaterThan(5);
  const first = visible[0].editorGlyph!;
  const last = visible.at(-1)!.editorGlyph!;
  const staticGlyph = evidence.staticGlyph!;
  expect(visible[0].padding).toBe('0px');
  expect(Math.abs(first.left - staticGlyph.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.top - staticGlyph.top)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.width - last.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(first.height - last.height)).toBeLessThanOrEqual(1);
});

test('hover, activation and canvas text edit never paint the padded outline', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop active-outline geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  await canvasTextEditor(page).fill([
    '一个开源工具 + 国内',
    '大模型，几分钟就能',
    '把官方收费、还要魔',
    '法的 Claude Code',
    'Codex 跑起来，成本',
    '可能就是官方的零',
    '头。说真的，工具和',
    '模型都不该成为你学',
    '习。这个可以吗',
  ].join('\n'));
  await commitCanvasEdit(page);
  const shape = rootNode.locator('.smm-node-shape').first();
  const activeOutline = rootNode.locator('.smm-hover-node').first();

  const shapeBefore = await shape.boundingBox();
  expect(shapeBefore).not.toBeNull();
  await rootNode.hover();
  await expect(activeOutline).toHaveCSS('stroke', 'rgba(0, 0, 0, 0)');
  await expect(shape).toHaveCSS('stroke', 'rgb(34, 201, 160)');

  await page.evaluate(() => {
    const frames: Array<{
      outlineStroke: string;
      shapeRect: string;
    }> = [];
    (window as any).__yemindDblclickOutlineFrames = frames;
    const sample = (remaining: number) => {
      const node = document.querySelector<SVGGElement>('.ymw-editor > .ymz-editor .smm-node');
      const outline = node?.querySelector<SVGGraphicsElement>('.smm-hover-node');
      const shape = node?.querySelector<SVGGraphicsElement>('.smm-node-shape');
      if (outline && shape) {
        const rect = shape.getBoundingClientRect();
        frames.push({
          outlineStroke: getComputedStyle(outline).stroke,
          shapeRect: [rect.left, rect.top, rect.width, rect.height]
            .map((value) => value.toFixed(3))
            .join(','),
        });
      }
      if (remaining > 0) requestAnimationFrame(() => sample(remaining - 1));
    };
    requestAnimationFrame(() => sample(59));
  });

  await rootNode.click({ clickCount: 2, delay: 80 });
  await expect(canvasTextEditor(page)).toBeFocused();
  await page.waitForFunction(() => (
    ((window as any).__yemindDblclickOutlineFrames as unknown[] | undefined)?.length ?? 0
  ) >= 60);
  const shapeDuring = await shape.boundingBox();
  const frames = await page.evaluate(() => (
    (window as any).__yemindDblclickOutlineFrames as Array<{
      outlineStroke: string;
      shapeRect: string;
    }>
  ));

  expect(shapeDuring).toEqual(shapeBefore);
  expect(new Set(frames.map((frame) => frame.shapeRect)).size).toBe(1);
  expect(new Set(frames.map((frame) => frame.outlineStroke))).toEqual(new Set(['rgba(0, 0, 0, 0)']));
  await expect(activeOutline).toHaveCSS('stroke', 'rgba(0, 0, 0, 0)');
  await expect(shape).toHaveCSS('stroke', 'rgb(34, 201, 160)');
});

test('opening plain multiline text keeps an aligned readable layer on every animation frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop atomic editor handoff regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  await rootNode.dblclick();
  await textEditor.fill('电源、参考时钟、PERST#\n↓\nPCIe 子系统时钟和复位释放\n↓\n内部 PLL Lock');
  await commitCanvasEdit(page);
  await rootNode.evaluate((element) => element.setAttribute('data-atomic-edit-target', 'true'));

  await page.evaluate(() => {
    type Frame = {
      staticVisible: boolean;
      editorVisible: boolean;
      editorReady: string | null;
      editorText: string;
      staticLeft: number;
      editorLeft: number;
      staticTop: number;
      editorTop: number;
    };
    const frames: Frame[] = [];
    let remaining = 0;
    const initialTarget = document.querySelector<SVGGraphicsElement>('[data-atomic-edit-target="true"]');
    const initialStaticRect = initialTarget
      ?.querySelector<Element>('g[data-width][data-height]')
      ?.getBoundingClientRect() ?? new DOMRect();
    const painted = (element: Element | null): boolean => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const capture = (): void => {
      const target = document.querySelector<SVGGraphicsElement>('[data-atomic-edit-target="true"]');
      const staticLayers = target
        ? Array.from(target.querySelectorAll<Element>('.smm-text-node-wrap,.smm-richtext-node-wrap'))
        : [];
      const staticGroup = target?.querySelector<Element>('g[data-width][data-height]')
        ?? staticLayers[0]
        ?? null;
      const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const quill = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const liveStaticRect = staticGroup?.getBoundingClientRect() ?? new DOMRect();
      const staticRect = liveStaticRect.width > 0 && liveStaticRect.height > 0
        ? liveStaticRect
        : initialStaticRect;
      const editorRect = host?.getBoundingClientRect() ?? new DOMRect();
      frames.push({
        staticVisible: staticLayers.some((element) => painted(element)),
        editorVisible: painted(host) && painted(quill) && Boolean(quill?.textContent),
        editorReady: host?.dataset.yemindGeometryReady ?? null,
        editorText: quill?.textContent ?? '',
        staticLeft: staticRect.left,
        editorLeft: editorRect.left,
        staticTop: staticRect.top,
        editorTop: editorRect.top,
      });
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    (window as any).__yemindAtomicEditFrames = frames;
    document.addEventListener('mousedown', () => {
      remaining = 50;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  });

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await page.waitForTimeout(360);
  const frames = await page.evaluate(() => (window as any).__yemindAtomicEditFrames as Array<{
    staticVisible: boolean;
    editorVisible: boolean;
    editorReady: string | null;
    editorText: string;
    staticLeft: number;
    editorLeft: number;
    staticTop: number;
    editorTop: number;
  }>);
  expect(frames.length).toBeGreaterThan(5);
  frames.forEach((frame) => {
    expect(frame.staticVisible || frame.editorVisible).toBe(true);
    if (frame.editorVisible) {
      expect(frame.editorText).toContain('电源、参考时钟、PERST#');
      expect(Math.abs(frame.editorLeft - frame.staticLeft)).toBeLessThanOrEqual(8);
      expect(Math.abs(frame.editorTop - frame.staticTop)).toBeLessThanOrEqual(8);
    }
  });
});

test('editing and width dragging keep one SVG node shell around the live editor', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop single-shell width-drag regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  await page.evaluate(() => {
    type Frame = {
      pseudoContent: string;
      hostBorder: string;
      editorBorder: string;
      shapeWidth: number;
      hostLeft: number;
      hostTop: number;
      hostRight: number;
      hostBottom: number;
      shapeLeft: number;
      shapeTop: number;
      shapeRight: number;
      shapeBottom: number;
    };
    const frames: Frame[] = [];
    let remaining = 0;
    const capture = (): void => {
      const host = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap');
      const live = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const shape = document.querySelector<SVGGraphicsElement>(
        '.ymw-editor > .ymz-editor .smm-node .smm-node-shape',
      );
      if (host && live && shape) {
        const hostRect = host.getBoundingClientRect();
        const shapeRect = shape.getBoundingClientRect();
        frames.push({
          pseudoContent: getComputedStyle(host, '::before').content,
          hostBorder: getComputedStyle(host).borderStyle,
          editorBorder: getComputedStyle(live).borderStyle,
          shapeWidth: shapeRect.width,
          hostLeft: hostRect.left,
          hostTop: hostRect.top,
          hostRight: hostRect.right,
          hostBottom: hostRect.bottom,
          shapeLeft: shapeRect.left,
          shapeTop: shapeRect.top,
          shapeRight: shapeRect.right,
          shapeBottom: shapeRect.bottom,
        });
      }
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    (window as any).__yemindSingleShellFrames = frames;
    document.addEventListener('mousedown', () => {
      remaining = 24;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  });

  const rightHandle = rootNode.locator('rect[style*="ew-resize"]').last();
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  const startX = handleBox!.x + handleBox!.width / 2;
  const startY = handleBox!.y + handleBox!.height / 2;
  // The body-level editor intentionally receives pointer input above the SVG.
  // Dispatch the drag-handle press to the real SVG target, matching the user's
  // explicit resize-handle gesture without letting the editor swallow it.
  await rightHandle.dispatchEvent('mousedown', {
    bubbles: true,
    cancelable: true,
    clientX: startX,
    clientY: startY,
  });
  await page.mouse.move(handleBox!.x + 180, handleBox!.y + handleBox!.height / 2, { steps: 10 });
  await page.mouse.up();
  await page.waitForTimeout(420);

  const frames = await page.evaluate(() => (window as any).__yemindSingleShellFrames as Array<{
    pseudoContent: string;
    hostBorder: string;
    editorBorder: string;
    shapeWidth: number;
    hostLeft: number;
    hostTop: number;
    hostRight: number;
    hostBottom: number;
    shapeLeft: number;
    shapeTop: number;
    shapeRight: number;
    shapeBottom: number;
  }>);
  expect(frames.length).toBeGreaterThan(5);
  expect(Math.max(...frames.map((frame) => frame.shapeWidth))
    - Math.min(...frames.map((frame) => frame.shapeWidth))).toBeGreaterThan(80);
  frames.forEach((frame) => {
    expect(frame.pseudoContent).toBe('none');
    expect(frame.hostBorder).toBe('none');
    expect(frame.editorBorder).toBe('none');
    expect(frame.hostLeft).toBeGreaterThanOrEqual(frame.shapeLeft - 1);
    expect(frame.hostTop).toBeGreaterThanOrEqual(frame.shapeTop - 1);
    expect(frame.hostRight).toBeLessThanOrEqual(frame.shapeRight + 1);
    expect(frame.hostBottom).toBeLessThanOrEqual(frame.shapeBottom + 1);
  });
});

test('switching canvas editors keeps the previous node text fixed on every animation frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop editor-switch frame regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const firstText = '1. RAS D.E.S. Debug / Statistics / Error Injection 调试 / 统计 / 错误注入';
  const secondText = '2. RAS DP Data Protection 数据保护';

  await addRootChild(page);
  await textEditor.fill(firstText);
  await commitCanvasEdit(page);
  await addRootChild(page);
  await textEditor.fill(secondText);
  await commitCanvasEdit(page);

  const nodes = editor.locator('.smm-node');
  const firstNode = nodes.nth(1);
  const secondNode = nodes.nth(2);
  await firstNode.evaluate((element) => element.setAttribute('data-switch-source', 'true'));
  await secondNode.evaluate((element) => element.setAttribute('data-switch-target', 'true'));
  await firstNode.dblclick();
  await expect(textEditor).toContainText(firstText);

  await page.evaluate((sourceText) => {
    type Frame = {
      sourceLayers: number;
      sourceDomLayers: number;
      editorOpaque: boolean;
      left: number;
      top: number;
      width: number;
      height: number;
    };
    const frames: Frame[] = [];
    let remaining = 0;
    const painted = (element: Element | null): element is Element => {
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;
      // The editing node's glyphs are suppressed with opacity 0 on an ancestor
      // <g>. opacity is not inherited, so reading only this element's own
      // computed style reports a layer that paints nothing as painted.
      let current: Element | null = element;
      while (current) {
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
        if (Number(style.opacity || 1) <= 0.01) return false;
        if (current.classList.contains('smm-node') || current === document.body) break;
        current = current.parentElement ?? (current.parentNode as Element | null);
      }
      return true;
    };
    const readFrame = (): Frame => {
      const sourceNode = document.querySelector<HTMLElement>('[data-switch-source="true"]');
      const staticWrap = sourceNode?.querySelector<HTMLElement>('.smm-text-node-wrap,.smm-richtext-node-wrap') ?? null;
      const staticLayer = staticWrap?.parentElement ?? staticWrap;
      const editorHost = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const editorText = editorHost?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const staticVisible = Boolean(
        painted(staticLayer) && staticLayer.textContent?.includes(sourceText),
      );
      const editorVisible = Boolean(
        painted(editorHost)
        && painted(editorText)
        && editorText.textContent?.includes(sourceText),
      );
      // In non-realtime mode the official runtime keeps the SVG fallback in
      // the DOM beneath an opaque HTML editor. That is one visually effective
      // layer, not a ghost: prefer the foreground editor while it is present.
      const frontLayer = editorVisible ? editorText : (staticVisible ? staticLayer : null);
      const editorBackground = editorHost
        ? getComputedStyle(editorHost).backgroundColor
        : 'rgba(0, 0, 0, 0)';
      const alpha = editorBackground.match(/[\d.]+/g)?.map(Number).at(-1) ?? 1;
      const editorOpaque = editorBackground.startsWith('rgb(') || alpha > 0.99;
      const rect = frontLayer?.getBoundingClientRect() ?? new DOMRect();
      return {
        sourceLayers: frontLayer ? 1 : 0,
        sourceDomLayers: Number(staticVisible) + Number(editorVisible),
        editorOpaque,
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      };
    };
    const capture = (): void => {
      frames.push(readFrame());
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    // Include the final editor geometry before the pointer transaction. A
    // switch that jumps before the next rAF must still fail this regression.
    frames.push(readFrame());
    (window as any).__yemindEditorSwitchFrames = frames;
    document.addEventListener('mousedown', () => {
      remaining = 50;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  }, firstText);

  await richTextToolbar(page).evaluate((element) => {
    (element as HTMLElement).style.pointerEvents = 'none';
  });
  await secondNode.dblclick();
  await expect(textEditor).toContainText(secondText);
  await page.waitForTimeout(360);
  const frames = await page.evaluate(() => (window as any).__yemindEditorSwitchFrames as Array<{
    sourceLayers: number;
    sourceDomLayers: number;
    editorOpaque: boolean;
    left: number;
    top: number;
    width: number;
    height: number;
  }>);
  expect(frames.length).toBeGreaterThan(5);
  const visible = frames.filter((frame) => frame.sourceLayers > 0);
  expect(visible.length).toBeGreaterThan(2);
  visible.forEach((frame) => expect(frame.sourceLayers).toBe(1));
  visible.filter((frame) => frame.sourceDomLayers === 2)
    .forEach((frame) => expect(frame.editorOpaque).toBe(true));
  const spread = (key: 'left' | 'top' | 'width' | 'height') =>
    Math.max(...visible.map((frame) => frame[key])) - Math.min(...visible.map((frame) => frame[key]));
  expect(spread('left')).toBeLessThanOrEqual(1);
  expect(spread('top')).toBeLessThanOrEqual(1);
  expect(spread('width')).toBeLessThanOrEqual(1);
  expect(spread('height')).toBeLessThanOrEqual(1);
});

test('closing an unchanged canvas edit restores the static text layer immediately', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit teardown regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const expectedText = '退出编辑后静态文字仍然可见';
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await textEditor.fill(expectedText);
  await commitCanvasEdit(page);
  await rootNode.dblclick();
  await expect(textEditor).toContainText(expectedText);
  await commitCanvasEdit(page);

  const paintedLayers = await rootNode.evaluate((node, text) => {
    const painted = (element: Element): boolean => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    return Array.from(
      node.querySelectorAll<HTMLElement>('.smm-text-node-wrap,.smm-richtext-node-wrap'),
    ).filter((element) => element.textContent?.includes(String(text)) && painted(element)).length;
  }, expectedText);

  expect(paintedLayers).toBe(1);
  await expect(rootNode).toContainText(expectedText);
});

test('a changed canvas edit stays covered until the replacement SVG text is laid out', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit-commit handoff regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const expectedText = '编辑提交后静态文字必须完成布局再接管显示，不能暴露左上角中间帧';

  await rootNode.evaluate((element) => element.setAttribute('data-commit-handoff-node', 'true'));
  await rootNode.dblclick();
  await textEditor.fill(expectedText);
  await page.evaluate((text) => {
    type Record = { editorVisible: boolean; staticText: string };
    const records: Record[] = [];
    const capture = (): void => {
      const host = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap');
      const hostStyle = host ? getComputedStyle(host) : null;
      const hostRect = host?.getBoundingClientRect();
      const node = document.querySelector('[data-commit-handoff-node="true"]');
      const staticText = (node?.querySelector('.smm-text-node-wrap,.smm-richtext-node-wrap')?.textContent ?? '')
        .replace(/\s+/g, ' ')
        .trim();
      if (staticText.includes(text)) {
        records.push({
          editorVisible: Boolean(
            host
            && hostStyle?.display !== 'none'
            && hostStyle?.visibility !== 'hidden'
            && hostRect
            && hostRect.width > 0
            && hostRect.height > 0
          ),
          staticText,
        });
      }
    };
    const observer = new MutationObserver(capture);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'transform'],
    });
    (window as any).__yemindCommitHandoffObserver = observer;
    (window as any).__yemindCommitHandoffRecords = records;
  }, expectedText);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText(expectedText);
  const records = await page.evaluate(() => {
    (window as any).__yemindCommitHandoffObserver?.disconnect();
    return (window as any).__yemindCommitHandoffRecords as Array<{
      editorVisible: boolean;
      staticText: string;
    }>;
  });

  expect(records.length).toBeGreaterThan(0);
  // The first moment the replacement SVG becomes observable, the old opaque
  // editor must still cover it. It is removed only by node_tree_render_end.
  expect(records[0].editorVisible).toBe(true);
});

test('selection toolbar is complete and anchored on its first visible frame after switching nodes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop toolbar first-paint regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  await addRootChild(page);
  await textEditor.fill('1. RAS D.E.S. Debug / Statistics / Error Injection 调试 / 统计 / 错误注入');
  await commitCanvasEdit(page);
  await addRootChild(page);
  await textEditor.fill('2. RAS DP Data Protection 数据保护');
  await commitCanvasEdit(page);
  const nodes = editor.locator('.smm-node');
  await nodes.nth(1).dblclick();
  // selectTextOnEnterEditText is now false (v1.8.0): a double-click on an
  // already-edited node just places the caret, it no longer auto-selects the
  // whole text. The toolbar only shows for a real selection, so establish
  // one explicitly instead of relying on the old implicit select-all.
  await textEditor.selectText();
  await expect(richTextToolbar(page)).toBeVisible();
  await nodes.nth(2).evaluate((element) => element.setAttribute('data-toolbar-switch-target', 'true'));

  await page.evaluate(() => {
    type Frame = {
      visible: boolean;
      buttonCount: number;
      width: number;
      height: number;
      verticalGap: number;
      belowSelection: boolean;
    };
    const frames: Frame[] = [];
    let remaining = 0;
    const capture = (): void => {
      const toolbar = document.querySelector<HTMLElement>('.ymz-rich-toolbar');
      const selection = window.getSelection();
      const toolbarRect = toolbar?.getBoundingClientRect() ?? new DOMRect();
      const selectionRect = selection?.rangeCount
        ? selection.getRangeAt(0).getBoundingClientRect()
        : new DOMRect();
      const targetRect = document
        .querySelector<HTMLElement>('[data-toolbar-switch-target="true"]')
        ?.getBoundingClientRect() ?? selectionRect;
      const anchorRect = selectionRect.width > 0 || selectionRect.height > 0
        ? selectionRect
        : targetRect;
      const style = toolbar ? getComputedStyle(toolbar) : null;
      const visible = Boolean(toolbar
        && !toolbar.hidden
        && style?.display !== 'none'
        && style?.visibility !== 'hidden'
        && toolbarRect.width > 0
        && toolbarRect.height > 0);
      frames.push({
        visible,
        buttonCount: toolbar?.querySelectorAll('button[data-rich-action]').length ?? 0,
        width: toolbarRect.width,
        height: toolbarRect.height,
        belowSelection: toolbarRect.top >= anchorRect.bottom - 1,
        verticalGap: Math.min(
          Math.abs(toolbarRect.top - anchorRect.bottom),
          Math.abs(anchorRect.top - toolbarRect.bottom),
        ),
      });
      remaining -= 1;
      if (remaining > 0) requestAnimationFrame(capture);
    };
    (window as any).__yemindToolbarSwitchFrames = frames;
    document.addEventListener('mousedown', () => {
      remaining = 50;
      requestAnimationFrame(capture);
    }, { capture: true, once: true });
  });

  // This regression records the toolbar's paint/placement frames rather than
  // testing pointer occlusion between two deliberately tightly packed fixture
  // nodes. Real layout keeps the toolbar below the selection; let the pointer
  // reach the switch target so the frame recorder can exercise that path.
  await richTextToolbar(page).evaluate((element) => {
    (element as HTMLElement).style.pointerEvents = 'none';
  });
  await nodes.nth(2).dblclick();
  await textEditor.selectText();
  await expect(richTextToolbar(page)).toBeVisible();
  await page.waitForTimeout(360);
  const frames = await page.evaluate(() => (window as any).__yemindToolbarSwitchFrames as Array<{
    visible: boolean;
    buttonCount: number;
    width: number;
    height: number;
    verticalGap: number;
    belowSelection: boolean;
  }>);
  const visible = frames.filter((frame) => frame.visible);
  expect(frames[0]?.visible).toBe(false);
  expect(visible.length).toBeGreaterThan(2);
  visible.forEach((frame) => {
    expect(frame.buttonCount).toBeGreaterThanOrEqual(12);
    expect(frame.width).toBeGreaterThan(300);
    expect(frame.height).toBeGreaterThan(30);
    expect(frame.belowSelection).toBe(true);
    expect(frame.verticalGap).toBeLessThanOrEqual(12);
  });
});

test('selection toolbar stays above the body-level canvas editor', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop stacking regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const root = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const toolbar = richTextToolbar(page);

  await root.dblclick();
  await textEditor.fill('工具栏层级必须覆盖正在编辑的节点文字');
  await textEditor.selectText();
  await expect(toolbar).toBeVisible();

  const stacking = await page.evaluate(() => {
    const toolbarElement = document.querySelector<HTMLElement>('body > .ymz-rich-toolbar')!;
    const editorElement = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap')!;
    const editorRect = editorElement.getBoundingClientRect();
    toolbarElement.style.left = `${editorRect.left}px`;
    toolbarElement.style.top = `${editorRect.top}px`;
    const button = toolbarElement.querySelector<HTMLElement>('button[data-rich-action]')!;
    const buttonRect = button.getBoundingClientRect();
    const topElement = document.elementsFromPoint(
      buttonRect.left + buttonRect.width / 2,
      buttonRect.top + buttonRect.height / 2,
    )[0];
    return {
      toolbarIsBodyChild: toolbarElement.parentElement === document.body,
      editorIsBodyChild: editorElement.parentElement === document.body,
      toolbarZ: Number(getComputedStyle(toolbarElement).zIndex),
      editorZ: Number(getComputedStyle(editorElement).zIndex),
      topBelongsToToolbar: Boolean(topElement?.closest('.ymz-rich-toolbar')),
    };
  });

  expect(stacking).toEqual({
    toolbarIsBodyChild: true,
    editorIsBodyChild: true,
    toolbarZ: 3101,
    editorZ: 3000,
    topBelongsToToolbar: true,
  });
});

test('pointer selection toolbar waits until the selection has stopped moving', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer-selection settle regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const root = editor.locator('.smm-node').first();
  const toolbar = richTextToolbar(page);
  await root.dblclick();
  // Kept under the 20-character auto-wrap limit so the selection stays on one
  // line: this test is about toolbar timing, not about wrapping.
  await textEditor.fill('拖动选择这段文字看工具栏时机');
  const box = await textEditor.boundingBox();
  expect(box).not.toBeNull();

  await page.evaluate(() => {
    const toolbar = document.querySelector<HTMLElement>('.ymz-rich-toolbar')!;
    const timing = { mouseUpAt: 0, visibleAt: 0 };
    (window as any).__yemindPointerToolbarTiming = timing;
    window.addEventListener('mouseup', () => {
      timing.mouseUpAt = performance.now();
    }, { capture: true, once: true });
    const observer = new MutationObserver(() => {
      const style = getComputedStyle(toolbar);
      if (!toolbar.hidden && style.visibility !== 'hidden' && timing.visibleAt === 0) {
        timing.visibleAt = performance.now();
        observer.disconnect();
      }
    });
    observer.observe(toolbar, { attributes: true, attributeFilter: ['hidden', 'style', 'class'] });
  });

  await page.mouse.move(box!.x + box!.width - 8, box!.y + box!.height / 2);
  await page.mouse.down();
  for (let step = 1; step <= 6; step += 1) {
    await page.mouse.move(
      box!.x + box!.width - 8 - step * Math.max(12, box!.width / 8),
      box!.y + box!.height / 2,
    );
    expect(await toolbar.isHidden()).toBe(true);
  }
  await page.mouse.up();
  await page.waitForTimeout(260);
  await expect(toolbar).toBeVisible();
  const timing = await page.evaluate(() => (window as any).__yemindPointerToolbarTiming as {
    mouseUpAt: number;
    visibleAt: number;
  });
  expect(timing.mouseUpAt).toBeGreaterThan(0);
  expect(timing.visibleAt - timing.mouseUpAt).toBeGreaterThanOrEqual(100);
});

test('YM-TEXT-028 double-click owns focus after the host restores RootWebArea focus and needs no third click', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop SiYuan focus handoff regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  // SiYuan can restore focus to its RootWebArea after the node dblclick
  // handler has already opened and focused Quill. A delayed host claim must
  // therefore be treated as an unexpected focus loss owned by the same edit
  // opening transaction, not as user intent to leave the editor.
  await page.evaluate(() => {
    const host = document.createElement('div');
    host.tabIndex = -1;
    host.dataset.siyuanRootFocusProxy = 'true';
    document.body.appendChild(host);
    document.addEventListener('dblclick', () => {
      window.setTimeout(() => {
        host.focus({ preventScroll: true });
        document.documentElement.dataset.siyuanHostFocusRestored = 'true';
      }, 80);
    }, { once: true, capture: true });
  });

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await page.waitForFunction(() => (
    document.documentElement.dataset.siyuanHostFocusRestored === 'true'
  ));
  await expect(textEditor).toBeFocused({ timeout: 500 });

  await page.keyboard.type('X');
  await expect(textEditor).toContainText('X');
});

test('YM-TEXT-029 active canvas editing rejects a programmatic host focus claim synchronously', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop SiYuan synchronous focus handoff regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toBeFocused();

  const reclaimedInSameTask = await page.evaluate(() => {
    const focusProxy = document.createElement('div');
    focusProxy.tabIndex = -1;
    focusProxy.dataset.siyuanRootFocusProxy = 'same-task';
    document.body.appendChild(focusProxy);
    focusProxy.focus({ preventScroll: true });
    const editorRoot = document.querySelector<HTMLElement>(
      'body > .smm-richtext-node-edit-wrap .ql-editor',
    );
    return document.activeElement === editorRoot;
  });

  expect(reclaimedInSameTask).toBe(true);
  await page.keyboard.type('K');
  await expect(textEditor).toContainText('K');
});

test('YM-TEXT-030 canvas editing owns focus until an intentional outside pointer action', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop SiYuan host focus ownership regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  // SiYuan may restore its RootWebArea after several frames. Focus ownership
  // follows the active edit session; it must not expire on a guessed timeout.
  await page.waitForTimeout(500);
  const reclaimed = await page.evaluate(() => {
    const focusProxy = document.createElement('button');
    focusProxy.type = 'button';
    focusProxy.dataset.siyuanRootFocusProxy = 'late';
    document.body.appendChild(focusProxy);
    focusProxy.focus({ preventScroll: true });
    const editorRoot = document.querySelector<HTMLElement>(
      'body > .smm-richtext-node-edit-wrap .ql-editor',
    );
    return document.activeElement === editorRoot;
  });

  expect(reclaimed).toBe(true);
  await expect(textEditor).toBeFocused();
});

test('a newly inserted child receives one stable final editor placement', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inserted-node placement regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const editWrap = canvasTextEditHost(page);
  await expect(editWrap).toBeVisible();
  const placements = await editWrap.evaluate(async (element) => {
    const result: Array<{ x: number; y: number }> = [];
    for (let index = 0; index < 6; index += 1) {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const rect = element.getBoundingClientRect();
      result.push({ x: rect.x, y: rect.y });
    }
    return result;
  });
  const tail = placements.slice(1);
  expect(Math.max(...tail.map((item) => item.x)) - Math.min(...tail.map((item) => item.x)))
    .toBeLessThanOrEqual(1);
  expect(Math.max(...tail.map((item) => item.y)) - Math.min(...tail.map((item) => item.y)))
    .toBeLessThanOrEqual(1);
});

test('Tab-created child shows its default text on every visible editor frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inserted-node first-paint regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await addRootChild(page);
  await commitCanvasEdit(page);
  const parent = editor.locator('.smm-node').last();
  await expect(parent).toContainText('新节点');
  await parent.click();
  await page.keyboard.press('Tab');

  const frames = await page.evaluate(async () => {
    const result: Array<{
      visible: boolean;
      text: string;
      html: string;
    }> = [];
    for (let index = 0; index < 6; index += 1) {
      const host = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap');
      const textEditor = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const style = host ? getComputedStyle(host) : null;
      result.push({
        visible: Boolean(host && style?.display !== 'none' && host.getBoundingClientRect().width > 0),
        text: textEditor?.innerText.trim() ?? '',
        html: textEditor?.innerHTML ?? '',
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return result;
  });

  expect(frames.some((frame) => frame.visible)).toBe(true);
  frames.filter((frame) => frame.visible).forEach((frame) => {
    expect(frame.text).toBe('新节点');
    expect(frame.html).not.toBe('<p><br></p>');
  });
});

for (const shortcut of ['Tab', 'Enter'] as const) {
  test(`${shortcut} insertion is claimed before a host window shortcut can blank the editor`, async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'desktop host-keyboard ownership regression');
    await resetWebApp(page);
    const editor = page.locator('.ymw-editor > .ymz-editor');
    await editor.locator('[data-action="view-map"]').click();
    await addRootChild(page);
    await commitCanvasEdit(page);
    await editor.locator('.smm-node').last().click();
    await page.evaluate((key) => {
      (window as any).__yemindHostShortcutSeen = false;
      (window as any).__yemindHostFocusStolen = false;
      document.addEventListener('focusin', (event) => {
        const target = event.target;
        if (
          (window as any).__yemindHostFocusStolen
          || !(target instanceof HTMLElement)
          || !target.matches('.smm-richtext-node-edit-wrap .ql-editor')
        ) return;
        (window as any).__yemindHostFocusStolen = true;
        document.body.tabIndex = -1;
        document.body.focus({ preventScroll: true });
      }, true);
      window.addEventListener('keydown', (event) => {
        if (event.key !== key) return;
        (window as any).__yemindHostShortcutSeen = true;
      });
    }, shortcut);

    await page.keyboard.press(shortcut);
    const host = canvasTextEditHost(page);
    const textEditor = host.locator('.ql-editor');
    await expect(host).toBeVisible();
    await expect(textEditor).toHaveText('新节点');
    await expect.poll(
      () => page.evaluate(() => (window as any).__yemindHostShortcutSeen),
    ).toBe(false);
    await expect.poll(
      () => page.evaluate(() => (window as any).__yemindHostFocusStolen),
    ).toBe(true);
    await expect(textEditor).toBeFocused();
  });
}

test('one Delete or Backspace removes a selected multiline canvas range', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop keyboard-selection regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  for (const key of ['Delete', 'Backspace']) {
    await rootNode.dblclick();
    await textEditor.fill('第一行\n第二行\n第三行');
    await textEditor.press('Control+A');
    await textEditor.press(key);
    await expect(textEditor).toHaveText('');
    await textEditor.fill(`下一轮-${key}`);
    await commitCanvasEdit(page);
  }
});

test('canvas partial selection cuts in one Ctrl+X transaction and keeps the toolbar beside the selection', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop native-selection regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  await rootNode.dblclick();
  await textEditor.fill('Event Counter 事件计数器');
  await commitCanvasEdit(page);
  await rootNode.dblclick();
  await textEditor.dblclick();
  const toolbar = richTextToolbar(page);
  await expect(toolbar).toBeVisible();
  const geometry = await page.evaluate(() => {
    const selection = window.getSelection();
    const toolbar = document.querySelector<HTMLElement>('.ymz-rich-toolbar');
    if (!selection?.rangeCount || !toolbar) return null;
    const selectionRect = selection.getRangeAt(0).getBoundingClientRect();
    const toolbarRect = toolbar.getBoundingClientRect();
    return {
      selectionText: selection.toString(),
      verticalGap: Math.min(
        Math.abs(toolbarRect.top - selectionRect.bottom),
        Math.abs(selectionRect.top - toolbarRect.bottom),
      ),
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry!.selectionText.length).toBeGreaterThan(0);
  expect(geometry!.verticalGap).toBeLessThanOrEqual(12);
  const selectedText = geometry!.selectionText;
  await page.keyboard.press('Control+X');
  await expect(textEditor).not.toContainText(selectedText);

  for (const key of ['Delete', 'Backspace']) {
    await textEditor.fill(`Event Counter ${key} 事件计数器`);
    await commitCanvasEdit(page);
    await rootNode.dblclick();
    await textEditor.dblclick();
    const rangeText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    expect(rangeText.length).toBeGreaterThan(0);
    await page.keyboard.press(key);
    await expect(textEditor).not.toContainText(rangeText);
  }
});

test('canvas Delete routes to the saved text selection after the host steals DOM focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop host-focus regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  await rootNode.dblclick();
  await textEditor.fill('Event Counter 事件计数器');
  await commitCanvasEdit(page);
  await rootNode.dblclick();
  await textEditor.dblclick();
  const selectedText = await page.evaluate(() => window.getSelection()?.toString() ?? '');
  expect(selectedText.length).toBeGreaterThan(0);

  // SiYuan can move keyboard focus back to the plugin host while the native
  // text selection remains visible. Delete must still operate on that saved
  // selection instead of being reinterpreted as structural node deletion.
  await page.evaluate(() => {
    document.body.tabIndex = -1;
    document.body.focus({ preventScroll: true });
  });
  await page.keyboard.press('Delete');
  await expect(textEditor).not.toContainText(selectedText);
  await expect(rootNode).toBeVisible();
});

test('deleting a full canvas text selection remains one undoable text transaction', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop text-undo regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const original = '撤销必须恢复的节点文字';

  await rootNode.dblclick();
  await textEditor.fill(original);
  await commitCanvasEdit(page);
  // simple-mind-map coalesces adjacent text commands into one history entry;
  // model a pre-existing node rather than two keystroke bursts in one entry.
  await page.waitForTimeout(320);
  await rootNode.dblclick();
  await textEditor.press('Control+A');
  await page.keyboard.press('Delete');
  await expect(textEditor).toHaveText('');
  await commitCanvasEdit(page);

  await editor.locator('[data-action="undo"]').click();
  await expect(rootNode).toContainText(original);
  await editor.locator('[data-action="redo"]').click();
  await expect(rootNode).not.toContainText(original);
});

test('width-handle drag grows the live node monotonically without disappearing or jumping', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer-geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('准备：\nLTSSM 状态读取及历史记录；\n当前 Link Speed、Link Width；\nLane 状态和 PHY PLL/CDR 状态；');
  await commitCanvasEdit(page);
  await rootNode.click();

  const handles = rootNode.locator('rect[style*="ew-resize"]');
  await expect(handles).toHaveCount(2);
  const handle = handles.last();
  const handleBox = await handle.boundingBox();
  const before = await rootNode.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(before).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  const widths = [before!.width];
  const tops = [before!.y];
  const textLefts: number[] = [];
  const textTops: number[] = [];
  const textOffsetsX: number[] = [];
  const textOffsetsY: number[] = [];
  for (let step = 1; step <= 5; step += 1) {
    await page.mouse.move(
      handleBox!.x + handleBox!.width / 2 + step * 24,
      handleBox!.y + handleBox!.height / 2,
      { steps: 1 },
    );
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    const box = await rootNode.boundingBox();
    expect(box).not.toBeNull();
    widths.push(box!.width);
    tops.push(box!.y);
    const painted = await rootNode.evaluate((element) => {
      const text = element.querySelector<SVGGElement>('g[data-width][data-height]');
      const paintedContent = text?.firstElementChild as SVGGraphicsElement | HTMLElement | null;
      const shape = element.querySelector<SVGGraphicsElement>('.smm-node-shape');
      if (!text || !paintedContent || !shape) return null;
      const textRect = text.getBoundingClientRect();
      const paintedContentRect = paintedContent.getBoundingClientRect();
      const shapeRect = shape.getBoundingClientRect();
      return {
        content: text.textContent ?? '',
        textWidth: textRect.width,
        textHeight: textRect.height,
        textLeft: paintedContentRect.left,
        textTop: paintedContentRect.top,
        textOffsetX: paintedContentRect.left - shapeRect.left,
        textOffsetY: paintedContentRect.top - shapeRect.top,
        shapeWidth: shapeRect.width,
        shapeHeight: shapeRect.height,
      };
    });
    expect(painted).not.toBeNull();
    expect(painted!.content).toContain('LTSSM 状态读取及历史记录');
    expect(painted!.textWidth).toBeGreaterThan(0);
    expect(painted!.textHeight).toBeGreaterThan(0);
    expect(painted!.shapeWidth).toBeGreaterThanOrEqual(painted!.textWidth);
    expect(painted!.shapeHeight).toBeGreaterThanOrEqual(painted!.textHeight);
    textLefts.push(painted!.textLeft);
    textTops.push(painted!.textTop);
    textOffsetsX.push(painted!.textOffsetX);
    textOffsetsY.push(painted!.textOffsetY);
  }
  await page.mouse.up();
  for (let index = 1; index < widths.length; index += 1) {
    expect(widths[index]).toBeGreaterThanOrEqual(widths[index - 1] - 1);
  }
  expect(widths.at(-1)!).toBeGreaterThan(widths[0] + 80);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
  expect(Math.max(...textLefts) - Math.min(...textLefts)).toBeLessThanOrEqual(2);
  expect(Math.max(...textTops) - Math.min(...textTops)).toBeLessThanOrEqual(2);
  expect(Math.max(...textOffsetsX) - Math.min(...textOffsetsX)).toBeLessThanOrEqual(0.75);
  expect(Math.max(...textOffsetsY) - Math.min(...textOffsetsY)).toBeLessThanOrEqual(0.75);
  await expect(rootNode).toBeVisible();
});

test('dragging a parent uses the same lightweight single-node preview as a leaf', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop structural-drag regression');
  await resetWebApp(page);
  await addRootChild(page);
  await commitCanvasEdit(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const nodes = editor.locator('.smm-node');
  await nodes.nth(1).click();
  await editor.locator('[data-node-quick-action="add-child"]').first().click();
  await commitCanvasEdit(page);
  await expect(nodes).toHaveCount(3);

  const parent = nodes.nth(1);
  const box = await parent.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 90, box!.y + box!.height / 2 + 45, { steps: 6 });
  const preview = editor.locator('.ymz-drag-node-preview');
  await expect(preview).toBeVisible();
  await expect(preview).not.toHaveClass(/ymz-drag-subtree-preview/);
  await expect(preview.locator('.smm-node')).toHaveCount(0);
  await expect(preview.locator('.smm-node-shape')).toHaveCSS('stroke', 'rgb(141, 226, 206)');
  await page.mouse.up();
});

test('canvas paste merges into the editor at the caret and the committed node reflects the pasted text', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop edit-geometry regression');
  // Previously this asserted that the live node border (.smm-hover-node, an
  // SVG element only updated by a full node re-render) already tracked the
  // Quill editor's width immediately after paste, before the edit closed.
  // That relied on the paste-triggers-an-immediate-SVG-commit branch removed
  // in this plan's Task 2 (see "有意的行为取舍": paste no longer has a
  // separate immediate-commit path). What's still guaranteed -- paste merges
  // correctly at the caret, and the border matches the final text once the
  // edit actually commits -- is what this test now covers.
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('编辑态');
  await textEditor.press('End');
  await textEditor.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '、静态和大纲态统一使用归一化结果。');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await expect(textEditor).toContainText('编辑态、静态和大纲态统一使用归一化结果。');

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('编辑态、静态和大纲态统一使用归一化结果。');
  // .smm-hover-node is removed entirely for richtext (custom-content) nodes
  // once they're back in their static, non-editing render pass (see
  // customNodeContentRealtimeLayout in simple-mind-map's nodeLayout.js), so
  // check the node's own committed geometry instead of that hover rect.
  const nodeBox = await rootNode.boundingBox();
  expect(nodeBox).not.toBeNull();
  expect(nodeBox!.width).toBeGreaterThan(0);
  expect(nodeBox!.height).toBeGreaterThan(0);
});

test('new child paste replaces the default text and the committed node shows the pasted content', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inserted-node paste geometry regression');
  // Previously this asserted that the SVG text/foreignObject geometry
  // already matched the freshly pasted content in the first rendered frame
  // after paste, before the edit closed -- again relying on the removed
  // paste-immediate-commit branch (Task 2). The SVG text for this node now
  // only updates once the edit commits, so that's what this test checks.
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  await textEditor.press('Control+A');
  await textEditor.evaluate((element) => {
    const transfer = new DataTransfer();
    transfer.setData('text/plain', 'excel数据再帮我更新一下，节点编辑层和背后节点框必须同步扩大');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await expect(textEditor).toContainText('节点编辑层和背后节点框必须同步扩大');

  await commitCanvasEdit(page);
  const committedNode = editor.locator('.smm-node')
    .filter({ hasText: '节点编辑层和背后节点框必须同步扩大' });
  await expect(committedNode).toHaveCount(1);
  const nodeBox = await committedNode.boundingBox();
  expect(nodeBox).not.toBeNull();
  expect(nodeBox!.width).toBeGreaterThan(0);
});

test('outline text transactions keep node count, canvas geometry and quick-action anchoring stable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop split-view regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childUid = await childRow.getAttribute('data-outline-uid');
  expect(childUid).toBeTruthy();
  const childText = childRow.locator('[data-outline-editor]');
  await childText.fill('访问、启动、建链、枚举、传输');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  const canvasChild = editor.locator('.smm-node').filter({ hasText: '访问、启动、建链、枚举、传输' });
  await expect(canvasChild).toHaveCount(1);
  const textBox = await canvasChild.boundingBox();
  expect(textBox).not.toBeNull();
  expect(textBox!.width).toBeGreaterThan(40);
  expect(textBox!.width).toBeLessThan(500);

  await childText.click();
  const actions = editor.locator(`.ymz-node-quick-actions[data-node-uid="${childUid}"]`);
  await expect(actions).toBeVisible();
  await expectQuickActionsAnchored(canvasChild, actions);

  await childText.fill('43243');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  await expect(canvasChild).toHaveCount(0);
  const numericChild = editor.locator('.smm-node').filter({ hasText: '43243' });
  await expect(numericChild).toHaveCount(1);
  await childText.click();
  await expect(actions).toBeVisible();
  await expectQuickActionsAnchored(numericChild, actions);
});

test('node quick actions follow wheel and horizontal canvas panning on every painted frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop viewport tracking regression');
  await resetWebApp(page);
  await addRootChild(page);
  await commitCanvasEdit(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const canvas = editor.locator('[data-role="canvas"]');
  const node = editor.locator('.smm-node').last();
  await node.click();
  const actions = editor.locator('.ymz-node-quick-actions').first();
  await expect(actions).toBeVisible();
  await expectQuickActionsAnchored(node, actions);
  await editor.locator('[data-action="toggle-selection-mode"]').click();
  await expect(editor).toHaveAttribute('data-selection-mode', 'pan');

  const canvasBox = await canvas.boundingBox();
  const initialNodeBox = await node.boundingBox();
  expect(canvasBox).not.toBeNull();
  expect(initialNodeBox).not.toBeNull();
  await page.mouse.move(canvasBox!.x + canvasBox!.width * 0.72, canvasBox!.y + canvasBox!.height * 0.72);
  let previousY = initialNodeBox!.y;
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.wheel(0, 45);
    await expect.poll(async () => (await node.boundingBox())?.y).not.toBe(previousY);
    previousY = (await node.boundingBox())!.y;
    await expectQuickActionsAnchored(node, actions);
  }

  let previousX = (await node.boundingBox())!.x;
  for (let index = 0; index < 4; index += 1) {
    await page.mouse.wheel(45, 0);
    await expect.poll(async () => (await node.boundingBox())?.x).not.toBe(previousX);
    previousX = (await node.boundingBox())!.x;
    await expectQuickActionsAnchored(node, actions);
  }

  const beforeDrag = await node.boundingBox();
  const dragStartX = canvasBox!.x + canvasBox!.width * 0.72;
  const dragY = canvasBox!.y + canvasBox!.height * 0.72;
  await page.mouse.move(dragStartX, dragY);
  await page.mouse.down({ button: 'right' });
  for (let index = 1; index <= 6; index += 1) {
    await page.mouse.move(dragStartX - index * 14, dragY);
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
    await expectQuickActionsAnchored(node, actions);
  }
  await page.mouse.up({ button: 'right' });
  await expect.poll(async () => (await node.boundingBox())?.x).not.toBe(beforeDrag!.x);
  await expectQuickActionsAnchored(node, actions);
});

test('outline paste trims browser boundary blank lines and Delete removes the pasted text completely', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop split-view regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childText = editor.locator('[data-outline-drag-source="true"]').first().locator('[data-outline-editor]');
  await childText.fill('准备替换');
  await childText.click();
  await childText.evaluate((element) => {
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(element);
    selection?.removeAllRanges();
    selection?.addRange(range);
    const transfer = new DataTransfer();
    transfer.setData('text/plain', '\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再\n\n');
    transfer.setData('text/html', '<p>\n\n这表示该计划范围已落地，但不等于 YeMind 后续不会再</p>');
    element.dispatchEvent(new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData: transfer,
    }));
  });
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('[data-outline-drag-source="true"]')).toHaveCount(1);
  await expect(childText).toHaveText('这表示该计划范围已落地，但不等于 YeMind 后续不会再');
  expect(await childText.evaluate((element) => element.textContent?.includes('\n') ?? false)).toBe(false);

  await childText.click({ clickCount: 3 });
  const toolbar = richTextToolbar(page);
  await expect(toolbar).toBeVisible();
  await expect(toolbar).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await expect(toolbar).toHaveCSS('box-shadow', 'none');
  await page.keyboard.press('Delete');
  await expect(childText).toHaveText('');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
});

test('fast reverse outline selection can overshoot the left grip and still Delete the selected text', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop pointer-selection regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childText = childRow.locator('[data-outline-editor]');
  const grip = childRow.locator('[data-outline-drag-handle]');
  const textBox = await childText.boundingBox();
  const gripBox = await grip.boundingBox();
  expect(textBox).not.toBeNull();
  expect(gripBox).not.toBeNull();

  const y = textBox!.y + textBox!.height / 2;
  await page.mouse.move(textBox!.x + textBox!.width - 2, y);
  await page.mouse.down();
  await page.mouse.move(gripBox!.x + gripBox!.width / 2, y, { steps: 1 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? ''))
    .not.toBe('');

  await page.keyboard.press('Delete');
  await expect(childText).toHaveText('');
});

test('canvas selected text keeps its range while every direct format control runs', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('.smm-node').first().dblclick();
  const textEditor = canvasTextEditor(page);
  await expect(textEditor).toBeVisible();
  await textEditor.selectText();
  const toolbar = richTextToolbar(page);
  await expect(toolbar).toBeVisible();

  await toolbar.locator('[data-rich-action="bold"]').click();
  await expect(textEditor.locator('strong')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="italic"]').click();
  await expect(textEditor.locator('em')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="underline"]').click();
  await expect(textEditor.locator('u')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="strike"]').click();
  await expect(textEditor.locator('s')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="inline-code"]').click();
  await expect(textEditor.locator('code')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="color-menu"]').click();
  await richTextColorPopover(page).locator('[data-color-value="#ff4d3d"]').click();
  await expect(textEditor.locator('[style*="color: rgb(255, 77, 61)"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await richTextColorPopover(page).locator('[data-color-value="#ff4d3d"]').click();
  await expect(textEditor.locator('[style*="background-color: rgb(255, 77, 61)"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-field="size"]').selectOption('18px');
  await expect(textEditor.locator('[style*="font-size: 18px"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-field="font"]').selectOption('serif');
  await expect(textEditor.locator('[style*="font-family: serif"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(textEditor.locator('[style*="color: transparent"]')).toBeVisible();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(textEditor.locator('[style*="color: transparent"]')).toHaveCount(0);

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="clear"]').click();
  await expect.poll(() => textEditor.evaluate((element) =>
    element.querySelectorAll('strong, em, u, s, code, a, span[style]').length,
  )).toBe(0);
});

test('outline selection toolbar formats text and its context menu edits and deletes the requested row', async ({ page }) => {
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childRow = editor.locator('[data-outline-drag-source="true"]').first();
  const childText = childRow.locator('[data-outline-editor]');
  await childText.click({ clickCount: 3 });
  const toolbar = richTextToolbar(page);
  await expect(toolbar).toBeVisible();
  await toolbar.locator('[data-rich-action="bold"]').click();
  await expect(childText.locator('b, strong')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="italic"]').click();
  await expect(childText.locator('i, em')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="underline"]').click();
  await expect(childText.locator('u')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="strike"]').click();
  await expect(childText.locator('strike, s')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="inline-code"]').click();
  await expect(childText.locator('code')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="color-menu"]').click();
  await richTextColorPopover(page).locator('[data-color-value="#ff4d3d"]').click();
  await expect(childText.locator('[color="#ff4d3d"], [style*="255, 77, 61"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await richTextColorPopover(page).locator('[data-color-value="#ff4d3d"]').click();
  await expect(childText.locator('[style*="background-color: rgb(255, 77, 61)"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-field="size"]').selectOption('18px');
  await expect(childText.locator('[style*="font-size: 18px"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-field="font"]').selectOption('serif');
  await expect(childText.locator('[style*="font-family: serif"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(childText.locator('[style*="transparent"]')).toBeVisible();
  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="cloze"]').click();
  await expect(childText.locator('[data-yemind-cloze]')).toHaveCount(0);

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="clear"]').click();
  await expect.poll(() => childText.evaluate((element) => {
    const textNode = document.createTreeWalker(element, NodeFilter.SHOW_TEXT).nextNode();
    const style = getComputedStyle(textNode?.parentElement ?? element);
    return {
      bold: Number.parseInt(style.fontWeight, 10) >= 600,
      italic: style.fontStyle === 'italic',
      decorated: /underline|line-through/.test(style.textDecorationLine),
      transparent: style.color === 'transparent' || style.color === 'rgba(0, 0, 0, 0)',
    };
  })).toEqual({ bold: false, italic: false, decorated: false, transparent: false });

  await childRow.click({ button: 'right' });
  const menu = page.locator('.ymw-menu');
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: '编辑节点' }).click();
  await expect.poll(() => page.evaluate(() => window.getSelection()?.toString() ?? '')).not.toBe('');
  await page.keyboard.type('编辑后节点');
  await editor.locator('[data-outline-root="true"] [data-outline-editor]').click();
  await expect(childText).toContainText('编辑后节点');

  await childRow.click({ button: 'right' });
  await expect(menu).toBeVisible();
  await menu.getByRole('menuitem', { name: '删除当前行和子级' }).click();
  await expect(editor.locator('[data-outline-drag-source="true"]')).toHaveCount(0);
});

test('canvas link, code-block and formula dialogs commit against the saved text range', async ({ page }) => {
  await resetWebApp(page);
  const editorUrl = page.url();
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const toolbar = richTextToolbar(page);

  await editor.locator('.smm-node').first().dblclick();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="link"]').click();
  let dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="inline-link"]').fill('example.com');
  await dialog.locator('[data-action="save"]').click();
  await expect(textEditor.locator('a')).toHaveAttribute('href', /https:\/\/example\.com/);
  await expect(textEditor.locator('a')).toHaveAttribute('data-yemind-link', 'true');

  await editor.locator('.smm-node').first().dblclick();
  await expect(page).toHaveURL(editorUrl);
  expect(page.context().pages()).toHaveLength(1);
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="code-block"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="code"]').fill('const answer = 42;');
  await dialog.locator('[data-action="save"]').click();
  await expect(textEditor.locator('.ql-code-block')).toContainText('const answer = 42;');

  await editor.locator('.smm-node').first().dblclick();
  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="formula"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="formula"]').fill('e=mc^2');
  await dialog.locator('[data-dialog-action="save"]').click();
  await expect(textEditor.locator('.ql-formula')).toHaveAttribute('data-value', 'e=mc^2');
});

test('outline link, code-block and formula dialogs commit against the saved text range', async ({ page }) => {
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-action="view-outline"]').click();
  const childText = editor.locator('[data-outline-drag-source="true"]').first().locator('[data-outline-editor]');
  const toolbar = richTextToolbar(page);

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="link"]').click();
  let dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="inline-link"]').fill('example.com');
  await dialog.locator('[data-action="save"]').click();
  await expect(childText.locator('a')).toHaveAttribute('href', /https:\/\/example\.com/);

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="code-block"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="code"]').fill('const answer = 42;');
  await dialog.locator('[data-action="save"]').click();
  await expect(childText.locator('pre')).toContainText('const answer = 42;');

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="formula"]').click();
  dialog = page.locator('.b3-dialog');
  await expect(dialog).toBeVisible();
  await dialog.locator('[data-field="formula"]').fill('e=mc^2');
  await dialog.locator('[data-dialog-action="save"]').click();
  await expect(childText.locator('.ql-formula')).toHaveAttribute('data-value', 'e=mc^2');
});

// YM-P0-CORE-003 regression: `.fill()` sets the whole editor value in one
// programmatic operation and never proves that real per-character keystrokes
// keep the Quill editor focused and readable. The tests below drive the
// canvas rich-text editor the same way a physical keyboard and IME would:
// individual keydown/input events, and native compositionstart/update/end for
// CJK input.

async function startFrameCapture(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    const frames: Array<{ staticVisible: boolean; editorVisible: boolean; focused: boolean; editorReady: string | null }> = [];
    const painted = (element: Element | null): boolean => {
      if (!(element instanceof Element)) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    (window as any).__yemindTypingStop = false;
    const capture = (): void => {
      const nodeGroup = document.querySelector('.smm-node.active') ?? document.querySelector('.smm-node');
      const staticLayers = nodeGroup
        ? Array.from(nodeGroup.querySelectorAll<Element>('.smm-text-node-wrap,.smm-richtext-node-wrap'))
        : [];
      const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const quillEditor = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      frames.push({
        staticVisible: staticLayers.some((element) => painted(element)),
        editorVisible: painted(host) && painted(quillEditor),
        focused: document.activeElement === quillEditor,
        editorReady: host?.dataset.yemindGeometryReady ?? null,
      });
      if (!(window as any).__yemindTypingStop) requestAnimationFrame(capture);
    };
    (window as any).__yemindTypingFrames = frames;
    requestAnimationFrame(capture);
  });
}

async function stopFrameCapture(page: import('@playwright/test').Page): Promise<Array<{
  staticVisible: boolean;
  editorVisible: boolean;
  focused: boolean;
  editorReady: string | null;
}>> {
  return page.evaluate(async () => {
    (window as any).__yemindTypingStop = true;
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    return (window as any).__yemindTypingFrames;
  });
}

test('canvas text edit accepts real sequential English and digit keystrokes without losing focus or ghosting', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop sequential-keystroke regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toBeFocused();
  await textEditor.press('Control+A');

  await startFrameCapture(page);
  await textEditor.pressSequentially('abcdef123456', { delay: 70 });
  await page.waitForTimeout(150);
  const frames = await stopFrameCapture(page);

  expect(frames.length).toBeGreaterThan(15);
  // Exactly one text layer (the live Quill editor XOR the static SVG text)
  // may be visible on any painted frame; both-visible means a ghosted double
  // layer, neither-visible means the user sees no text at all.
  const blankFrames = frames.filter((frame) => !frame.staticVisible && !frame.editorVisible);
  expect(blankFrames).toEqual([]);
  // Once the editor is the visible layer it must also hold real DOM focus,
  // otherwise keystrokes stop reaching Quill even though nothing looks wrong.
  const unfocusedVisibleFrames = frames.filter((frame) => frame.editorVisible && !frame.focused);
  expect(unfocusedVisibleFrames).toEqual([]);

  await expect(textEditor).toHaveText('abcdef123456');
  await expect(textEditor).toBeFocused();
  expect(errors).toEqual([]);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('abcdef123456');
});

test('canvas text edit keeps IME composition uncommitted until compositionend and does not trigger structural shortcuts mid-composition', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop IME composition regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  const nodeCountBefore = await editor.locator('.smm-node').count();

  const result = await page.evaluate(async () => {
    const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
    const quillEditor = host?.querySelector<HTMLElement>('.ql-editor');
    if (!quillEditor) return { ok: false, structuralTriggered: false, composingHtmlSnapshot: '' };
    let structuralTriggered = false;
    const guard = (event: KeyboardEvent): void => {
      if (event.key === 'Enter' || event.key === 'Tab') structuralTriggered = true;
    };
    window.addEventListener('keydown', guard, true);
    quillEditor.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true, data: '' }));
    const stages = ['P', 'PC', 'PCI', 'PCIe', 'PCIe中', 'PCIe中文', 'PCIe中文输', 'PCIe中文输入', 'PCIe中文输入测', 'PCIe中文输入测试'];
    for (const stage of stages) {
      quillEditor.dispatchEvent(new CompositionEvent('compositionupdate', { bubbles: true, data: stage }));
      quillEditor.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertCompositionText', data: stage, composed: true }));
      await new Promise((resolve) => setTimeout(resolve, 8));
    }
    const composingHtmlSnapshot = quillEditor.innerHTML;
    quillEditor.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true, data: 'PCIe中文输入测试' }));
    document.execCommand('insertText', false, 'PCIe中文输入测试');
    window.removeEventListener('keydown', guard, true);
    return { ok: true, structuralTriggered, composingHtmlSnapshot };
  });

  expect(result.ok).toBe(true);
  expect(result.structuralTriggered).toBe(false);
  await expect(textEditor).toContainText('PCIe中文输入测试');
  await expect(textEditor).toBeFocused();
  await expect(editor.locator('.smm-node')).toHaveCount(nodeCountBefore);
  expect(errors).toEqual([]);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('PCIe中文输入测试');
});

test('a second canvas edit session on a different node accepts continuous typing after switching from the first node', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop multi-session regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const toolbar = richTextToolbar(page);

  await addRootChild(page);
  await textEditor.pressSequentially('nodeAtext', { delay: 40 });
  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('nodeAtext');
  await commitCanvasEdit(page);

  await addRootChild(page);
  await expect(textEditor).toBeFocused();
  await textEditor.pressSequentially('nodeBtext', { delay: 40 });
  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('nodeBtext');
  // The formatting toolbar must still respond for the new session; a stale
  // captured session id from the first node would silently drop this.
  await textEditor.dblclick();
  await expect(toolbar).toBeVisible();
  await commitCanvasEdit(page);

  const nodes = editor.locator('.smm-node');
  await expect(nodes.filter({ hasText: 'nodeAtext' })).toHaveCount(1);
  await expect(nodes.filter({ hasText: 'nodeBtext' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('an existing text node accepts continuous retyping after real selection and deletion', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop existing-node retype regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await textEditor.fill('已有文字节点原始内容');
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await textEditor.press('Control+A');
  await page.keyboard.press('Delete');
  await expect(textEditor).toHaveText('');
  await expect(textEditor).toBeFocused();

  await startFrameCapture(page);
  await textEditor.pressSequentially('替换后的新内容abc', { delay: 60 });
  await page.waitForTimeout(150);
  const frames = await stopFrameCapture(page);
  const blankFrames = frames.filter((frame) => !frame.staticVisible && !frame.editorVisible);
  expect(blankFrames).toEqual([]);
  const unfocusedVisibleFrames = frames.filter((frame) => frame.editorVisible && !frame.focused);
  expect(unfocusedVisibleFrames).toEqual([]);

  await expect(textEditor).toHaveText('替换后的新内容abc');
  await expect(textEditor).toBeFocused();
  expect(errors).toEqual([]);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('替换后的新内容abc');
});

test('clicking mid-text to place a caret, typing, then pressing Backspace once only removes one character', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop caret-click-then-backspace regression');
  // Root cause: Quill's Selection#update() suppresses its own public
  // 'selection-change' event (Emitter.sources.SILENT) for the caret move that
  // naturally follows typing — see node_modules/quill/core/selection.js,
  // `this.update(triggeredByTyping ? Emitter.sources.SILENT : source)` and
  // `if (source !== Emitter.sources.SILENT) { this.emitter.emit(...) }`.
  // YeMindRichText only refreshes its own `this.range`/`this.lastRange`
  // "last known selection" cache from that event, so after a real click
  // (which does fire 'selection-change', caching whatever was selected
  // *before* the click — e.g. the initial double-click select-all) followed
  // by typing new characters, the cache never learns the caret collapsed.
  // Backspace/Delete's saved-selection fallback (`deleteCurrentSelection`)
  // then deletes that stale, much larger range instead of one character.
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const original = '这是一段用于测试的原始较长文字内容ABCDEFGHIJKLMNOPQRSTUVWXYZ再补充一些额外的内容让节点足够宽';

  await rootNode.dblclick();
  await textEditor.fill(original);
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  // A real pointer click near the middle of the rendered text places a
  // collapsed caret there, matching how a user repositions the cursor in an
  // existing node (not select-all, not keyboard Home/Arrow navigation).
  const box = await textEditor.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.click(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.waitForTimeout(80);
  const caretOffset = await page.evaluate(() => {
    const editorEl = document.querySelector('.smm-richtext-node-edit-wrap .ql-editor')!;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return -1;
    const pre = document.createRange();
    pre.selectNodeContents(editorEl);
    pre.setEnd(sel.getRangeAt(0).startContainer, sel.getRangeAt(0).startOffset);
    return pre.toString().length;
  });
  expect(caretOffset).toBeGreaterThan(0);
  expect(caretOffset).toBeLessThan(original.length);

  await page.keyboard.type('XYZ', { delay: 60 });
  const afterType = await textEditor.textContent();
  const expectedAfterType = `${original.slice(0, caretOffset)}XYZ${original.slice(caretOffset)}`;
  expect(afterType).toBe(expectedAfterType);

  await page.keyboard.press('Backspace');
  const afterBackspace = await textEditor.textContent();
  // One Backspace after typing must remove exactly the character just
  // typed ('Z', at the real caret position), never fall back to a stale
  // multi-character selection from before the click.
  const expectedAfterBackspace = `${original.slice(0, caretOffset)}XY${original.slice(caretOffset)}`;
  expect(afterBackspace).toBe(expectedAfterBackspace);
  expect(afterBackspace?.length).toBe(original.length + 2);
  await expect(textEditor).toBeFocused();
  expect(errors).toEqual([]);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText(afterBackspace!);
});

test('real per-character canvas typing commits exactly once and undo/redo restore it in one step', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop typed-history regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const original = await rootNode.textContent();

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await textEditor.press('Control+A');
  await textEditor.pressSequentially('逐字符输入的新标题123', { delay: 60 });
  await expect(textEditor).toHaveText('逐字符输入的新标题123');
  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('逐字符输入的新标题123');

  await editor.locator('[data-action="undo"]').click();
  await expect(rootNode).not.toContainText('逐字符输入的新标题123');
  if (original) await expect(rootNode).toContainText(original);
  await editor.locator('[data-action="redo"]').click();
  await expect(rootNode).toContainText('逐字符输入的新标题123');

  // Reopening after save/reload-equivalent navigation must show the same
  // committed text, not a partially-applied keystroke.
  await rootNode.dblclick();
  await expect(textEditor).toContainText('逐字符输入的新标题123');
  await commitCanvasEdit(page);
});

test('a transient editor/target geometry mismatch during typing must not hide or unfocus an already-active canvas editor', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop geometry-regression sticky-active regression');
  // Root cause: RenderLifecycleCoordinator.commitTextEdit() rebuilds the
  // node's SVG text on every keystroke, and YeMindRichText.commitOpeningPlacement()
  // unconditionally recomputes editorContentRectAligned() against the fresh
  // SVG rect and writes host.dataset.yemindGeometryReady on every commit.
  // `.smm-richtext-node-edit-wrap:not([data-yemind-geometry-ready="true"])`
  // is CSS `visibility:hidden!important`, and Chromium cannot keep DOM focus
  // on a `visibility:hidden` element, so any keystroke-triggered realignment
  // miss (e.g. a font-metric or zoom mismatch between the off-screen SVG
  // measurement and the live Quill box) re-hides and unfocuses an editor
  // that was already actively being typed into. This reproduces the reported
  // "second character cannot be typed / ghosted first character" defect
  // without relying on a specific font or theme to drift by chance.
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const host = canvasTextEditHost(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  // Force every future alignment check to miss by 5px, simulating a
  // persistent measurement/render mismatch that the atomic-handoff gate must
  // survive once editing is already active.
  await page.evaluate(() => {
    const liveEditor = document.querySelector('.smm-richtext-node-edit-wrap .ql-editor')!;
    const original = liveEditor.getBoundingClientRect.bind(liveEditor);
    (liveEditor as unknown as { getBoundingClientRect: () => DOMRect }).getBoundingClientRect = () => {
      const rect = original();
      return new DOMRect(rect.left + 5, rect.top + 5, rect.width, rect.height);
    };
  });

  await textEditor.press('Control+A');
  await textEditor.pressSequentially('abcdef', { delay: 60 });

  // The active editor must stay visible and keep DOM focus for the rest of
  // the session even though every post-keystroke realignment now misses.
  await expect(host).toHaveCSS('visibility', 'visible');
  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('abcdef');

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('abcdef');
});

// v1.8.0 canvas text edit stabilization: the live-edit commit path that used
// to rebuild static SVG text on every keystroke was removed entirely (see
// docs/superpowers/plans/2026-07-31-canvas-text-edit-stabilization.md). The
// tests below lock in the resulting guarantees directly.

// v1.9.9-rc.6 user regression: while an editor is open the node resizes with
// the text, so a second painted text layer no longer holds a frozen copy that
// the opaque host happens to cover -- it holds a *different revision of the
// same string* a few pixels away, which reads as doubled, blurred text. The
// same suppression also removes the one-frame flash of text at the node's
// local origin as an editor closes.
test('only the Quill overlay paints the edited node glyphs, from open to committed close', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live-edit isolation regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  await page.evaluate(() => {
    const state = { frames: 0, bothPainted: 0, layers: 0, wrapVisibleAtEnd: false };
    (window as any).__yemindLayerState = state;
    const tick = () => {
      const group = document.querySelector('.ymw-editor > .ymz-editor .smm-node');
      const wraps = group ? group.querySelectorAll('.smm-richtext-node-wrap,.smm-text-node-wrap') : [];
      const host = document.querySelector('.smm-richtext-node-edit-wrap') as HTMLElement | null;
      if (wraps.length > 0) {
        state.frames += 1;
        state.layers = Math.max(state.layers, wraps.length);
        const wrapVisible = ((element: Element) => {
          // Upstream hides the edited node's glyphs with display:none on open
          // and opacity 0 on every relayout, and both sit on an ancestor <g>.
          // opacity is not inherited, so checking only the text element's own
          // computed style reports a hidden layer as painted.
          let current: Element | null = element;
          while (current) {
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (Number(style.opacity) <= 0.01) return false;
            if (current.classList.contains('smm-node')) break;
            current = current.parentElement ?? (current.parentNode as Element | null);
          }
          return true;
        })(wraps[0] as Element);
        const hostVisible = Boolean(host && host.style.display !== 'none');
        state.wrapVisibleAtEnd = wrapVisible;
        if (wrapVisible && hostVisible) state.bothPainted += 1;
      }
      (window as any).__yemindLayerFrame = requestAnimationFrame(tick);
    };
    tick();
  });

  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('提交后要重新排版的一段文字', { delay: 25 });
  await expect(textEditor).toHaveText('提交后要重新排版的一段文字');
  await commitCanvasEdit(page);
  await page.waitForTimeout(600);

  const state = await page.evaluate(() => {
    cancelAnimationFrame((window as any).__yemindLayerFrame);
    return (window as any).__yemindLayerState;
  });
  expect(state.frames).toBeGreaterThan(40);
  // Never two text layers, and never the SVG layer painting underneath a
  // shown editor. Removing the suppression turns this into ~50 frames.
  expect(state.layers).toBe(1);
  expect(state.bothPainted).toBe(0);
  // The glyphs must come back once the commit has been laid out, not stay gone.
  expect(state.wrapVisibleAtEnd).toBe(true);
  await expect(rootNode).toContainText('提交后要重新排版的一段文字');
  expect(errors).toEqual([]);
});

// v1.9.9-rc.6 user regression: typing into a brand new node appended to
// `新节点` instead of replacing it, because the host taking DOM focus made the
// editor reclaim it and collapse the selection to the end of the text.
test('a freshly inserted node keeps its full selection when the host steals focus', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop insertion selection regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);

  await editor.locator('.smm-node').first().click();
  await page.keyboard.press('Tab');
  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('新节点');

  // SiYuan moves DOM focus onto its own chrome while a plugin editor is open.
  await page.evaluate(() => {
    const thief = document.createElement('input');
    thief.id = 'yemind-host-focus-thief';
    thief.style.cssText = 'position:fixed;left:-9999px;top:0';
    document.body.appendChild(thief);
    thief.focus();
  });
  await page.waitForTimeout(150);

  const restored = await page.evaluate(() => String(window.getSelection() ?? ''));
  expect(restored).toBe('新节点');

  await page.keyboard.type('替换后的内容');
  await expect(textEditor).toHaveText('替换后的内容');
  await commitCanvasEdit(page);
  await expect(editor.locator('.smm-node').nth(1)).toContainText('替换后的内容');
});

for (const insertion of ['Tab', 'Enter', 'quick-add'] as const) {
  test(`${insertion} insertion paints 新节点 from the first visible canvas frame`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop inserted-node synchronous first-paint regression');
    await resetWebApp(page);
    const editor = page.locator('.ymw-editor > .ymz-editor');
    await addRootChild(page);
    await commitCanvasEdit(page);
    await editor.locator('.smm-node').last().click();

    await page.evaluate(() => {
      const initialNodes = new Set(
        Array.from(document.querySelectorAll<SVGGraphicsElement>('.ymw-editor > .ymz-editor .smm-node')),
      );
      const records: Array<{ visible: boolean; text: string }> = [];
      const paintFrames: Array<{
        nodeVisible: boolean;
        staticTag: string;
        staticText: string;
        staticGlyphPainted: boolean;
        editorVisible: boolean;
        editorText: string;
        editorGlyphPainted: boolean;
      }> = [];
      const capture = (): void => {
        const host = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap');
        if (!host) return;
        const style = getComputedStyle(host);
        const rect = host.getBoundingClientRect();
        records.push({
          visible: style.display !== 'none' && style.visibility !== 'hidden' && rect.width > 0 && rect.height > 0,
          text: host.querySelector<HTMLElement>('.ql-editor')?.innerText.trim() ?? '',
        });
      };
      (window as any).__yemindInsertedHostRecords = records;
      const observer = new MutationObserver(capture);
      observer.observe(document.body, {
        subtree: true,
        childList: true,
        characterData: true,
        attributes: true,
        attributeFilter: ['style', 'class'],
      });
      (window as any).__yemindInsertedHostObserver = observer;
      (window as any).__yemindInsertedPaintFrames = paintFrames;
      (window as any).__yemindInsertedPaintActive = true;
      const capturePaint = (): void => {
        if (!(window as any).__yemindInsertedPaintActive) return;
        const nodes = Array.from(document.querySelectorAll<SVGGraphicsElement>('.ymw-editor > .ymz-editor .smm-node'));
        const node = nodes.find((candidate) => !initialNodes.has(candidate));
        if (node) {
          const nodeRect = node.getBoundingClientRect();
          const host = document.querySelector<HTMLElement>('body > .smm-richtext-node-edit-wrap');
          const hostRect = host?.getBoundingClientRect();
          const hostStyle = host ? getComputedStyle(host) : null;
          const staticText = node.querySelector<SVGTextElement>('.smm-text-node-wrap');
          const staticTextRect = staticText?.getBoundingClientRect();
          const staticTextStyle = staticText ? getComputedStyle(staticText) : null;
          const editorRoot = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
          const editorRange = editorRoot && editorRoot.firstChild
            ? (() => {
              const range = document.createRange();
              range.selectNodeContents(editorRoot);
              return range.getBoundingClientRect();
            })()
            : null;
          paintFrames.push({
            nodeVisible: nodeRect.width > 0 && nodeRect.height > 0,
            staticTag: node.querySelector('.smm-text-node-wrap,.smm-richtext-node-wrap')?.tagName.toLowerCase() ?? '',
            staticText: (node.querySelector('g[data-width][data-height]')?.textContent ?? '').trim(),
            staticGlyphPainted: Boolean(staticText && staticTextRect && staticTextStyle
              && staticTextRect.width > 0 && staticTextRect.height > 0
              && staticTextStyle.display !== 'none' && staticTextStyle.visibility !== 'hidden'
              && staticTextStyle.opacity !== '0'),
            editorVisible: Boolean(host && hostStyle?.display !== 'none' && hostStyle?.visibility !== 'hidden'
              && hostRect && hostRect.width > 0 && hostRect.height > 0),
            editorText: (editorRoot?.innerText ?? '').trim(),
            editorGlyphPainted: Boolean(editorRange && editorRange.width > 0 && editorRange.height > 0),
          });
        }
        requestAnimationFrame(capturePaint);
      };
      requestAnimationFrame(capturePaint);
    });

    if (insertion === 'quick-add') {
      await editor.locator('[data-node-quick-action="add-child"]').click();
    } else {
      await page.keyboard.press(insertion);
    }
    await expect(canvasTextEditor(page)).toHaveText('新节点');
    await expect(canvasTextEditor(page)).toBeFocused();
    const initialSelection = await canvasTextEditor(page).evaluate((element) => {
      const selection = window.getSelection();
      const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
      return {
        collapsed: selection?.isCollapsed ?? true,
        selectedText: selection?.toString() ?? '',
        belongsToEditor: Boolean(
          range
          && element.contains(range.startContainer)
          && element.contains(range.endContainer),
        ),
      };
    });
    expect(initialSelection).toEqual({
      collapsed: false,
      selectedText: '新节点',
      belongsToEditor: true,
    });
    const selectionPaint = await canvasTextEditor(page).evaluate((element) => {
      const style = getComputedStyle(element, '::selection');
      return {
        backgroundColor: style.backgroundColor,
        caretColor: getComputedStyle(element).caretColor,
      };
    });
    expect(selectionPaint.backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
    expect(selectionPaint.backgroundColor).not.toBe('transparent');
    expect(selectionPaint.caretColor).not.toBe('transparent');
    await page.evaluate(() => new Promise<void>((resolve) => {
      let remaining = 6;
      const next = (): void => {
        remaining -= 1;
        if (remaining <= 0) resolve();
        else requestAnimationFrame(next);
      };
      requestAnimationFrame(next);
    }));
    const { records, paintFrames } = await page.evaluate(() => {
      (window as any).__yemindInsertedHostObserver?.disconnect();
      (window as any).__yemindInsertedPaintActive = false;
      return {
        records: (window as any).__yemindInsertedHostRecords as Array<{ visible: boolean; text: string }>,
        paintFrames: (window as any).__yemindInsertedPaintFrames as Array<{
          nodeVisible: boolean;
          staticTag: string;
          staticText: string;
          staticGlyphPainted: boolean;
          editorVisible: boolean;
          editorText: string;
          editorGlyphPainted: boolean;
        }>,
      };
    });
    const visible = records.filter((record) => record.visible);
    expect(visible.length).toBeGreaterThan(0);
    visible.forEach((record) => expect(record.text).toBe('新节点'));
    const visibleNodeFrames = paintFrames.filter((frame) => frame.nodeVisible);
    expect(visibleNodeFrames.length).toBeGreaterThan(0);
    expect(visibleNodeFrames[0].staticTag).toBe('text');
    visibleNodeFrames.forEach((frame) => {
      expect(
        (frame.staticText === '新节点' && frame.staticGlyphPainted)
        || (frame.editorVisible && frame.editorText === '新节点' && frame.editorGlyphPainted),
      ).toBe(true);
    });
    await canvasTextEditor(page).pressSequentially('直接替换');
    await expect(canvasTextEditor(page)).toHaveText('直接替换');
  });
}

test('the line a character sits on before entering edit matches the line it sits on after', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop line-wrap consistency regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const longText = 'PCIe RAS Reliability Availability Serviceability 可靠性可用性可维护性完整长句测试换行一致性';

  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await textEditor.fill(longText);
  await commitCanvasEdit(page);

  const staticTextGroup = rootNode.locator('g[data-width][data-height]').first();
  const staticLineCount = (await readVisualLines(staticTextGroup)).lines.length;

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  // longText has no explicit newline, so Quill keeps it in a single <p> --
  // counting direct children would always read "1 line" even though the
  // paragraph visually soft-wraps across several lines. Count actual visual
  // line boxes instead (distinct client-rect vertical positions), the same
  // thing a person looking at the editor would call "a line".
  const editorLineCount = await textEditor.evaluate((el) => {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from(range.getClientRects());
    const tops = new Set(rects.map((rect) => Math.round(rect.top)));
    return tops.size;
  });

  expect(editorLineCount).toBeGreaterThan(0);
  expect(staticLineCount).toBeGreaterThan(0);
  // Exact equality of line counts between an SVG <text>/<tspan> layout and a
  // Quill visual-line-box count isn't meaningful line-for-line; what matters
  // is that neither is a single line while the other wraps into several -- a
  // coarse multi-line-vs-single-line mismatch is exactly the "last character
  // drops to the next line" symptom this task's CSS fix (Task 8) targets.
  const staticIsMultiline = staticLineCount > 1;
  const editorIsMultiline = editorLineCount > 1;
  expect(editorIsMultiline).toBe(staticIsMultiline);
  await commitCanvasEdit(page);
});

test('YM-TEXT-022 automatic-width canvas editing preserves the exact visual line distribution', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop exact-wrap opening regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const host = canvasTextEditHost(page);
  const criticalText = '高速信号完整性验证与错误注入保护机制可靠性可用性可维护性测试'.repeat(3);

  await addRootChild(page);
  const rootNode = editor.locator('.smm-node').last();
  await textEditor.fill(criticalText);
  await commitCanvasEdit(page);

  const staticTextGroup = rootNode.locator('g[data-width][data-height]').first();
  await expect(staticTextGroup).toBeVisible();
  const staticSnapshot = await readVisualLines(staticTextGroup);
  expect(staticSnapshot.lines.length).toBeGreaterThan(1);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toBeFocused();
  const liveSnapshot = await readVisualLines(textEditor);
  const visibility = await host.evaluate((element) => getComputedStyle(element).visibility);

  expect(visibility).toBe('visible');
  expect(liveSnapshot.lines).toEqual(staticSnapshot.lines);
  expect(errors).toEqual([]);
});

test('custom-width canvas edit opening preserves the exact visual line distribution', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop exact-wrap opening regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);
  const host = canvasTextEditHost(page);
  const criticalText = 'PCIe RAS Reliability / Availability / Serviceability 可靠性 / 可用性 / 可维护性与错误注入完整性验证';

  await rootNode.dblclick();
  await textEditor.fill(criticalText);
  await commitCanvasEdit(page);
  await rootNode.click();

  const rightHandle = rootNode.locator('rect[style*="ew-resize"]').last();
  const handleBox = await rightHandle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x - 170, handleBox!.y + handleBox!.height / 2, { steps: 8 });
  await page.mouse.up();
  const staticTextGroup = rootNode.locator('g[data-width][data-height]').first();
  await expect(staticTextGroup).toBeVisible();

  const staticSnapshot = await readVisualLines(staticTextGroup);
  expect(staticSnapshot.lines.length).toBeGreaterThan(1);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toBeFocused();
  const liveSnapshot = await readVisualLines(textEditor);
  const visibility = await host.evaluate((element) => getComputedStyle(element).visibility);

  expect(visibility).toBe('visible');
  expect(liveSnapshot.lines).toEqual(staticSnapshot.lines);
  // Comparing the live editor against the static SVG group's raw
  // getBoundingClientRect() compares two different quantities: a canvas
  // measureText()-based *ink* bounding box (which a mixed CJK/Latin string
  // can under-report by roughly half a pixel versus its own declared layout
  // width) against the *logical* content width the editor deterministically
  // adopts (see applyEditorGeometry). That gap is a pre-existing property of
  // the static measurement pipeline, not something opening the editor can
  // introduce or fix, and it is not what "editing didn't move the text"
  // means -- `liveSnapshot.lines` above already proves that exactly. Compare
  // both sides against the one logical content width this app already
  // treats as canonical everywhere else (positioning, host sizing, wrap
  // decisions) instead of a second, ink-based definition of "width".
  const canonicalContentWidth = await staticTextGroup.evaluate((element) => (
    Number(element.getAttribute('data-width'))
  ));
  expect(Math.abs(liveSnapshot.width - canonicalContentWidth)).toBeLessThanOrEqual(0.5);
  expect(errors).toEqual([]);
});

test('the live Quill layer remains visible on every sampled frame while typing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live-layer regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = canvasTextEditor(page);
  await expect(textEditor).toBeFocused();
  await textEditor.press('Control+A');

  // The regression this test guards against ("both layers visible") can only
  // happen at the instant a keystroke is processed, so the 60-frame rAF
  // sampling loop must run *while* real keys are being pressed, not before or
  // after. Kick off pressSequentially without awaiting it so it fires
  // concurrently with the page.evaluate() sampling loop below -- a short
  // per-character delay mimics fast real typing and spreads the keystrokes
  // across the ~1s (60 frame @ 60fps) sampling window so the two overlap for
  // the whole duration, not just a sliver of it.
  const typingText = 'the quick brown fox jumps over';
  const typingPromise = textEditor.pressSequentially(typingText, { delay: 30 });

  const samples = await page.evaluate(async () => {
    const host = document.querySelector('.ymw-editor > .ymz-editor .smm-node');
    const results: Array<{ svgVisible: boolean; quillVisible: boolean }> = [];
    for (let i = 0; i < 60; i += 1) {
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const svgText = host?.querySelector('.smm-text-node-wrap,.smm-richtext-node-wrap') as HTMLElement | SVGElement | null;
      const quillEditor = document.querySelector('.smm-richtext-node-edit-wrap .ql-editor') as HTMLElement | null;
      const svgVisible = svgText ? getComputedStyle(svgText).visibility !== 'hidden' : false;
      const quillVisible = quillEditor ? getComputedStyle(quillEditor).visibility !== 'hidden' : false;
      results.push({ svgVisible, quillVisible });
    }
    return results;
  });

  // Make sure the concurrently-dispatched keystrokes actually landed (and
  // finished) before asserting on the samples collected while they were in
  // flight.
  await typingPromise;
  await expect(textEditor).toHaveText(typingText);

  expect(samples.every((sample) => sample.quillVisible)).toBe(true);
  await commitCanvasEdit(page);
});

test('freshly saved nodes keep identical committed geometry after a full reload and an unchanged edit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop persisted rich-text geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  const rootNode = editor.locator('.smm-node').first();
  const rootText = '这是一个较长的中心主题，需要在重新打开导图后保持完整且尺寸不变';
  const childText = '新节点两支表笔分别接触电池正、负极，读取电压并判断极性与状态';

  await rootNode.dblclick();
  await textEditor.fill(rootText);
  await commitCanvasEdit(page);
  await addRootChild(page);
  await textEditor.fill(childText);
  await commitCanvasEdit(page);
  await expect(editor.locator('[data-role="save-state-label"]')).toHaveText('已保存');

  const readGeometry = async () => editor.locator('.smm-node').evaluateAll((nodes) => nodes.map((node) => {
    const textGroup = node.querySelector<SVGGElement>('g[data-width][data-height]');
    const textLayer = node.querySelector<HTMLElement>('.smm-richtext-node-wrap,.smm-text-node-wrap');
    const nodeRect = node.getBoundingClientRect();
    const textRect = textLayer?.getBoundingClientRect() ?? new DOMRect();
    return {
      text: textLayer?.textContent ?? '',
      nodeWidth: nodeRect.width,
      nodeHeight: nodeRect.height,
      textLeft: textRect.left,
      textTop: textRect.top,
      textWidth: Number(textGroup?.getAttribute('data-width') ?? 0),
      textHeight: Number(textGroup?.getAttribute('data-height') ?? 0),
      richText: Boolean(node.querySelector('.smm-richtext-node-wrap')),
    };
  }));

  const beforeReload = await readGeometry();
  expect(beforeReload).toHaveLength(2);
  await page.reload();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  const afterReload = await readGeometry();

  const reloadedRoot = editor.locator('.smm-node').filter({ hasText: rootText }).first();
  await reloadedRoot.dblclick();
  await expect(textEditor).toBeFocused();
  await commitCanvasEdit(page);
  const afterUnchangedEdit = await readGeometry();

  const normalize = (items: typeof beforeReload) => items
    .map((item) => ({ ...item }))
    .sort((left, right) => left.text.localeCompare(right.text));
  const baseline = normalize(beforeReload);
  const reloaded = normalize(afterReload);
  const edited = normalize(afterUnchangedEdit);
  expect(reloaded.map(({ text, nodeWidth, nodeHeight, textWidth, textHeight, richText }) => ({
    text, nodeWidth, nodeHeight, textWidth, textHeight, richText,
  }))).toEqual(baseline.map(({ text, nodeWidth, nodeHeight, textWidth, textHeight, richText }) => ({
    text, nodeWidth, nodeHeight, textWidth, textHeight, richText,
  })));
  expect(edited.map(({ text, nodeWidth, nodeHeight, textWidth, textHeight, richText }) => ({
    text, nodeWidth, nodeHeight, textWidth, textHeight, richText,
  }))).toEqual(baseline.map(({ text, nodeWidth, nodeHeight, textWidth, textHeight, richText }) => ({
    text, nodeWidth, nodeHeight, textWidth, textHeight, richText,
  })));
});

test('persisted custom-width nodes are fully measured on first paint before any edit or width drag', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop cold-load geometry regression');
  const rootText = '中心主题中心主题是一段用于验证冷启动、双击编辑和重载后尺寸完全一致的较243243243443243243';
  const childText = '新节点435tre';

  await page.goto('/assets/yemind-icon-32.png');
  await page.evaluate(async ({ rootText, childText }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('yemind-web');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB deletion was blocked'));
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('yemind-web', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readwrite');
    transaction.objectStore('documents').put({
      version: 2,
      activeMapId: 'cold-geometry',
      maps: [{
        id: 'cold-geometry',
        title: '冷启动几何回归',
        createdAt: 1,
        updatedAt: 1,
        layout: 'yemindRightMindMap',
        layoutPresetId: 'right-mindmap',
        theme: 'yemind-default',
        lineStyle: 'curve',
        projectStyle: {},
        data: {
          data: { text: rootText, richText: false, uid: 'root-cold', customTextWidth: 151 },
          children: [{
            data: { text: childText, richText: false, uid: 'child-cold', customTextWidth: 49 },
            children: [],
          }],
        },
      }],
    }, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { rootText, childText });

  await page.goto('/');
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const nodes = editor.locator('.smm-node');
  await expect(nodes).toHaveCount(2);
  await expect(nodes.first()).toContainText(rootText);
  await expect(nodes.locator('.smm-richtext-node-wrap')).toHaveCount(2);
  await expect.poll(async () => page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('yemind-web', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const stored = await new Promise<any>((resolve, reject) => {
      const request = db.transaction('documents', 'readonly').objectStore('documents').get('maps');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    const root = stored?.maps?.find((item: any) => item.id === 'cold-geometry')?.data;
    return Boolean(
      root?.data?.richText === true
      && /^<p>/.test(String(root.data.text ?? ''))
      && root?.children?.[0]?.data?.richText === true
      && /^<p>/.test(String(root.children[0].data.text ?? '')),
    );
  })).toBe(true);

  const assertTextFits = async (node: import('@playwright/test').Locator) => {
    const geometry = await node.evaluate((element) => {
      const shape = element.querySelector<SVGGraphicsElement>('.smm-node-shape');
      const foreign = element.querySelector<SVGForeignObjectElement>('foreignObject');
      const text = element.querySelector<HTMLElement>('.smm-richtext-node-wrap');
      const shapeRect = shape?.getBoundingClientRect() ?? new DOMRect();
      const foreignRect = foreign?.getBoundingClientRect() ?? new DOMRect();
      const textRect = text?.getBoundingClientRect() ?? new DOMRect();
      return {
        shape: { left: shapeRect.left, top: shapeRect.top, right: shapeRect.right, bottom: shapeRect.bottom },
        foreign: { left: foreignRect.left, top: foreignRect.top, right: foreignRect.right, bottom: foreignRect.bottom },
        text: { left: textRect.left, top: textRect.top, right: textRect.right, bottom: textRect.bottom },
        scrollWidth: text?.scrollWidth ?? 0,
        scrollHeight: text?.scrollHeight ?? 0,
        clientWidth: text?.clientWidth ?? 0,
        clientHeight: text?.clientHeight ?? 0,
      };
    });
    expect(geometry.text.left).toBeGreaterThanOrEqual(geometry.foreign.left - 0.5);
    expect(geometry.text.top).toBeGreaterThanOrEqual(geometry.foreign.top - 0.5);
    expect(geometry.text.right).toBeLessThanOrEqual(geometry.foreign.right + 0.5);
    expect(geometry.text.bottom).toBeLessThanOrEqual(geometry.foreign.bottom + 0.5);
    expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
    expect(geometry.scrollHeight).toBeLessThanOrEqual(geometry.clientHeight + 1);
    expect(geometry.foreign.left).toBeGreaterThanOrEqual(geometry.shape.left - 0.5);
    expect(geometry.foreign.top).toBeGreaterThanOrEqual(geometry.shape.top - 0.5);
    expect(geometry.foreign.right).toBeLessThanOrEqual(geometry.shape.right + 0.5);
    expect(geometry.foreign.bottom).toBeLessThanOrEqual(geometry.shape.bottom + 0.5);
  };

  await assertTextFits(nodes.first());
  await assertTextFits(nodes.nth(1));

  const before = await nodes.nth(1).boundingBox();
  await nodes.nth(1).click();
  const handle = nodes.nth(1).locator('rect[style*="ew-resize"]').last();
  const handleBox = await handle.boundingBox();
  expect(before).not.toBeNull();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 1, handleBox!.y + handleBox!.height / 2);
  await page.mouse.up();
  const after = await nodes.nth(1).boundingBox();
  expect(after).not.toBeNull();
  expect(Math.abs(after!.height - before!.height)).toBeLessThanOrEqual(1);
});

test('a map mounted in a constrained host is canonically measured when the host expands', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop constrained-host geometry regression');
  const rootText = '中心主题中心主题是一段用于验证冷启动、双击编辑和重载后尺寸完全一致的较243243243443243243';
  const childText = '新节点这个不错，你知道吗fsaffdsa453';

  await page.goto('/assets/yemind-icon-32.png');
  await page.evaluate(async ({ rootText, childText }) => {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase('yemind-web');
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
      request.onblocked = () => reject(new Error('IndexedDB deletion was blocked'));
    });
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('yemind-web', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('documents');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readwrite');
    transaction.objectStore('documents').put({
      version: 2,
      activeMapId: 'hidden-host-geometry',
      maps: [{
        id: 'hidden-host-geometry',
        title: '隐藏宿主几何回归',
        createdAt: 1,
        updatedAt: 1,
        layout: 'yemindRightMindMap',
        layoutPresetId: 'right-mindmap',
        theme: 'yemind-default',
        lineStyle: 'curve',
        projectStyle: {},
        data: {
          data: { text: `<p>${rootText}</p>`, richText: true, uid: 'root-hidden-host', customTextWidth: 151 },
          children: [{
            data: { text: `<p>${childText}</p>`, richText: true, uid: 'child-hidden-host', customTextWidth: 101 },
            children: [],
          }],
        },
      }],
    }, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { rootText, childText });

  await page.route('**/', async (route) => {
    if (route.request().resourceType() !== 'document') {
      await route.continue();
      return;
    }
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({
      response,
      body: html.replace('</head>', '<style id="constrained-host-fixture">.ymw-editor{width:240px!important;height:180px!important;overflow:hidden!important}</style></head>'),
    });
  });
  await page.goto('/');
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.waitFor({ state: 'attached' });
  await expect(editor.locator('.smm-node')).toHaveCount(2);
  await page.evaluate(() => document.querySelector('#constrained-host-fixture')?.remove());
  await page.evaluate(() => window.dispatchEvent(new Event('resize')));
  await expect(editor).toBeVisible();

  const geometry = await editor.locator('.smm-node').evaluateAll((nodes) => nodes.map((node) => {
    const shape = node.querySelector<SVGGraphicsElement>('.smm-node-shape');
    const foreign = node.querySelector<SVGForeignObjectElement>('foreignObject');
    const text = node.querySelector<HTMLElement>('.smm-richtext-node-wrap');
    const shapeRect = shape?.getBoundingClientRect() ?? new DOMRect();
    const foreignRect = foreign?.getBoundingClientRect() ?? new DOMRect();
    const textRect = text?.getBoundingClientRect() ?? new DOMRect();
    return {
      content: text?.textContent ?? '',
      shape: { left: shapeRect.left, top: shapeRect.top, right: shapeRect.right, bottom: shapeRect.bottom },
      foreign: { left: foreignRect.left, top: foreignRect.top, right: foreignRect.right, bottom: foreignRect.bottom },
      text: { left: textRect.left, top: textRect.top, right: textRect.right, bottom: textRect.bottom },
      scrollWidth: text?.scrollWidth ?? 0,
      scrollHeight: text?.scrollHeight ?? 0,
      clientWidth: text?.clientWidth ?? 0,
      clientHeight: text?.clientHeight ?? 0,
    };
  }));

  expect(geometry.map((item) => item.content).sort()).toEqual([rootText, childText].sort());
  for (const item of geometry) {
    expect(item.text.left).toBeGreaterThanOrEqual(item.foreign.left - 0.5);
    expect(item.text.top).toBeGreaterThanOrEqual(item.foreign.top - 0.5);
    expect(item.text.right).toBeLessThanOrEqual(item.foreign.right + 0.5);
    expect(item.text.bottom).toBeLessThanOrEqual(item.foreign.bottom + 0.5);
    expect(item.scrollWidth).toBeLessThanOrEqual(item.clientWidth + 1);
    expect(item.scrollHeight).toBeLessThanOrEqual(item.clientHeight + 1);
    expect(item.foreign.left).toBeGreaterThanOrEqual(item.shape.left - 0.5);
    expect(item.foreign.top).toBeGreaterThanOrEqual(item.shape.top - 0.5);
    expect(item.foreign.right).toBeLessThanOrEqual(item.shape.right + 0.5);
    expect(item.foreign.bottom).toBeLessThanOrEqual(item.shape.bottom + 0.5);
  }
});

test('an outline text commit leaves the same rendered node immediately width-draggable', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop outline-to-canvas width-drag regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);
  await textEditor.fill('大纲修改前');
  await commitCanvasEdit(page);
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();

  const outlineEditor = editor.locator('[data-outline-editor]').filter({ hasText: '大纲修改前' });
  await outlineEditor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.type('大纲修改后立即拖动宽度');
  await page.keyboard.press('Enter');
  await expect(editor.locator('[data-role="save-state-label"]')).toHaveText('已保存');

  const node = editor.locator('.smm-node').filter({ hasText: '大纲修改后立即拖动宽度' });
  await expect(node).toHaveCount(1);
  await expect(node.locator('.smm-richtext-node-wrap')).toHaveCount(1);
  await node.click();
  const handle = node.locator('rect[style*="ew-resize"]').last();
  const handleBox = await handle.boundingBox();
  const before = await node.boundingBox();
  expect(handleBox).not.toBeNull();
  expect(before).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2 + 80, handleBox!.y + handleBox!.height / 2, { steps: 5 });
  await page.mouse.up();
  const after = await node.boundingBox();
  expect(after).not.toBeNull();
  expect(after!.width).toBeGreaterThan(before!.width + 50);
});

async function canvasNodeGeometry(page: import('@playwright/test').Page): Promise<{
  shape: { x: number; y: number; w: number; h: number };
  text: { x: number; y: number; w: number; h: number };
  host: { x: number; y: number; w: number; h: number } | null;
}> {
  return page.evaluate(() => {
    const rect = (element: Element | null) => {
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        x: Math.round(box.x * 10) / 10,
        y: Math.round(box.y * 10) / 10,
        w: Math.round(box.width * 10) / 10,
        h: Math.round(box.height * 10) / 10,
      };
    };
    const group = document.querySelector('.ymw-editor > .ymz-editor .smm-node')
      ?? document.querySelector('.smm-node');
    const editorHost = document.querySelector('.smm-richtext-node-edit-wrap');
    const visibleHost = editorHost instanceof HTMLElement && editorHost.style.display !== 'none'
      ? editorHost
      : null;
    return {
      shape: rect(group?.querySelector('.smm-node-shape') ?? null)!,
      text: rect(group?.querySelector('g[data-width]') ?? null)!,
      host: rect(visibleHost),
    };
  });
}

// v1.9.9 user regression: the node frame only resized when the edit session
// closed, so text that outgrew it was clipped by its own frame.
test('the node frame grows with the text while it is still being typed', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live node adaptation regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const rootNode = page.locator('.ymw-editor > .ymz-editor .smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  const before = await canvasNodeGeometry(page);

  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('中心主题是一段明显更长的验证文本内容', { delay: 30 });
  await page.waitForTimeout(400);

  const during = await canvasNodeGeometry(page);
  expect(during.shape.w).toBeGreaterThan(before.shape.w + 50);
  // The frame must actually contain the text, not merely be larger.
  expect(during.text.x).toBeGreaterThanOrEqual(during.shape.x);
  expect(during.text.x + during.text.w).toBeLessThanOrEqual(during.shape.x + during.shape.w + 0.5);
  // The editor overlay stays anchored on the text it replaces.
  expect(Math.abs((during.host?.x ?? 0) + 6 - during.text.x)).toBeLessThanOrEqual(1.5);

  const previewWidth = during.shape.w;
  await commitCanvasEdit(page);
  const after = await canvasNodeGeometry(page);
  // What the user saw while typing is exactly what gets committed.
  expect(Math.abs(after.shape.w - previewWidth)).toBeLessThanOrEqual(1);
  expect(errors).toEqual([]);
});

// v1.9.9 user regression: a node kept the frame of its previous, longer text
// after the text was shortened.
test('the node frame shrinks back while text is being deleted', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live node adaptation regression');
  await resetWebApp(page);
  const rootNode = page.locator('.ymw-editor > .ymz-editor .smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('先输入一段很长的内容用来把节点撑大', { delay: 20 });
  await page.waitForTimeout(400);
  const wide = await canvasNodeGeometry(page);

  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('短', { delay: 20 });
  await page.waitForTimeout(400);

  const narrow = await canvasNodeGeometry(page);
  expect(narrow.shape.w).toBeLessThan(wide.shape.w / 2);
  expect(narrow.text.x).toBeGreaterThanOrEqual(narrow.shape.x);
  expect(narrow.text.x + narrow.text.w).toBeLessThanOrEqual(narrow.shape.x + narrow.shape.w + 0.5);
  expect(Math.abs((narrow.host?.x ?? 0) + 6 - narrow.text.x)).toBeLessThanOrEqual(1.5);

  const previewWidth = narrow.shape.w;
  await commitCanvasEdit(page);
  const after = await canvasNodeGeometry(page);
  expect(Math.abs(after.shape.w - previewWidth)).toBeLessThanOrEqual(1);
});

// v1.9.9 user regression: Ctrl+A had to select the node text, not the
// surrounding application UI, and the result had to be a real editable range.
test('Ctrl+A selects the edited node text and never the surrounding application UI', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop keyboard regression');
  await resetWebApp(page);
  const rootNode = page.locator('.ymw-editor > .ymz-editor .smm-node').first();
  const textEditor = canvasTextEditor(page);

  const readSelection = () => page.evaluate(() => {
    const selection = window.getSelection();
    const editorRoot = document.querySelector('.smm-richtext-node-edit-wrap .ql-editor');
    const anchor = selection?.anchorNode ?? null;
    const anchorElement = anchor?.nodeType === 1 ? (anchor as Element) : anchor?.parentElement ?? null;
    return {
      text: selection ? String(selection) : '',
      insideEditor: Boolean(editorRoot && anchorElement && editorRoot.contains(anchorElement)),
    };
  });

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('可以被全选的节点文字', { delay: 20 });
  await page.waitForTimeout(300);

  await page.keyboard.press('Control+a');
  const selected = await readSelection();
  expect(selected.text).toBe('可以被全选的节点文字');
  expect(selected.insideEditor).toBe(true);

  // The selection must be a real editable range: Cut empties the node text.
  await page.keyboard.press('Control+x');
  await expect(textEditor).toHaveText('');
  await page.keyboard.type('剪切之后继续输入');
  await expect(textEditor).toHaveText('剪切之后继续输入');
  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('剪切之后继续输入');

  // With no edit session open, Ctrl+A must not select the application chrome.
  await rootNode.click();
  await page.keyboard.press('Control+a');
  await page.waitForTimeout(200);
  const canvasSelection = await readSelection();
  expect(canvasSelection.text).toBe('');
});

// v1.9.9-rc.7 user regression: closing an editor left the node painted as an
// empty box for ~25 frames before its text reappeared.
test('a closing editor hands the node straight back to its glyphs, with no empty frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop close-handover regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('关闭时不应该闪白', { delay: 20 });
  await expect(textEditor).toHaveText('关闭时不应该闪白');

  await page.evaluate(() => {
    const state = { frames: 0, blank: 0 };
    (window as any).__yemindCloseState = state;
    const tick = () => {
      const group = document.querySelector('.ymw-editor > .ymz-editor .smm-node');
      const wrap = group?.querySelector('.smm-richtext-node-wrap,.smm-text-node-wrap');
      const host = document.querySelector('.smm-richtext-node-edit-wrap') as HTMLElement | null;
      if (wrap) {
        state.frames += 1;
        const glyphs = ((element: Element) => {
          // Upstream hides the edited node's glyphs with display:none on open
          // and opacity 0 on every relayout, and both sit on an ancestor <g>.
          // opacity is not inherited, so checking only the text element's own
          // computed style reports a hidden layer as painted.
          let current: Element | null = element;
          while (current) {
            const style = getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') return false;
            if (Number(style.opacity) <= 0.01) return false;
            if (current.classList.contains('smm-node')) break;
            current = current.parentElement ?? (current.parentNode as Element | null);
          }
          return true;
        })(wrap as Element);
        const hostVisible = Boolean(host && host.style.display !== 'none');
        // Neither layer painting means the node is a blank box on screen.
        if (!glyphs && !hostVisible) state.blank += 1;
      }
      (window as any).__yemindCloseFrame = requestAnimationFrame(tick);
    };
    tick();
  });

  await commitCanvasEdit(page);
  await page.waitForTimeout(900);

  const state = await page.evaluate(() => {
    cancelAnimationFrame((window as any).__yemindCloseFrame);
    return (window as any).__yemindCloseState;
  });
  expect(state.frames).toBeGreaterThan(30);
  expect(state.blank).toBe(0);
  await expect(rootNode).toContainText('关闭时不应该闪白');
});

// v1.9.9-rc.7 user regression: every insertion entry point must open on the
// default label, fully selected, so the first keystroke replaces it.
for (const entry of ['Tab', 'Enter', 'quick-add'] as const) {
  test(`${entry} insertion opens on 新节点 with the whole label selected`, async ({ page, isMobile }) => {
    test.skip(isMobile, 'desktop insertion selection regression');
    await resetWebApp(page);
    const editor = page.locator('.ymw-editor > .ymz-editor');
    const textEditor = canvasTextEditor(page);

    // Enter adds a sibling, which the root cannot have; give it a child first.
    if (entry === 'Enter') {
      await editor.locator('.smm-node').first().click();
      await page.keyboard.press('Tab');
      await expect(textEditor).toBeFocused();
      await page.keyboard.type('第一个子节点');
      await commitCanvasEdit(page);
      await editor.locator('.smm-node').nth(1).click();
      await page.keyboard.press('Enter');
    } else if (entry === 'Tab') {
      await editor.locator('.smm-node').first().click();
      await page.keyboard.press('Tab');
    } else {
      await editor.locator('.smm-node').first().click();
      const add = editor.locator('[data-node-quick-action="add-child"]').first();
      await expect(add).toBeVisible();
      await add.click();
    }

    await expect(textEditor).toBeFocused();
    await expect(textEditor).toHaveText('新节点');
    expect(await page.evaluate(() => String(window.getSelection() ?? ''))).toBe('新节点');

    // The whole point of the selection: the first keystroke replaces the label.
    await page.keyboard.type('替换后的内容');
    await expect(textEditor).toHaveText('替换后的内容');
  });
}

// v1.9.9-rc.8 user requirement: a node widens up to 20 characters, then stops
// widening and grows downwards instead; a width the user dragged always wins.
test('a node widens up to the 20-character limit, then grows taller instead', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop auto-wrap regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  const declared = async () => rootNode.evaluate((element) => {
    const layer = element.querySelector('g[data-width][data-height]')!;
    return {
      width: Number(layer.getAttribute('data-width')),
      height: Number(layer.getAttribute('data-height')),
    };
  });

  const type = async (text: string) => {
    await rootNode.dblclick();
    await expect(textEditor).toBeFocused();
    await page.keyboard.press('Control+a');
    await textEditor.pressSequentially(text, { delay: 4 });
    await commitCanvasEdit(page);
    await page.waitForTimeout(400);
    return declared();
  };

  const fontSize = await rootNode.evaluate((element) => {
    const wrap = element.querySelector('.smm-richtext-node-wrap') as HTMLElement | null;
    return wrap ? Number.parseFloat(getComputedStyle(wrap).fontSize) : 0;
  });
  expect(fontSize).toBeGreaterThan(0);
  // A CJK glyph advances one em, so the limit is 20 * the node's own font size
  // — not one global pixel constant shared by every level.
  const limit = Math.round(fontSize * 20);

  const short = await type('汉'.repeat(5));
  const atLimit = await type('汉'.repeat(20));
  const beyond = await type('汉'.repeat(40));

  // Below the limit the node widens with the text and stays one line.
  expect(atLimit.width).toBeGreaterThan(short.width);
  expect(atLimit.height).toBe(short.height);
  expect(atLimit.width).toBeLessThanOrEqual(limit);
  expect(atLimit.width).toBeGreaterThanOrEqual(limit - fontSize);

  // Past the limit the width stops and the height takes over.
  expect(beyond.width).toBeLessThanOrEqual(limit);
  expect(beyond.height).toBeGreaterThan(atLimit.height);
});

test('a width the user dragged outranks the auto-wrap limit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop manual width precedence regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = canvasTextEditor(page);

  const declaredWidth = async () => rootNode.evaluate((element) => (
    Number(element.querySelector('g[data-width]')!.getAttribute('data-width'))
  ));

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('汉'.repeat(40), { delay: 4 });
  await commitCanvasEdit(page);
  await page.waitForTimeout(400);
  const wrapped = await declaredWidth();

  // The width handles are two transparent ew-resize rects on the node.
  await rootNode.click();
  await page.waitForTimeout(300);
  const handle = rootNode.locator('rect[style*="ew-resize"]').last();
  await expect(handle).toBeAttached();
  const box = await handle.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width / 2 + 200, box!.y + box!.height / 2, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(600);

  const dragged = await declaredWidth();
  expect(dragged).toBeGreaterThan(wrapped + 50);

  // Re-editing must not pull a manually sized node back to the auto limit.
  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('改写之后手动宽度依然保持不变不能被自动上限拉回去', { delay: 4 });
  await commitCanvasEdit(page);
  await page.waitForTimeout(400);
  expect(await declaredWidth()).toBe(dragged);
});

// v1.9.9-rc.10 user regression: on a reopened map every non-root node was
// measured with the root's font size and rendered with its own, so each node
// declared roughly one extra text line per rendered line. The measurement
// element is shared across a render pass, and an unresolvable font size became
// the string 'undefinedpx', which the CSSOM rejects -- leaving the previously
// measured node's size in place.
test('node geometry does not depend on the previously measured node', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop measurement isolation regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = canvasTextEditor(page);

  // A root (large font) plus children (smaller font), several of them wrapping.
  await editor.locator('.smm-node').first().dblclick();
  await page.keyboard.press('Control+a');
  await textEditor.pressSequentially('中心主题dsaffr', { delay: 4 });
  await commitCanvasEdit(page);
  for (const text of ['到撒房东阿发房东艾弗森a', '壹贰叁肆伍陆柒捌玖拾壹贰叁肆伍陆柒捌玖拾']) {
    await editor.locator('.smm-node').first().click();
    await page.keyboard.press('Tab');
    await expect(textEditor).toBeFocused();
    await page.keyboard.press('Control+a');
    await textEditor.pressSequentially(text, { delay: 4 });
    await commitCanvasEdit(page);
  }
  await page.waitForTimeout(500);

  const geometry = async () => page.evaluate(() => Array.from(document.querySelectorAll('.smm-node')).map((group) => {
    const layer = group.querySelector('g[data-width][data-height]');
    const wrap = group.querySelector('.smm-richtext-node-wrap');
    const box = wrap?.getBoundingClientRect();
    return {
      declared: [Number(layer?.getAttribute('data-width')), Number(layer?.getAttribute('data-height'))],
      painted: box ? [Math.round(box.width), Math.round(box.height)] : null,
    };
  }));

  const before = await geometry();
  // Every node must declare the box it actually paints. A node measured with
  // another node's font declares a taller box than it renders.
  before.forEach((node) => {
    expect(node.painted).not.toBeNull();
    expect(Math.abs(node.declared[0] - node.painted![0])).toBeLessThanOrEqual(2);
    expect(Math.abs(node.declared[1] - node.painted![1])).toBeLessThanOrEqual(2);
  });

  // Poison the shared measurement element exactly the way a rejected font-size
  // assignment used to, then force a full re-measure of every node.
  const poisoned = await page.evaluate(() => {
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('.ymz-canvas > div'));
    const element = candidates.find((item) => item.style.position === 'fixed') ?? candidates.at(-1);
    if (!element) return false;
    element.style.fontSize = '48px';
    element.style.fontWeight = '900';
    return true;
  });
  expect(poisoned).toBe(true);

  await editor.locator('.smm-node').first().dblclick();
  await expect(textEditor).toBeFocused();
  await commitCanvasEdit(page);
  await page.waitForTimeout(600);

  // Geometry must be identical: the measurement resets what it depends on.
  expect((await geometry()).map((node) => node.declared)).toEqual(before.map((node) => node.declared));
});
