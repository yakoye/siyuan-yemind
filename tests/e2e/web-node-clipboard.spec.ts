import { expect, test, type Page } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

const SOURCE_ONE = '来源节点一';
const SOURCE_CHILD = '来源子节点';
const SOURCE_TWO = '来源节点二';
const SAME_TARGET = '同文件目标';
const CROSS_TARGET = '跨文件目标';

async function seedClipboardMaps(page: Page): Promise<void> {
  await resetWebApp(page);
  // Stop the live repository before replacing its IndexedDB snapshot.
  // Otherwise the editor's debounced initial save can finish after this
  // fixture transaction and overwrite the two seeded maps with its one-map
  // bootstrap state.
  await page.route('**/favicon.ico', (route) => route.fulfill({ status: 204 }));
  await page.goto('/assets/yemind-icon-32.png');
  await page.evaluate(async ({ sourceOne, sourceChild, sourceTwo }) => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readwrite');
    const store = transaction.objectStore('documents');
    const current = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    const base = current.maps[0];
    const now = Date.now();
    const source = structuredClone(base);
    source.id = 'clipboard-source';
    source.title = '剪贴板来源';
    source.createdAt = now;
    source.updatedAt = now;
    source.data = {
      data: { uid: 'source-root', text: '来源根节点', expand: true },
      children: [{
        data: {
          uid: 'source-one',
          text: `<p><span style="color:#ef4444;background-color:#fef3c7;font-size:22px"><strong>${sourceOne}</strong></span></p>`,
          richText: true,
          fillColor: '#ef4444',
          borderColor: '#dc2626',
          yemindNote: { html: '<p>跨表面备注</p>', createdAt: 1, updatedAt: 1 },
          image: 'data:image/png;base64,AAAA',
          imageTitle: '跨文件流程图',
          imageSize: { width: 96, height: 64, custom: true },
          yemindTodo: { checked: true, text: '完成跨文件验证' },
          tag: ['PCIe', '重点'],
          hyperlink: 'https://example.com/spec',
          expand: true,
        },
        children: [{
          data: { uid: 'source-child', text: sourceChild },
          children: [],
        }],
      }, {
        data: { uid: 'source-two', text: sourceTwo, icon: ['priority_1'] },
        children: [],
      }, {
        data: { uid: 'same-target', text: '同文件目标' },
        children: [],
      }],
    };
    const destination = structuredClone(base);
    destination.id = 'clipboard-destination';
    destination.title = '剪贴板目标';
    destination.createdAt = now + 1;
    destination.updatedAt = now + 1;
    destination.data = {
      data: { uid: 'destination-root', text: '目标根节点', expand: true },
      children: [{
        data: { uid: 'cross-target', text: '跨文件目标' },
        children: [],
      }],
    };
    store.put({
      version: 1,
      activeMapId: source.id,
      maps: [source, destination],
    }, 'maps');
    await new Promise<void>((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
    db.close();
  }, { sourceOne: SOURCE_ONE, sourceChild: SOURCE_CHILD, sourceTwo: SOURCE_TWO });
  await page.goto('/');
  await expect(page.locator('[data-web-map-id]')).toHaveCount(2);
  await expect(page.locator('[data-web-map-id="clipboard-source"]')).toHaveClass(/is-active/);
  await expect(page.locator('.ymw-editor > .ymz-editor')).toContainText(SOURCE_ONE);
}

async function openMap(page: Page, mapId: 'clipboard-source' | 'clipboard-destination'): Promise<void> {
  await page.locator(
    `[data-web-map-id="${mapId}"] [data-web-action="open-map"]`,
  ).click();
  await expect(page.locator(`[data-web-map-id="${mapId}"]`)).toHaveClass(/is-active/);
}

async function openOutline(page: Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('[data-primary-view][data-action="view-outline"]').click();
  await expect(editor).toHaveAttribute('data-view', 'split');
  await expect(editor.locator('[data-role="outline"]')).toBeVisible();
}

async function selectWholeOutlineNodes(page: Page): Promise<void> {
  await page.evaluate(({ sourceOne, sourceTwo }) => {
    const editors = Array.from(document.querySelectorAll<HTMLElement>('[data-outline-editor]'));
    const start = editors.find((element) => element.textContent?.includes(sourceOne));
    const end = editors.find((element) => element.textContent?.includes(sourceTwo));
    if (!start || !end) throw new Error('source outline rows not found');
    const startText = start.firstChild ?? start;
    const endText = end.lastChild ?? end;
    const range = document.createRange();
    range.setStart(startText, 0);
    range.setEnd(endText, endText.textContent?.length ?? 0);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    start.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
  }, { sourceOne: SOURCE_ONE, sourceTwo: SOURCE_TWO });
}

async function selectCanvasSourceNodes(page: Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const first = editor.locator('.smm-node').filter({ hasText: SOURCE_ONE });
  const second = editor.locator('.smm-node').filter({ hasText: SOURCE_TWO });
  await first.click();
  await second.click({ modifiers: ['Control'] });
}

async function pasteAtCanvasRoot(page: Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await editor.locator('.smm-node').filter({ hasText: '目标根节点' }).click();
  await page.keyboard.press('Control+V');
  await expect(editor.locator('.smm-node').filter({ hasText: SOURCE_ONE })).toBeVisible();
  await expect(editor.locator('.smm-node').filter({ hasText: SOURCE_CHILD })).toBeVisible();
  await expect(editor.locator('.smm-node').filter({ hasText: SOURCE_TWO })).toBeVisible();
}

async function pasteAtOutlineRoot(page: Page): Promise<void> {
  const editor = page.locator('.ymw-editor > .ymz-editor');
  const root = editor.locator('[data-outline-root="true"] [data-outline-editor]');
  await root.click();
  await page.keyboard.press('Control+V');
  await expect(editor.locator('[data-outline-editor]').filter({ hasText: SOURCE_ONE })).toBeVisible();
  await expect(editor.locator('[data-outline-editor]').filter({ hasText: SOURCE_CHILD })).toBeVisible();
  await expect(editor.locator('[data-outline-editor]').filter({ hasText: SOURCE_TWO })).toBeVisible();
}

async function expectDestinationClipboardData(page: Page): Promise<void> {
  await expect.poll(async () => page.evaluate(async ({ sourceOne, sourceChild, sourceTwo }) => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    db.close();
    const destination = maps.maps.find((map: any) => map.id === 'clipboard-destination');
    const flat: any[] = [];
    const walk = (tree: any) => {
      flat.push(tree);
      (tree.children ?? []).forEach(walk);
    };
    walk(destination.data);
    const first = flat.find((tree) => String(tree.data?.text ?? '').includes(sourceOne));
    return {
      firstFound: Boolean(first),
      childFound: flat.some((tree) => tree.data?.text === sourceChild),
      secondFound: flat.some((tree) => tree.data?.text === sourceTwo),
      freshIdentity: Boolean(first?.data?.uid && first.data.uid !== 'source-one'),
      visualStyleRemoved: Boolean(
        first
        && !first.data.fillColor
        && !first.data.borderColor
        && !/color:|background-color:|font-size:/i.test(String(first.data.text ?? '')),
      ),
      semanticBoldPreserved: /<strong>/.test(String(first?.data?.text ?? '')),
      notePreserved: first?.data?.yemindNote?.html === '<p>跨表面备注</p>',
      imagePreserved: first?.data?.image === 'data:image/png;base64,AAAA'
        && first?.data?.imageTitle === '跨文件流程图'
        && first?.data?.imageSize?.width === 96
        && first?.data?.imageSize?.height === 64,
      todoPreserved: first?.data?.yemindTodo?.checked === true
        && first?.data?.yemindTodo?.text === '完成跨文件验证',
      tagsPreserved: Array.isArray(first?.data?.tag)
        && first.data.tag.join('|') === 'PCIe|重点',
      hyperlinkPreserved: first?.data?.hyperlink === 'https://example.com/spec',
    };
  }, { sourceOne: SOURCE_ONE, sourceChild: SOURCE_CHILD, sourceTwo: SOURCE_TWO }), {
    timeout: 10_000,
  }).toEqual({
    firstFound: true,
    childFound: true,
    secondFound: true,
    freshIdentity: true,
    visualStyleRemoved: true,
    semanticBoldPreserved: true,
    notePreserved: true,
    imagePreserved: true,
    todoPreserved: true,
    tagsPreserved: true,
    hyperlinkPreserved: true,
  });
}

function canvasNode(page: Page, text: string) {
  return page.locator('.ymw-editor > .ymz-editor .smm-node').filter({ hasText: text }).first();
}

function outlineEditor(page: Page, text: string) {
  return page.locator('.ymw-editor > .ymz-editor [data-outline-editor]').filter({ hasText: text }).first();
}

async function commitCanvasEdit(page: Page): Promise<void> {
  const canvas = page.locator('.ymw-editor > .ymz-editor [data-role="canvas"]');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({
    position: {
      x: Math.max(24, box!.width - 36),
      y: Math.max(96, box!.height - 110),
    },
  });
  await expect(page.locator('.smm-richtext-node-edit-wrap .ql-editor')).toBeHidden();
}

async function copyCanvasNode(page: Page, text = SOURCE_ONE): Promise<void> {
  await canvasNode(page, text).click();
  await page.keyboard.press('Control+C');
}

async function copyCanvasText(page: Page, text = SOURCE_TWO): Promise<void> {
  await canvasNode(page, text).dblclick();
  const editor = page.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(editor).toBeVisible();
  await editor.press('Control+A');
  await editor.press('Control+C');
}

async function copyOutlineNodeAtCaret(page: Page, text = SOURCE_ONE): Promise<void> {
  const editor = outlineEditor(page, text);
  await editor.click();
  await page.keyboard.press('Control+C');
}

async function copyOutlinePartialText(page: Page, text = SOURCE_TWO): Promise<string> {
  const copiedText = text.slice(0, Math.max(1, text.length - 1));
  await page.evaluate(({ text, copiedText }) => {
    const editor = Array.from(document.querySelectorAll<HTMLElement>('[data-outline-editor]'))
      .find((element) => element.textContent?.includes(text));
    if (!editor) throw new Error(`outline editor not found: ${text}`);
    const node = editor.firstChild ?? editor;
    const range = document.createRange();
    range.setStart(node, 0);
    range.setEnd(node, copiedText.length);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
    editor.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    document.dispatchEvent(new Event('selectionchange'));
  }, { text, copiedText });
  await page.keyboard.press('Control+C');
  return copiedText;
}

async function replaceCanvasTargetText(page: Page, target: string): Promise<void> {
  await canvasNode(page, target).dblclick();
  const editor = page.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(editor).toBeVisible();
  await editor.press('Control+A');
  await editor.press('Control+V');
  await commitCanvasEdit(page);
}

async function pasteCanvasStructure(page: Page, target: string): Promise<void> {
  await canvasNode(page, target).click();
  await page.keyboard.press('Control+V');
}

async function pasteOutlineStructure(page: Page, target: string): Promise<void> {
  const editor = outlineEditor(page, target);
  await editor.click();
  await page.keyboard.press('Control+V');
}

async function replaceOutlineTargetText(page: Page, target: string): Promise<void> {
  const editor = outlineEditor(page, target);
  await editor.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Control+V');
}

async function expectTreeRelation(
  page: Page,
  mapId: 'clipboard-source' | 'clipboard-destination',
  parentText: string,
  childText: string,
): Promise<void> {
  await expect.poll(async () => page.evaluate(async ({ mapId, parentText, childText }) => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    db.close();
    const map = maps.maps.find((item: any) => item.id === mapId);
    const find = (tree: any): any => {
      if (String(tree?.data?.text ?? '').includes(parentText)) return tree;
      for (const child of tree?.children ?? []) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    const parent = find(map?.data);
    return Boolean((parent?.children ?? []).some((child: any) =>
      String(child?.data?.text ?? '').includes(childText)));
  }, { mapId, parentText, childText }), { timeout: 10_000 }).toBe(true);
}

async function expectNodeText(
  page: Page,
  mapId: 'clipboard-source' | 'clipboard-destination',
  text: string,
): Promise<void> {
  await expect.poll(async () => page.evaluate(async ({ mapId, text }) => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    db.close();
    const map = maps.maps.find((item: any) => item.id === mapId);
    const walk = (tree: any): boolean =>
      String(tree?.data?.text ?? '').includes(text)
      || (tree?.children ?? []).some(walk);
    return walk(map?.data);
  }, { mapId, text }), { timeout: 10_000 }).toBe(true);
}

async function expectUidTextAndChildCount(
  page: Page,
  mapId: 'clipboard-source' | 'clipboard-destination',
  uid: 'same-target' | 'cross-target',
  text: string,
  childCount: number,
): Promise<void> {
  await expect.poll(async () => page.evaluate(async ({ mapId, uid, text, childCount }) => {
    const request = indexedDB.open('yemind-web');
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const transaction = db.transaction('documents', 'readonly');
    const store = transaction.objectStore('documents');
    const maps = await new Promise<any>((resolve, reject) => {
      const get = store.get('maps');
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    db.close();
    const map = maps.maps.find((item: any) => item.id === mapId);
    const find = (tree: any): any => {
      if (tree?.data?.uid === uid) return tree;
      for (const child of tree?.children ?? []) {
        const found = find(child);
        if (found) return found;
      }
      return null;
    };
    const target = find(map?.data);
    return Boolean(
      target
      && String(target.data?.text ?? '').includes(text)
      && (target.children ?? []).length === childCount,
    );
  }, { mapId, uid, text, childCount }), { timeout: 10_000 }).toBe(true);
}

test.beforeEach(async ({ context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
});

test('copies multiple hierarchical canvas nodes to another file canvas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'multi-selection uses desktop modifiers');
  const errors = recordPageErrors(page);
  await seedClipboardMaps(page);
  await selectCanvasSourceNodes(page);
  await page.keyboard.press('Control+C');
  await openMap(page, 'clipboard-destination');
  await pasteAtCanvasRoot(page);
  await expectDestinationClipboardData(page);
  expect(errors).toEqual([]);
});

test('copies multiple hierarchical outline nodes to another file outline', async ({ page, isMobile }) => {
  test.skip(isMobile, 'continuous desktop range selection');
  const errors = recordPageErrors(page);
  await seedClipboardMaps(page);
  await openOutline(page);
  await selectWholeOutlineNodes(page);
  await page.keyboard.press('Control+C');
  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await pasteAtOutlineRoot(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');
  await page.keyboard.press('Control+Z');
  await expect(editor.locator('[data-outline-editor]').filter({ hasText: SOURCE_ONE })).toHaveCount(0);
  await page.keyboard.press('Control+Y');
  await expect(editor.locator('[data-outline-editor]').filter({ hasText: SOURCE_ONE })).toBeVisible();
  await expectDestinationClipboardData(page);
  await page.reload();
  await expect(page.locator('[data-web-map-id="clipboard-destination"]')).toHaveClass(/is-active/);
  await openOutline(page);
  await expect(page.locator('[data-outline-editor]').filter({ hasText: SOURCE_CHILD })).toBeVisible();
  expect(errors).toEqual([]);
});

test('copies outline nodes to another file canvas', async ({ page, isMobile }) => {
  test.skip(isMobile, 'continuous desktop range selection');
  const errors = recordPageErrors(page);
  await seedClipboardMaps(page);
  await openOutline(page);
  await selectWholeOutlineNodes(page);
  await page.keyboard.press('Control+C');
  await openMap(page, 'clipboard-destination');
  await pasteAtCanvasRoot(page);
  await expectDestinationClipboardData(page);
  expect(errors).toEqual([]);
});

test('copies canvas nodes to another file outline', async ({ page, isMobile }) => {
  test.skip(isMobile, 'multi-selection uses desktop modifiers');
  const errors = recordPageErrors(page);
  await seedClipboardMaps(page);
  await selectCanvasSourceNodes(page);
  await page.keyboard.press('Control+C');
  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await pasteAtOutlineRoot(page);
  await expectDestinationClipboardData(page);
  expect(errors).toEqual([]);
});

test('routes a non-editing canvas node to canvas structures in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop node clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasNode(page);

  await pasteCanvasStructure(page, SAME_TARGET);
  await expectTreeRelation(page, 'clipboard-source', SAME_TARGET, SOURCE_ONE);

  await openMap(page, 'clipboard-destination');
  await pasteCanvasStructure(page, CROSS_TARGET);
  await expectTreeRelation(page, 'clipboard-destination', CROSS_TARGET, SOURCE_ONE);
});

test('routes a non-editing canvas node to visible text inside canvas editors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop node-to-text clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasNode(page);

  await replaceCanvasTargetText(page, SAME_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-source', 'same-target', SOURCE_ONE, 0);

  await openMap(page, 'clipboard-destination');
  await replaceCanvasTargetText(page, CROSS_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-destination', 'cross-target', SOURCE_ONE, 0);
});

test('routes a non-editing canvas node to outline structures in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop node clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasNode(page);

  await openOutline(page);
  await pasteOutlineStructure(page, SAME_TARGET);
  await expectTreeRelation(page, 'clipboard-source', SAME_TARGET, SOURCE_ONE);

  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await pasteOutlineStructure(page, CROSS_TARGET);
  await expectTreeRelation(page, 'clipboard-destination', CROSS_TARGET, SOURCE_ONE);
});

test('routes an outline caret block to canvas structures in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop outline block clipboard routing');
  await seedClipboardMaps(page);
  await openOutline(page);
  await copyOutlineNodeAtCaret(page);

  await page.locator('[data-primary-view][data-action="view-map"]').click();
  await pasteCanvasStructure(page, SAME_TARGET);
  await expectTreeRelation(page, 'clipboard-source', SAME_TARGET, SOURCE_ONE);

  await openMap(page, 'clipboard-destination');
  await pasteCanvasStructure(page, CROSS_TARGET);
  await expectTreeRelation(page, 'clipboard-destination', CROSS_TARGET, SOURCE_ONE);
});

test('routes an outline caret block to visible text inside canvas editors', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop outline-to-text clipboard routing');
  await seedClipboardMaps(page);
  await openOutline(page);
  await copyOutlineNodeAtCaret(page);
  await page.locator('[data-primary-view][data-action="view-map"]').click();

  await replaceCanvasTargetText(page, SAME_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-source', 'same-target', SOURCE_ONE, 0);

  await openMap(page, 'clipboard-destination');
  await replaceCanvasTargetText(page, CROSS_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-destination', 'cross-target', SOURCE_ONE, 0);
});

test('routes an outline caret block to outline structures in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop outline block clipboard routing');
  await seedClipboardMaps(page);
  await openOutline(page);
  await copyOutlineNodeAtCaret(page);

  await pasteOutlineStructure(page, SAME_TARGET);
  await expectTreeRelation(page, 'clipboard-source', SAME_TARGET, SOURCE_ONE);

  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await pasteOutlineStructure(page, CROSS_TARGET);
  await expectTreeRelation(page, 'clipboard-destination', CROSS_TARGET, SOURCE_ONE);
});

test('routes real canvas text selections to canvas text editors in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop rich-text clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasText(page);

  await commitCanvasEdit(page);
  await replaceCanvasTargetText(page, SAME_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-source', 'same-target', SOURCE_TWO, 0);

  await openMap(page, 'clipboard-destination');
  await replaceCanvasTargetText(page, CROSS_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-destination', 'cross-target', SOURCE_TWO, 0);
});

test('routes real canvas text selections to outline text blocks in the same and another file', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop rich-text to outline clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasText(page);
  await commitCanvasEdit(page);
  await openOutline(page);

  await replaceOutlineTargetText(page, SAME_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-source', 'same-target', SOURCE_TWO, 0);

  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await replaceOutlineTargetText(page, CROSS_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-destination', 'cross-target', SOURCE_TWO, 0);
});

test('routes partial outline text to canvas and outline text editors without stale node payloads', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop outline text clipboard routing');
  await seedClipboardMaps(page);
  await openOutline(page);
  const copiedText = await copyOutlinePartialText(page);
  await page.locator('[data-primary-view][data-action="view-map"]').click();

  await replaceCanvasTargetText(page, SAME_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-source', 'same-target', copiedText, 0);

  await openMap(page, 'clipboard-destination');
  await openOutline(page);
  await replaceOutlineTargetText(page, CROSS_TARGET);
  await expectUidTextAndChildCount(page, 'clipboard-destination', 'cross-target', copiedText, 0);
});

test('keeps node versus text routing stable before and after creating a new canvas node', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop new-node clipboard routing');
  await seedClipboardMaps(page);
  await copyCanvasNode(page);
  const editor = page.locator('.ymw-editor > .ymz-editor');

  await canvasNode(page, SAME_TARGET).click();
  await editor.locator('[data-node-quick-action="add-child"]').first().click();
  const textEditor = editor.locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeVisible();
  await textEditor.press('Control+A');
  await textEditor.press('Control+V');
  await commitCanvasEdit(page);
  await expectNodeText(page, 'clipboard-source', SOURCE_ONE);

  await copyCanvasNode(page);
  await canvasNode(page, SAME_TARGET).click();
  await editor.locator('[data-node-quick-action="add-child"]').first().click();
  await expect(textEditor).toBeVisible();
  await textEditor.fill('新建锚点');
  await commitCanvasEdit(page);
  await canvasNode(page, '新建锚点').click();
  await page.keyboard.press('Control+V');
  await expectTreeRelation(page, 'clipboard-source', '新建锚点', SOURCE_ONE);
});
