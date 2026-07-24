import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  canvasModeIcon,
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

describe('v0.9.19 icon, asset dialog, checkpoint, and outline polish', () => {
  it('uses the supplied insert icons and upper/same/lower terminology', () => {
    expect(nodeInsertIcon('parent')).toContain('M11.833 20.75v-6');
    expect(nodeInsertIcon('sibling')).toContain('M20.868 24h-9.733');
    expect(nodeInsertIcon('child')).toContain('M24.75 23.75h-9.167');
    const menu = source('src/ui/contextMenu.ts');
    const upper = menu.indexOf("label: '插入上级节点'");
    const same = menu.indexOf("label: '插入同级节点'");
    const lower = menu.indexOf("label: '插入下级节点'");
    expect(upper).toBeGreaterThanOrEqual(0);
    expect(same).toBeGreaterThan(upper);
    expect(lower).toBeGreaterThan(same);
  });

  it('uses supplied style and command icons', () => {
    expect(projectStyleIcon()).toContain('M9.136 10.536');
    expect(nodeStyleIcon()).toContain('M2.74071 10.2339');
    expect(relationIcon()).toContain('map-insert-relationship');
    expect(clipartIcon()).toContain('ymz-icon-clipart');
    expect(outerFrameIcon()).toContain('ymz-icon-outer-frame');
    expect(searchIcon()).toContain('M12.038 2.714');
    expect(undoIcon()).toContain('M.8 3.6h7.5');
    expect(redoIcon()).toContain('M13.8 3.6H6.3');
    expect(fullscreenIcon()).toContain('M18.6 5.398v4.2');
  });

  it('shows the mode reached after clicking the footer mode button', () => {
    expect(canvasModeIcon('select')).toContain('ymz-icon-canvas-pan');
    expect(canvasModeIcon('pan')).toContain('ymz-icon-canvas-select');
  });

  it('renders every marker group in one fixed dialog with sticky categories', () => {
    const dialog = source('src/ui/localAssetDialogs.ts');
    expect(dialog).toContain("all.textContent = '全部'");
    expect(dialog).toContain("section.className = 'ymz-marker-section'");
    expect(dialog).toContain("height: '620px'");
    expect(dialog).toContain('bindOutsideClose(dialog)');
    expect(dialog).toContain('data-action="asset-dialog-close"');
  });

  it('renders clipart without pagination in a fixed closeable dialog', () => {
    const dialog = source('src/ui/localAssetDialogs.ts');
    expect(dialog).not.toContain('clipart-more');
    expect(dialog).not.toContain('加载更多');
    expect(dialog).toContain('matches.forEach((item)');
    expect(dialog).toContain("width: '760px'");
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
