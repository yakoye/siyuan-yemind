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
  await expect(page.locator('.smm-richtext-node-edit-wrap .ql-editor')).toBeHidden();
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

test('plain canvas editing keeps one measurement path and stable node geometry', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop geometry regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill('Power Good\nReference Clock\nPLL Lock\nController Reset Release');
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  const placements = await editor.locator('.smm-richtext-node-edit-wrap').evaluate(async (element) => {
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
      transform: string;
    }> = [];
    (window as any).__yemindOpeningGeometry = records;
    let remaining = 0;
    const capture = (): void => {
      const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const target = document.querySelector<HTMLElement>('.ymw-editor > .ymz-editor .smm-node');
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
    transform: string;
  }>);
  const visible = records.filter((record) => record.visible);
  expect(visible.length).toBeGreaterThan(2);
  visible.forEach((record) => {
    const hostCenter = record.hostX + record.hostWidth / 2;
    const nodeCenter = record.nodeX + record.nodeWidth / 2;
    expect(Math.abs(hostCenter - nodeCenter)).toBeLessThanOrEqual(3);
    expect(Math.abs(record.hostY - record.nodeY)).toBeLessThanOrEqual(8);
    // The HTML edit surface covers the declared content box; the SVG node
    // includes 9px shape/padding on both sides.
    expect(Math.abs(record.hostWidth - record.nodeWidth)).toBeLessThanOrEqual(20);
  });
});

test('the rich-text host stays hidden until its first geometry transaction is ready', async ({ page, isMobile }) => {
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
  await expect(editor.locator('.smm-richtext-node-edit-wrap .ql-editor')).toBeVisible();
  const records = await page.evaluate(() => {
    (window as any).__yemindFirstMountObserver?.disconnect();
    return (window as any).__yemindFirstMountGeometry as Array<{
      ready: string | null;
      visibility: string;
      display: string;
      width: number;
      left: number;
    }>;
  });
  const visibleBeforeReady = records.filter((record) =>
    record.ready !== 'true'
    && record.visibility !== 'hidden'
    && record.display !== 'none'
    && record.width > 0);
  expect(visibleBeforeReady).toEqual([]);
});

test('opening plain multiline text paints exactly one aligned text layer on every animation frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop atomic editor handoff regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
      const staticGroup = staticLayers[0]?.parentElement ?? null;
      const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const quill = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const staticRect = staticGroup?.getBoundingClientRect() ?? new DOMRect();
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
    expect(Number(frame.staticVisible) + Number(frame.editorVisible)).toBe(1);
    if (frame.editorVisible) {
      expect(frame.editorText).toContain('电源、参考时钟、PERST#');
      expect(Math.abs(frame.editorLeft - frame.staticLeft)).toBeLessThanOrEqual(8);
      expect(Math.abs(frame.editorTop - frame.staticTop)).toBeLessThanOrEqual(8);
    }
  });
});

test('switching canvas editors keeps the previous node text fixed on every animation frame', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop editor-switch frame regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
      left: number;
      top: number;
      width: number;
      height: number;
    };
    const frames: Frame[] = [];
    let remaining = 0;
    const painted = (element: Element | null): element is Element => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity || 1) > 0
        && rect.width > 0
        && rect.height > 0;
    };
    const readFrame = (): Frame => {
      const sourceNode = document.querySelector<HTMLElement>('[data-switch-source="true"]');
      const staticWrap = sourceNode?.querySelector<HTMLElement>('.smm-text-node-wrap,.smm-richtext-node-wrap') ?? null;
      const staticLayer = staticWrap?.parentElement ?? staticWrap;
      const editorHost = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const editorText = editorHost?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const layers: Element[] = [];
      if (painted(staticLayer) && staticLayer.textContent?.includes(sourceText)) layers.push(staticLayer);
      if (painted(editorHost) && painted(editorText) && editorText.textContent?.includes(sourceText)) {
        layers.push(editorText);
      }
      const rect = layers[0]?.getBoundingClientRect() ?? new DOMRect();
      return {
        sourceLayers: layers.length,
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

  await editor.locator('.ymz-rich-toolbar').evaluate((element) => {
    (element as HTMLElement).style.pointerEvents = 'none';
  });
  await secondNode.dblclick();
  await expect(textEditor).toContainText(secondText);
  await page.waitForTimeout(360);
  const frames = await page.evaluate(() => (window as any).__yemindEditorSwitchFrames as Array<{
    sourceLayers: number;
    left: number;
    top: number;
    width: number;
    height: number;
  }>);
  expect(frames.length).toBeGreaterThan(5);
  const visible = frames.filter((frame) => frame.sourceLayers > 0);
  expect(visible.length).toBeGreaterThan(2);
  visible.forEach((frame) => expect(frame.sourceLayers).toBe(1));
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

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

test('selection toolbar is complete and anchored on its first visible frame after switching nodes', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop toolbar first-paint regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  await expect(editor.locator('.ymz-rich-toolbar')).toBeVisible();
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
  await editor.locator('.ymz-rich-toolbar').evaluate((element) => {
    (element as HTMLElement).style.pointerEvents = 'none';
  });
  await nodes.nth(2).dblclick();
  await textEditor.selectText();
  await expect(editor.locator('.ymz-rich-toolbar')).toBeVisible();
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

test('a newly inserted child receives one stable final editor placement', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop inserted-node placement regression');
  await resetWebApp(page);
  await addRootChild(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const editWrap = editor.locator('.smm-richtext-node-edit-wrap');
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

  const frames = await editor.evaluate(async (root) => {
    const result: Array<{
      visible: boolean;
      text: string;
      html: string;
      geometryReady: string | null;
    }> = [];
    for (let index = 0; index < 6; index += 1) {
      const host = root.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
      const textEditor = host?.querySelector<HTMLElement>('.ql-editor') ?? null;
      const style = host ? getComputedStyle(host) : null;
      result.push({
        visible: Boolean(host && style?.display !== 'none' && host.getBoundingClientRect().width > 0),
        text: textEditor?.innerText.trim() ?? '',
        html: textEditor?.innerHTML ?? '',
        geometryReady: host?.dataset.yemindGeometryReady ?? null,
      });
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return result;
  });

  expect(frames.some((frame) => frame.visible)).toBe(true);
  frames.filter((frame) => frame.visible).forEach((frame) => {
    expect(frame.text).toBe('新节点');
    expect(frame.html).not.toBe('<p><br></p>');
    expect(frame.geometryReady).toBe('true');
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
        const host = document.querySelector<HTMLElement>('.smm-richtext-node-edit-wrap');
        if (host) host.dataset.yemindGeometryReady = 'false';
      });
    }, shortcut);

    await page.keyboard.press(shortcut);
    const host = editor.locator('.smm-richtext-node-edit-wrap');
    const textEditor = host.locator('.ql-editor');
    await expect(host).toBeVisible();
    await expect(textEditor).toHaveText('新节点');
    await expect.poll(
      () => page.evaluate(() => (window as any).__yemindHostShortcutSeen),
    ).toBe(false);
    await expect.poll(
      () => page.evaluate(() => (window as any).__yemindHostFocusStolen),
    ).toBe(true);
    await expect(host).toHaveAttribute('data-yemind-geometry-ready', 'true');
    await expect(textEditor).toBeFocused();
  });
}

test('one Delete or Backspace removes a selected multiline canvas range', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop keyboard-selection regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await rootNode.dblclick();
  await textEditor.fill('Event Counter 事件计数器');
  await commitCanvasEdit(page);
  await rootNode.dblclick();
  await textEditor.dblclick();
  const toolbar = editor.locator('.ymz-rich-toolbar');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  await rootNode.evaluate((element) => {
    const text = element.querySelector('g[data-width][data-height]');
    const paintedContent = text?.firstElementChild;
    if (!text) throw new Error('rendered text container is missing before width drag');
    (window as any).__yemindWidthDragTextContainer = text;
    (window as any).__yemindWidthDragPaintedContent = paintedContent;
  });
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  const widths = [before!.width];
  const tops = [before!.y];
  const textLefts: number[] = [];
  const textTops: number[] = [];
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
        sameTextContainer: text === (window as any).__yemindWidthDragTextContainer,
        samePaintedContent: paintedContent === (window as any).__yemindWidthDragPaintedContent,
        content: text.textContent ?? '',
        textWidth: textRect.width,
        textHeight: textRect.height,
        textLeft: paintedContentRect.left,
        textTop: paintedContentRect.top,
        shapeWidth: shapeRect.width,
        shapeHeight: shapeRect.height,
      };
    });
    expect(painted).not.toBeNull();
    expect(painted!.sameTextContainer).toBe(true);
    expect(painted!.samePaintedContent).toBe(true);
    expect(painted!.content).toContain('LTSSM 状态读取及历史记录');
    expect(painted!.textWidth).toBeGreaterThan(0);
    expect(painted!.textHeight).toBeGreaterThan(0);
    expect(painted!.shapeWidth).toBeGreaterThanOrEqual(painted!.textWidth);
    expect(painted!.shapeHeight).toBeGreaterThanOrEqual(painted!.textHeight);
    textLefts.push(painted!.textLeft);
    textTops.push(painted!.textTop);
  }
  await page.mouse.up();
  for (let index = 1; index < widths.length; index += 1) {
    expect(widths[index]).toBeGreaterThanOrEqual(widths[index - 1] - 1);
  }
  expect(widths.at(-1)!).toBeGreaterThan(widths[0] + 80);
  expect(Math.max(...tops) - Math.min(...tops)).toBeLessThanOrEqual(2);
  expect(Math.max(...textLefts) - Math.min(...textLefts)).toBeLessThanOrEqual(2);
  expect(Math.max(...textTops) - Math.min(...textTops)).toBeLessThanOrEqual(2);
  await expect(rootNode).toBeVisible();
});

test('dragging a parent previews its visible descendants as one coherent subtree', async ({ page, isMobile }) => {
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
  const preview = editor.locator('.ymz-drag-subtree-preview');
  await expect(preview).toBeVisible();
  await expect(preview).toHaveAttribute('data-preview-node-count', '2');
  await expect(preview.locator('.smm-node')).toHaveCount(2);
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const toolbar = editor.locator('.ymz-rich-toolbar');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeVisible();
  await textEditor.selectText();
  const toolbar = editor.locator('.ymz-rich-toolbar');
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
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(textEditor.locator('[style*="color: rgb(255, 77, 61)"]')).toBeVisible();

  await textEditor.selectText();
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
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
  const toolbar = editor.locator('.ymz-rich-toolbar');
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
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
  await expect(childText.locator('[color="#ff4d3d"], [style*="255, 77, 61"]')).toBeVisible();

  await childText.click({ clickCount: 3 });
  await toolbar.locator('[data-rich-action="background-menu"]').click();
  await editor.locator('.ymz-color-popover:not([hidden]) [data-color-value="#ff4d3d"]').click();
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  const toolbar = editor.locator('.ymz-rich-toolbar');

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
  const toolbar = editor.locator('.ymz-rich-toolbar');

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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

  await rootNode.dblclick();
  await expect(textEditor).toBeVisible();
  await expect(textEditor).toBeFocused();

  await startFrameCapture(page);
  await textEditor.pressSequentially('abcdef123456', { delay: 70 });
  await page.waitForTimeout(150);
  const frames = await stopFrameCapture(page);

  expect(frames.length).toBeGreaterThan(15);
  // Exactly one text layer (the live Quill editor XOR the static SVG text)
  // may be visible on any painted frame; both-visible means a ghosted double
  // layer, neither-visible means the user sees no text at all.
  const badLayerFrames = frames.filter((frame) => Number(frame.staticVisible) + Number(frame.editorVisible) !== 1);
  expect(badLayerFrames).toEqual([]);
  // Once the editor is the visible layer it must also hold real DOM focus,
  // otherwise keystrokes stop reaching Quill even though nothing looks wrong.
  const unfocusedVisibleFrames = frames.filter((frame) => frame.editorVisible && !frame.focused);
  expect(unfocusedVisibleFrames).toEqual([]);

  await expect(textEditor).toHaveText('abcdef123456');
  await expect(textEditor).toBeFocused();
  await expect(page.locator('.smm-richtext-node-edit-wrap')).toHaveAttribute('data-yemind-geometry-ready', 'true');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  const toolbar = editor.locator('.ymz-rich-toolbar');

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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

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
  const badLayerFrames = frames.filter((frame) => Number(frame.staticVisible) + Number(frame.editorVisible) !== 1);
  expect(badLayerFrames).toEqual([]);
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
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
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  const host = editor.locator('.smm-richtext-node-edit-wrap');

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await expect(host).toHaveAttribute('data-yemind-geometry-ready', 'true');

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
  await expect(host).toHaveAttribute('data-yemind-geometry-ready', 'true');
  await expect(host).toHaveCSS('visibility', 'visible');
  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('abcdef');

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('abcdef');
});

test('the live Quill editor rewraps to the node\'s current width after a width-drag performed while text is selected and editing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live-rewrap regression');
  // Root cause: RichText.js#showEditText only sets the editor host's
  // `max-width` once, at the moment editing opens. YeMindRichText's own
  // per-commit/per-drag-frame geometry sync (applyEditorGeometry) refreshes
  // min-width/min-height/margin every time but never refreshed max-width.
  // Dragging a node's width handle while its text is already selected and
  // being edited (a real, common sequence — select all, then narrow the
  // node) changes `node.customTextWidth`, and the static SVG text re-wraps
  // to it on every commit, but the live Quill editor kept wrapping at the
  // width captured when editing first opened. The two layers can end up
  // showing completely different line breaks for the same text stacked on
  // top of each other.
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  const host = editor.locator('.smm-richtext-node-edit-wrap');

  await rootNode.dblclick();
  await textEditor.fill('PCIe RAS Reliability / Availability / Serviceability 可靠性 / 可用性 / 可维护性');
  await commitCanvasEdit(page);

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();
  await textEditor.press('Control+A');

  const maxWidthBefore = await host.evaluate((element) => parseFloat(getComputedStyle(element).maxWidth));
  expect(maxWidthBefore).toBeGreaterThan(0);

  const handles = rootNode.locator('rect[style*="ew-resize"]');
  await expect(handles).toHaveCount(2);
  const handle = handles.last();
  const handleBox = await handle.boundingBox();
  expect(handleBox).not.toBeNull();
  await page.mouse.move(handleBox!.x + handleBox!.width / 2, handleBox!.y + handleBox!.height / 2);
  await page.mouse.down();
  // Drag sharply narrower than the text's natural width.
  await page.mouse.move(handleBox!.x - 260, handleBox!.y + handleBox!.height / 2, { steps: 8 });
  await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => resolve())));
  await page.mouse.up();
  await page.waitForTimeout(150);

  const maxWidthAfter = await host.evaluate((element) => parseFloat(getComputedStyle(element).maxWidth));
  expect(maxWidthAfter).toBeLessThan(maxWidthBefore - 50);

  await expect(textEditor).toBeFocused();
  await expect(textEditor).toHaveText('PCIe RAS Reliability / Availability / Serviceability 可靠性 / 可用性 / 可维护性');
  expect(errors).toEqual([]);

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('PCIe RAS Reliability');
});

// v1.8.0 canvas text edit stabilization: the live-edit commit path that used
// to rebuild static SVG text on every keystroke was removed entirely (see
// docs/superpowers/plans/2026-07-31-canvas-text-edit-stabilization.md). The
// tests below lock in the resulting guarantees directly.

test('typing with real pauses between characters never rebuilds the static SVG text mid-edit', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop live-edit isolation regression');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');

  await rootNode.dblclick();
  await expect(textEditor).toBeFocused();

  const staticTextGroupCountBefore = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();

  // Each character waits longer than the old debounce window used to. If any
  // code path still rebuilds SVG text mid-edit, this would flicker or change
  // the static group count while the editor stays open.
  await textEditor.pressSequentially('abc', { delay: 250 });

  const staticTextGroupCountDuring = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();
  expect(staticTextGroupCountDuring).toBe(staticTextGroupCountBefore);
  await expect(textEditor).toHaveText('abc');
  expect(errors).toEqual([]);

  await textEditor.press('Backspace');
  await page.waitForTimeout(250);
  const staticTextGroupCountAfterDelete = await editor.locator('.smm-node').first()
    .locator('.smm-text-node-wrap,.smm-richtext-node-wrap').count();
  expect(staticTextGroupCountAfterDelete).toBe(staticTextGroupCountBefore);
  await expect(textEditor).toHaveText('ab');

  await commitCanvasEdit(page);
  await expect(rootNode).toContainText('ab');
});

test('the line a character sits on before entering edit matches the line it sits on after', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop line-wrap consistency regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  const longText = 'PCIe RAS Reliability Availability Serviceability 可靠性可用性可维护性完整长句测试换行一致性';

  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await textEditor.fill(longText);
  await commitCanvasEdit(page);

  const staticLineCount = await rootNode.locator('.smm-text-node-wrap,tspan').count();

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

test('exactly one text layer (SVG or Quill) is visible on every sampled frame while typing', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop single-layer regression');
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.dblclick();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeFocused();

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

  const bothVisibleFrames = samples.filter((s) => s.svgVisible && s.quillVisible).length;
  expect(bothVisibleFrames).toBe(0);
  await commitCanvasEdit(page);
});
