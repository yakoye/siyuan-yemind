import { expect, test } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

test('creates, renames and restores a map from IndexedDB', async ({ page, isMobile }) => {
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  await expect(page.locator('[data-web-map-id]')).toHaveCount(1);
  if (isMobile) await page.locator('[data-web-action="toggle-sidebar"]').click();
  await page.locator('[data-web-action="new-map"]').click();
  await expect(page.locator('[data-web-map-id]')).toHaveCount(2);

  page.once('dialog', async (dialog) => dialog.accept('浏览器验收导图'));
  await page.locator('[data-web-map-id]').last().locator('[data-web-action="rename-map"]').click();
  await expect(page.locator('[data-web-map-id]').last().locator('strong')).toHaveText('浏览器验收导图');
  await page.reload();
  await expect(page.locator('[data-web-map-id]').last().locator('strong')).toHaveText('浏览器验收导图');
  expect(errors).toEqual([]);
});

test('migrates pre-release maps into the current web data generation without losing them', async ({ page }) => {
  await page.goto('/assets/yemind-icon-32.png');
  await page.evaluate(async () => {
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
      version: 1,
      activeMapId: 'pre-release-map',
      maps: [{
        id: 'pre-release-map',
        title: '不应加载的旧导图',
        createdAt: 1,
        updatedAt: 1,
        layout: 'logicalStructure',
        theme: 'yemind-default',
        lineStyle: 'curve',
        projectStyle: {},
        data: { data: { text: '<p>旧节点</p>', richText: true, customTextWidth: 173 }, children: [] },
      }],
    }, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });

  await page.goto('/');
  await expect(page.locator('.ymw-editor > .ymz-editor')).toBeVisible();
  await expect(page.locator('[data-web-map-id]')).toHaveCount(1);
  await expect(page.locator('[data-web-map-id]')).toContainText('不应加载的旧导图');

  const stored = await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('yemind-web', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readonly');
    const request = transaction.objectStore('documents').get('maps');
    const value = await new Promise<any>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    return value;
  });
  expect(stored.version).toBe(2);
  expect(stored.maps).toHaveLength(1);
  expect(stored.maps[0].title).toBe('不应加载的旧导图');
  expect(stored.maps[0].data.data.text).toBe('旧节点');
  expect(stored.maps[0].data.data.richText).toBe(false);
});

test('opens the outline sidebar and returns to the map without losing the editor', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();
  await expect(editor).toHaveAttribute('data-view', 'split');
  await expect(editor.locator('[data-role="outline"]')).toBeVisible();
  await editor.locator('[data-primary-view][data-action="view-map"]').click();
  await expect(editor).toHaveAttribute('data-view', 'map');
});

test('keeps every center-topic glyph inside its rendered SVG text box', async ({ page }) => {
  test.slow();
  await resetWebApp(page);
  let editor = page.locator('.ymw-editor > .ymz-editor');
  const expectCenterTextFits = async (expectedText = '中心主题') => {
    const centerNode = editor.locator('.smm-node').first();
    await expect(centerNode).toContainText(expectedText);
    const richText = centerNode.locator('.smm-richtext-node-wrap');
    const textElement = await richText.count() > 0
      ? richText.first()
      : centerNode.locator('.smm-text-node-wrap').first();
    await expect(textElement).toBeVisible();
    const geometry = await textElement.evaluate((element) => {
      const textRect = element.getBoundingClientRect();
      const foreignObject = element.closest('foreignObject');
      const foreignRect = foreignObject?.getBoundingClientRect();
      const nodeRect = element.closest('.smm-node')?.getBoundingClientRect();
      return {
        rich: Boolean(foreignObject),
        textWidth: textRect.width,
        textHeight: textRect.height,
        containerWidth: foreignRect?.width ?? nodeRect?.width ?? 0,
        containerHeight: foreignRect?.height ?? nodeRect?.height ?? 0,
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      };
    });
    expect(geometry.fontSize).toBe(25);
    if (geometry.rich) expect(geometry.containerWidth).toBeGreaterThan(95);
    expect(geometry.textWidth).toBeLessThanOrEqual(geometry.containerWidth + 0.5);
    expect(geometry.textHeight).toBeLessThanOrEqual(geometry.containerHeight + 0.5);
  };

  const textEditor = page.locator('body > .smm-richtext-node-edit-wrap .ql-editor');
  await editor.locator('.smm-node').first().dblclick();
  await textEditor.fill('未命名');
  await editor.locator('[data-role="canvas"]').click({ position: { x: 24, y: 160 } });
  await editor.locator('.smm-node').first().dblclick();
  await textEditor.fill('中心主题');
  await editor.locator('[data-role="canvas"]').click({ position: { x: 24, y: 160 } });
  const visibleThemeButton = editor.locator('button.ymz-project-button:visible').filter({ hasText: '主题' });
  if (await visibleThemeButton.count() > 0) {
    await visibleThemeButton.click();
  } else {
    await editor.locator('[data-action="toggle-top-overflow"]').click();
    await editor.getByRole('menuitem', { name: '主题' }).click();
  }
  await editor.locator('[data-project-choice-group="缤纷"]').click();
  await editor.locator('[data-project-choice-value="scheme-rainbow"]').click();
  await expectCenterTextFits();
  await expect(editor.locator('[data-role="save-state-label"]')).toHaveText('已保存');
  await page.reload();
  await expectCenterTextFits();

  // Stop the live repository before seeding the legacy record; otherwise its
  // debounced save can race the direct IndexedDB fixture write.
  const context = page.context();
  await page.close();
  const legacyPage = await context.newPage();
  await legacyPage.goto('/assets/yemind-icon-32.png');
  await legacyPage.evaluate(async () => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    const map = maps.maps.find((item: any) => item.id === maps.activeMapId) ?? maps.maps[0];
    map.data.data.text = '<p><span>G1架构总览</span></p>';
    map.data.data.richText = true;
    delete map.data.data.width;
    delete map.data.data.customTextWidth;
    store.put(maps, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await legacyPage.goto('/');
  editor = legacyPage.locator('.ymw-editor > .ymz-editor');
  await expect(editor).toBeVisible();
  await expectCenterTextFits('G1架构总览');
});

test('cycles appearance and reveals the outline drag grip only on approach', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const clickAppearance = async () => {
    if (await editor.locator('[data-action="cycle-appearance"]:visible').count() === 0) {
      await editor.locator('[data-action="toggle-top-overflow"]').click();
    }
    await editor.locator('[data-action="cycle-appearance"]:visible').click();
  };
  await clickAppearance();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'light');
  await clickAppearance();
  await expect(page.locator('html')).toHaveAttribute('data-appearance', 'dark');

  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click();
  const addChild = editor.locator('[data-node-quick-action="add-child"]').first();
  await expect(addChild).toBeVisible();
  await addChild.click();
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();
  const handle = editor.locator('[data-outline-drag-source="true"] [data-outline-drag-handle]').first();
  const grip = handle.locator('.ymz-outline-drag-grip');
  await expect(handle).toBeVisible();
  await expect(grip).toHaveCSS('opacity', '0');
  await handle.hover();
  await expect(grip).toHaveCSS('opacity', '0.9');
});

test('switches a theme with one render tree and keeps the sticky category bar opaque', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click();
  await editor.locator('[data-node-quick-action="add-child"]').first().click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);

  if (await editor.locator('[data-action="theme-gallery"]:visible').count() === 0) {
    await editor.locator('[data-action="toggle-top-overflow"]').click();
  }
  await editor.locator('[data-action="theme-gallery"]:visible').click();
  const tabs = editor.locator('.ymz-project-choice-panel__tabs');
  await expect(tabs).toHaveCSS('position', 'sticky');
  await expect(tabs).not.toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
  await editor.locator('[data-project-choice-group="经典"]').click();
  await editor.locator('[data-project-choice-value="yemind-default"]').click();
  await expect(editor.locator('.smm-node')).toHaveCount(2);
});

test('keeps the symbol source node while the persistent dialog receives focus', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const rootNode = editor.locator('.smm-node').first();
  await rootNode.click({ button: 'right' });
  await page.getByRole('menuitem', { name: '添加 ›' }).hover();
  const symbolMenuItem = page.getByRole('menuitem', { name: '符号' });
  await expect(symbolMenuItem).toBeVisible();
  await symbolMenuItem.click();
  const dialog = editor.locator('.ymz-symbol-picker');
  await expect(dialog).toBeVisible();
  const omega = dialog.getByRole('button', { name: 'Ω', exact: true });
  await expect(omega).toBeEnabled();
  await omega.click();
  await expect(editor.locator('.smm-node').first()).toContainText('中心主题Ω');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: '→', exact: true }).click();
  await expect(editor.locator('.smm-node').first()).toContainText('中心主题Ω→');
});

test('keeps hidden toolbars discoverable through three edge markers', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await editor.locator('[data-action="toggle-status-overflow"]').click();
  }
  await editor.locator('[data-action="toggle-toolbar-pin"]').click();
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await expect(editor).toHaveAttribute('data-toolbars-pinned', 'false');
  await page.mouse.move(680, 380);
  await expect.poll(async () => editor.getAttribute('data-topbar-visible'), { timeout: 5_000 }).toBe('false');
  const edge = editor.locator('[data-toolbar-edge="top"]');
  await expect(edge).toBeVisible();
  const edgeBox = await edge.boundingBox();
  expect(edgeBox).not.toBeNull();
  const editorBox = await editor.boundingBox();
  expect(edgeBox!.width).toBeGreaterThan(editorBox!.width * 0.9);
  await expect(edge.locator('span')).toHaveCSS('height', '2px');
  await page.mouse.move(edgeBox!.x + edgeBox!.width / 2, edgeBox!.y + edgeBox!.height / 2);
  await expect(editor).toHaveAttribute('data-topbar-visible', 'true');
});

test('clears transient image and search overlays before opening cards', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const search = editor.locator('[data-action="open-search"]:visible');
  if (await search.count()) await search.click();
  else {
    await editor.locator('[data-action="toggle-top-overflow"]').click();
    await editor.locator('[data-action="open-search"]:visible').click();
  }
  await expect(editor.locator('[data-role="search-panel"]')).toBeVisible();
  await editor.evaluate((root) => {
    const frame = document.createElement('div');
    frame.className = 'ymz-node-image-frame';
    frame.dataset.mode = 'selected';
    frame.style.display = 'block';
    root.appendChild(frame);
    const popover = root.querySelector<HTMLElement>('.ymz-resource-action-popover');
    if (popover) popover.hidden = false;
  });

  await editor.locator('[data-primary-view][data-action="view-cards"]').click();
  await expect(editor).toHaveAttribute('data-study-view', 'cards');
  await expect(editor.locator('[data-role="search-panel"]')).toBeHidden();
  await expect(editor.locator('.ymz-resource-action-popover')).toBeHidden();
  await expect(editor.locator('.ymz-node-image-frame')).toHaveCSS('display', 'none');
});

test('完整节点卡片在管理和复习中保留图片备注批注与附件', async ({ page }) => {
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('yemind-web', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const request = store.get('maps');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const map = maps.maps[0];
    const uid = map.data.data.uid;
    map.studyCards = [{
      id: 'e2e-rich-card',
      nodeUid: uid,
      front: '什么是 LTSSM？',
      back: '链路训练状态机',
      status: 'new',
      starred: false,
      createdAt: 1_000,
      updatedAt: 1_000,
      dueAt: 1_000,
      repetitions: 0,
      lapses: 0,
      intervalDays: 0,
      easeFactor: 2.5,
      source: {
        version: 1,
        capturedAt: 1_000,
        nodeTextHtml: '<strong>LTSSM</strong><span class="ql-formula" data-value="x^2">x²</span>',
        nodeTextPlain: 'LTSSM x²',
        icons: ['yemind_star'],
        tags: ['PCIe', 'SerDes'],
        todo: { checked: true, text: '完成学习' },
        hyperlink: 'https://example.com/ltssm',
        hyperlinkTitle: 'LTSSM 规范',
        image: {
          src: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
          title: '状态转换图',
          kind: 'image',
          width: 1,
          height: 1,
        },
        noteHtml: '<p>进入 <em>Recovery</em></p>',
        comments: [
          { id: 'c1', text: '注意 Detect 状态', createdAt: 1, updatedAt: 1 },
          { id: 'c2', text: '比较 L0 与 L0s', createdAt: 2, updatedAt: 2 },
        ],
      },
    }];
    store.put(maps, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  });
  await page.reload();
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await expect(editor).toBeVisible();
  await editor.locator('[data-primary-view][data-action="view-cards"]').click();
  await expect(editor).toHaveAttribute('data-study-view', 'cards');
  await expect(editor.locator('[data-study-source-front]')).toContainText('完成学习');
  await expect(editor.locator('[data-study-source-front]')).toContainText('PCIe');
  await expect(editor.locator('[data-study-source-front] .ql-formula')).toBeVisible();
  await editor.locator('[data-study-action="preview-source-image"]').click();
  await expect(editor.locator('.ymz-image-lightbox')).toBeVisible();
  await expect(editor.locator('.ymz-image-lightbox img')).toHaveAttribute('alt', '状态转换图');
  await editor.getByRole('button', { name: '关闭图片预览' }).click();

  await editor.locator('[data-study-action="flip"]').click();
  await expect(editor.locator('[data-study-source-back]')).toContainText('Recovery');
  await expect(editor.locator('[data-study-source-back]')).toContainText('注意 Detect 状态');
  await editor.locator('[data-study-action="start-review"]').click();
  await expect(editor).toHaveAttribute('data-study-view', 'review');
  await expect(editor.locator('[data-study-source-front]')).toContainText('SerDes');
  await editor.locator('[data-study-action="reveal"]').click();
  await expect(editor.locator('[data-role="study-answer"]')).toContainText('比较 L0 与 L0s');
  expect(errors).toEqual([]);
});

test('searches, navigates, validates regex and replaces map text', async ({ page }) => {
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const visibleSearchButton = editor.locator('[data-action="open-search"]:visible');
  if (await visibleSearchButton.count()) await visibleSearchButton.click();
  else {
    await editor.locator('[data-action="toggle-top-overflow"]').click();
    await editor.locator('[data-action="open-search"]:visible').click();
  }

  const panel = editor.locator('[data-role="search-panel"]');
  const find = panel.getByRole('textbox', { name: '查找' });
  await expect(panel).toBeVisible();
  await find.fill('中心主题');
  await find.press('Enter');
  await expect(panel.locator('[data-role="search-info"]')).toHaveText('1 / 1');
  await panel.getByRole('button', { name: '下一个' }).click();
  await panel.getByRole('button', { name: '上一个' }).click();
  await expect(panel.locator('[data-role="search-info"]')).toHaveText('1 / 1');

  for (const option of ['区分大小写', '全字匹配']) {
    const button = panel.getByRole('button', { name: option });
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'true');
    await button.click();
    await expect(button).toHaveAttribute('aria-pressed', 'false');
  }

  const regex = panel.getByRole('button', { name: '使用正则表达式' });
  await regex.click();
  await find.fill('[');
  await find.press('Enter');
  await expect(panel.locator('[data-role="search-error"]')).toBeVisible();
  await expect(panel.locator('[data-role="search-error"]')).not.toHaveText('');
  await regex.click();

  await find.fill('中心主题');
  await find.press('Enter');
  await panel.getByRole('button', { name: '展开替换' }).click();
  const replace = panel.getByRole('textbox', { name: '替换' });
  await replace.fill('浏览器替换');
  await panel.locator('[data-search-action="replace"]').click();
  await expect(editor.locator('.smm-node').first()).toContainText('浏览器替换');

  await find.fill('浏览器替换');
  await find.press('Enter');
  await replace.fill('全部替换成功');
  await panel.locator('[data-search-action="replace-all"]').click();
  await expect(editor.locator('.smm-node').first()).toContainText('全部替换成功');
  expect(errors).toEqual([]);
});

test('renders and toggles the real minimap and exposes reset zoom', async ({ page }) => {
  await resetWebApp(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const minimap = editor.locator('[data-role="minimap"]');
  const minimapToggle = editor.locator('[data-action="toggle-minimap"]');
  if ((page.viewportSize()?.width ?? 0) <= 720) {
    await editor.locator('[data-action="toggle-status-overflow"]').click();
    await expect(editor.getByRole('button', { name: '重置缩放' })).toBeVisible();
    await expect(minimapToggle).toBeVisible();
    await expect(minimap).toBeHidden();
  } else {
    await expect(editor.getByRole('button', { name: '重置缩放' })).toBeVisible();
    await expect(minimapToggle).toBeVisible();
    await expect(minimap).toBeHidden();
    await minimapToggle.click();
    await expect(minimap).toBeVisible();
    await expect.poll(async () => minimap.locator('svg').count()).toBeGreaterThan(0);
  }
});
