import { expect, test, type Locator, type Page } from '@playwright/test';
import { recordPageErrors, resetWebApp } from './helpers';

function editor(page: Page): Locator {
  return page.locator('.ymw-editor > .ymz-editor');
}

async function commitCanvasEdit(page: Page): Promise<void> {
  const canvas = editor(page).locator('[data-role="canvas"]');
  const box = await canvas.boundingBox();
  expect(box).not.toBeNull();
  await canvas.click({ position: { x: box!.width - 24, y: box!.height - 90 } });
  await expect(editor(page).locator('.smm-richtext-node-edit-wrap .ql-editor')).toBeHidden();
}

async function renameActiveEditor(page: Page, value: string): Promise<void> {
  const textEditor = editor(page).locator('.smm-richtext-node-edit-wrap .ql-editor');
  await expect(textEditor).toBeVisible();
  await textEditor.fill(value);
  await commitCanvasEdit(page);
}

async function addChildFrom(node: Locator, page: Page, text: string): Promise<Locator> {
  await node.click();
  const add = editor(page).locator('[data-node-quick-action="add-child"]').first();
  await expect(add).toBeVisible();
  await add.click();
  await renameActiveEditor(page, text);
  return editor(page).locator('.smm-node').filter({ hasText: text }).first();
}

test('YM-DAILY-EDIT-003 and YM-DAILY-HIST-005 keep CRUD atomic through undo and redo', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop node CRUD and history matrix');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const mapEditor = editor(page);
  const root = mapEditor.locator('.smm-node').first();
  const child = await addChildFrom(root, page, 'CRUD 子节点');
  await expect(child).toBeVisible();

  await child.click({ button: 'right' });
  const menu = page.locator('.ymz-context-menu--node');
  await expect(menu).toBeVisible();
  await menu.getByText('删除当前和子节点', { exact: true }).click();
  await expect(mapEditor.locator('.smm-node').filter({ hasText: 'CRUD 子节点' })).toHaveCount(0);

  await mapEditor.locator('[data-action="undo"]').click();
  await expect(mapEditor.locator('.smm-node').filter({ hasText: 'CRUD 子节点' })).toHaveCount(1);
  await mapEditor.locator('[data-action="redo"]').click();
  await expect(mapEditor.locator('.smm-node').filter({ hasText: 'CRUD 子节点' })).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('YM-DAILY-HIST-001 and YM-DAILY-HIST-002 synchronize quick-action and outline expansion', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop synchronized expansion matrix');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const mapEditor = editor(page);
  const root = mapEditor.locator('.smm-node').first();
  const branch = await addChildFrom(root, page, '折叠分支');
  await addChildFrom(branch, page, '折叠后代');
  await branch.click();

  const collapse = mapEditor.locator('[data-node-quick-action="collapse"]').first();
  await expect(collapse).toBeVisible();
  await collapse.click();
  await expect(mapEditor.locator('.smm-node').filter({ hasText: '折叠后代' })).toHaveCount(0);

  await mapEditor.locator('[data-action="view-outline"]').click();
  const branchRow = mapEditor.locator('.ymz-outline-row').filter({ hasText: '折叠分支' }).first();
  await expect(branchRow).toHaveAttribute('data-outline-expanded', 'false');
  await branchRow.locator('[data-outline-toggle]').click();
  await expect(branchRow).toHaveAttribute('data-outline-expanded', 'true');
  await expect(mapEditor.locator('.smm-node').filter({ hasText: '折叠后代' })).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('YM-DAILY-DRAG-002 moves a visible parent and its descendants as one committed subtree', async ({ page, isMobile }) => {
  test.skip(isMobile, 'desktop structural drop matrix');
  const errors = recordPageErrors(page);
  await resetWebApp(page);
  const mapEditor = editor(page);
  const root = mapEditor.locator('.smm-node').first();
  const source = await addChildFrom(root, page, '拖动父节点');
  await addChildFrom(source, page, '拖动后代');
  const target = await addChildFrom(root, page, '目标父节点');
  await source.click();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  expect(sourceBox).not.toBeNull();
  expect(targetBox).not.toBeNull();
  await page.mouse.move(sourceBox!.x + sourceBox!.width / 2, sourceBox!.y + sourceBox!.height / 2);
  await page.mouse.down();
  // The right-logical drop target intentionally splits the node body:
  // left/top-bottom reorders siblings, while the outward (right) section
  // reparents as a child. Exercise the child zone explicitly.
  await page.mouse.move(targetBox!.x + targetBox!.width * 0.82, targetBox!.y + targetBox!.height / 2, { steps: 12 });
  const preview = mapEditor.locator('.ymz-drag-subtree-preview');
  await expect(preview).toHaveAttribute('data-preview-node-count', '2');
  await expect(preview).toHaveAttribute('data-drop-kind', 'child');
  await expect(preview).toHaveAttribute('data-drop-target-uid', /.+/);
  await page.mouse.up();

  await mapEditor.locator('[data-action="view-outline"]').click();
  const targetRow = mapEditor.locator('.ymz-outline-row').filter({ hasText: '目标父节点' }).first();
  const sourceRow = mapEditor.locator('.ymz-outline-row').filter({ hasText: '拖动父节点' }).first();
  const descendantRow = mapEditor.locator('.ymz-outline-row').filter({ hasText: '拖动后代' }).first();
  const targetUid = await targetRow.getAttribute('data-outline-uid');
  const sourceUid = await sourceRow.getAttribute('data-outline-uid');
  expect(targetUid).toBeTruthy();
  expect(sourceUid).toBeTruthy();
  await expect(sourceRow).toHaveAttribute('data-outline-parent-uid', targetUid!);
  await expect(descendantRow).toHaveAttribute('data-outline-parent-uid', sourceUid!);
  expect(errors).toEqual([]);
});
