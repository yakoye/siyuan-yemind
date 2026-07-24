import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  canvasModeIcon,
  clipboardIcon,
  clipartIcon,
  fullscreenIcon,
  nodeInsertIcon,
  nodeStyleIcon,
  outerFrameIcon,
  projectStyleIcon,
  relationIcon,
  searchIcon,
  undoIcon,
  redoIcon,
} from '../../../src/editor/projectControls';

function source(file: string): string {
  return fs.readFileSync(path.resolve(process.cwd(), file), 'utf8');
}

function expectSuppliedIcon(html: string, className: string): void {
  expect(html).toMatch(/^<img\b/);
  expect(html).toContain(className);
  expect(html).toContain('ymz-operation-icon');
  expect(html).toContain('src="data:image/svg+xml;base64,');
  expect(html).toContain('draggable="false"');
  expect(html).not.toContain('<svg');
  expect(html).not.toContain('<path');
}

describe('v0.9.21 source SVG, flat asset dialog and checkpoint polish', () => {
  it('uses lightweight upper, same and lower insertion icons in the requested order', () => {
    expectSuppliedIcon(nodeInsertIcon('parent'), 'ymz-icon-insert-parent');
    expectSuppliedIcon(nodeInsertIcon('sibling'), 'ymz-icon-insert-sibling');
    expectSuppliedIcon(nodeInsertIcon('child'), 'ymz-icon-insert-child');
    const menu = source('src/ui/contextMenu.ts');
    const upper = menu.indexOf("label: '插入上级节点'");
    const same = menu.indexOf("label: '插入同级节点'");
    const lower = menu.indexOf("label: '插入下级节点'");
    expect(upper).toBeGreaterThanOrEqual(0);
    expect(same).toBeGreaterThan(upper);
    expect(lower).toBeGreaterThan(same);
  });

  it('isolates supplied artwork and keeps the native clipboard icon theme-aware', () => {
    expectSuppliedIcon(projectStyleIcon(), 'ymz-icon-project-style');
    expectSuppliedIcon(nodeStyleIcon(), 'ymz-icon-node-style');
    expectSuppliedIcon(relationIcon(), 'ymz-icon-relation');
    expectSuppliedIcon(clipartIcon(), 'ymz-icon-clipart');
    expectSuppliedIcon(outerFrameIcon(), 'ymz-icon-outer-frame');
    expectSuppliedIcon(searchIcon(), 'ymz-icon-search');
    expectSuppliedIcon(undoIcon(), 'ymz-icon-undo');
    expectSuppliedIcon(redoIcon(), 'ymz-icon-redo');
    expectSuppliedIcon(fullscreenIcon(), 'ymz-icon-fullscreen');
    expect(clipboardIcon('copy')).toContain('ymz-icon-copy');
    expect(clipboardIcon('copy')).toContain('currentColor');
  });

  it('shows the mode reached after clicking the footer mode button', () => {
    expect(canvasModeIcon('select')).toContain('ymz-icon-canvas-pan');
    expect(canvasModeIcon('pan')).toContain('ymz-icon-canvas-select');
  });

  it('renders marker icons continuously in one fixed dialog without group headings or item cards', () => {
    const dialog = source('src/ui/localAssetDialogs.ts');
    const css = source('src/styles/index.css');
    expect(dialog).toContain("addTab('', '全部')");
    expect(dialog).not.toContain('ymz-marker-section');
    expect(dialog).toContain('ymz-marker-groups');
    expect(dialog).toContain('scrollIntoView');
    expect(dialog).toContain("height: '620px'");
    expect(dialog).toContain('hideCloseIcon: false');
    expect(dialog).toContain('prepareAssetDialog(dialog)');
    expect(css).toContain('.ymz-marker-option{');
    expect(css).toContain('background:transparent!important');
  });

  it('renders clipart without pagination on a transparent dialog surface with individual cards', () => {
    const dialog = source('src/ui/localAssetDialogs.ts');
    const css = source('src/styles/index.css');
    expect(dialog).not.toContain('clipart-more');
    expect(dialog).not.toContain('加载更多');
    expect(dialog).toContain('matches.forEach((item)');
    expect(dialog).toContain("width: '760px'");
    expect(dialog).toContain('hideCloseIcon: false');
    expect(css).toContain('.ymz-clipart-grid{');
    expect(css).toContain('.ymz-clipart-option{');
  });

  it('opens the usable checkpoint manager directly and offers creation there', () => {
    const editor = source('src/editor/YeMindEditor.ts');
    const template = source('src/ui/checkpointDialogTemplate.ts');
    expect(editor).toContain('case "checkpoints":\n          this.openCheckpointManager();');
    expect(editor).not.toContain('this.openCheckpointMenu(button)');
    expect(template).toContain('data-checkpoint-dialog-action="create"');
  });

  it('aligns the outline insertion marker with the target branch marker center', () => {
    const css = source('src/styles/index.css');
    expect(css).toContain('var(--ymz-outline-drag-width) + var(--ymz-outline-branch-half)');
  });
});
