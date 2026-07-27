import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import {
  appearanceIcon,
  canvasModeIcon,
  helpIcon,
  transferIcon,
  zoomIcon,
} from '../../../src/editor/projectControls';

describe('v1.3.0 toolbar icon semantics', () => {
  it('keeps branding passive and exposes fit exactly once in the bottom bar', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('图标');
    const brand = host.querySelector<HTMLElement>('.ymz-brand')!;

    expect(brand.dataset.action).toBeUndefined();
    expect(brand.tagName).not.toBe('BUTTON');
    expect(host.querySelectorAll('[data-action="fit"]')).toHaveLength(1);
    expect(host.querySelector('.ymz-statusbar [data-action="fit"]')).not.toBeNull();
  });

  it('shows the current canvas and appearance state while labels describe the action', () => {
    expect(canvasModeIcon('select')).toContain('ymz-icon-canvas-select');
    expect(canvasModeIcon('pan')).toContain('ymz-icon-canvas-pan');
    expect(appearanceIcon('system')).toContain('ymz-icon-appearance-system');
    expect(appearanceIcon('light')).toContain('ymz-icon-appearance-light');
    expect(appearanceIcon('dark')).toContain('ymz-icon-appearance-dark');

    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('状态');
    const canvas = host.querySelector<HTMLElement>('[data-action="toggle-selection-mode"]')!;
    const appearance = host.querySelector<HTMLElement>('[data-action="cycle-appearance"]')!;
    expect(canvas.querySelector('.ymz-icon-canvas-select')).not.toBeNull();
    expect(canvas.getAttribute('aria-label')).toContain('切换为拖动优先');
    expect(appearance.querySelector('.ymz-icon-appearance-system')).not.toBeNull();
    expect(appearance.getAttribute('aria-label')).toContain('当前跟随系统');
  });

  it('uses local SVG for transfer zoom and help controls', () => {
    expect(transferIcon('import')).toContain('<svg');
    expect(transferIcon('export')).toContain('<svg');
    expect(zoomIcon('in')).toContain('<svg');
    expect(zoomIcon('out')).toContain('<svg');
    expect(helpIcon()).toContain('<svg');

    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('动作');
    for (const action of ['import-file', 'export-file', 'zoom-in', 'zoom-out', 'help']) {
      const button = host.querySelector<HTMLElement>(`[data-action="${action}"]`)!;
      expect(button.querySelector('svg'), action).not.toBeNull();
      expect(button.getAttribute('aria-label'), action).toBeTruthy();
    }
    expect(host.querySelector('[data-action="import-file"]')?.textContent).toContain('导入');
    expect(host.querySelector('[data-action="export-file"]')?.textContent).toContain('导出');
  });

  it('updates current-state icons after settings changes', () => {
    const source = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
    expect(source).toContain('appearanceIcon(this.settings.appearanceMode)');
    expect(source).toContain('canvasModeIcon(this.settings.canvasMode)');
    expect(source).toContain('cycleAppearanceMode');
  });
});
