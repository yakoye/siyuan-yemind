import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { createSelectionPresentation } from '../src/editor/selectionPresentation';
import { DEFAULT_SETTINGS } from '../src/settings/SettingsStore';
import { createSettingsDialogTemplate } from '../src/settings/settingsDialogTemplate';
import { readFileSync } from 'node:fs';

function surface(html: string, selector: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.querySelector<HTMLElement>(selector)!;
}

describe('v0.6.2 toolbar visual language', () => {
  it('keeps only history, undo and redo in the left toolbar and uses svg icons', () => {
    const left = surface(createEditorTemplate('Demo'), '.ymz-leftbar');
    expect(left.querySelector('[data-action="checkpoints"] svg')).not.toBeNull();
    expect(left.querySelector('[data-action="undo"] svg')).not.toBeNull();
    expect(left.querySelector('[data-action="redo"] svg')).not.toBeNull();
    expect(left.querySelector('[data-action="reset-layout"]')).toBeNull();
    expect(left.querySelector('[data-action="toggle-selection-mode"]')).toBeNull();
    expect(left.querySelectorAll('button')).toHaveLength(3);
  });

  it('places select/drag immediately before lock and uses icons for lock and zen', () => {
    const bottom = surface(createEditorTemplate('Demo'), '.ymz-statusbar');
    const mode = bottom.querySelector<HTMLElement>('[data-action="toggle-selection-mode"]')!;
    const lock = bottom.querySelector<HTMLElement>('[data-action="readonly"]')!;
    const zen = bottom.querySelector<HTMLElement>('[data-action="zen"]')!;
    expect(mode.nextElementSibling).toBe(lock);
    expect(mode.textContent?.trim()).toBe('');
    expect(mode.querySelector('svg.ymz-icon-canvas-select')).not.toBeNull();
    expect(lock.querySelector('svg.ymz-icon-lock')).not.toBeNull();
    expect(zen.querySelector('svg.ymz-icon-meditation')).not.toBeNull();
  });

  it('uses svg search and meditation exit controls', () => {
    const html = createEditorTemplate('Demo');
    const top = surface(html, '.ymz-topbar');
    const exit = surface(html, '.ymz-zen-exit');
    expect(top.querySelector('[data-action="open-search"] svg.ymz-icon-search')).not.toBeNull();
    expect(exit.querySelectorAll('svg.ymz-icon-meditation')).toHaveLength(2);
    expect(exit.textContent).toContain('退出禅模式');
    expect(exit.textContent).not.toContain('禅退出禅模式');
  });

  it('uses consistent select/drag wording and defaults new installs to select', () => {
    expect(DEFAULT_SETTINGS.canvasMode).toBe('select');
    expect(createSelectionPresentation(0, 'select')).toMatchObject({
      modeLabel: '选（选择优先）',
      modeShortLabel: '选',
      modeTitle: '选（选择优先）：左键框选，右键拖动画布',
    });
    expect(createSelectionPresentation(0, 'pan')).toMatchObject({
      modeLabel: '拖（拖动优先）',
      modeShortLabel: '拖',
      modeTitle: '拖（拖动优先）：左键拖动画布，Ctrl/Cmd + 左键框选',
    });
    const settings = createSettingsDialogTemplate(DEFAULT_SETTINGS);
    expect(settings).toContain('画布操作模式');
    expect(settings).toContain('data-canvas-mode-choice="select"');
    expect(settings).toContain('data-canvas-mode-choice="pan"');
    expect(settings).toContain('选择优先');
    expect(settings).toContain('拖动优先');
    expect(settings).toContain('ymz-icon-canvas-select');
    expect(settings).toContain('ymz-icon-canvas-pan');
  });

  it('defines green active, focus and canvas node selection states', () => {
    const css = readFileSync('src/styles/index.css', 'utf8');
    expect(css).toContain('--ymz-accent:var(--ymz-green,#176b50)');
    expect(css).toContain('.ymz-outline-row.is-active');
    expect(css).toContain('.ymz-editor .smm-node.active .smm-hover-node');
    expect(css).toContain('.ymz-floating button.is-active');
    expect(css).toContain('stroke:var(--ymz-accent)!important');
  });
});
