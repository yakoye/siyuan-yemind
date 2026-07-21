import { describe, expect, it } from 'vitest';
import { createEditorTemplate } from '../src/editor/editorTemplate';
import { createSettingsDialogTemplate } from '../src/settings/settingsDialogTemplate';
import { DEFAULT_SETTINGS } from '../src/settings/SettingsStore';
import * as projectControls from '../src/editor/projectControls';
import { readFileSync } from 'node:fs';

describe('v0.6.3 canvas mode icon language', () => {
  it('renders pointer and hand svg icons from one shared icon function', () => {
    const icon = (projectControls as any).canvasModeIcon;
    expect(icon).toBeTypeOf('function');
    expect(icon('select')).toContain('ymz-icon-canvas-select');
    expect(icon('pan')).toContain('ymz-icon-canvas-pan');
  });

  it('uses only the mode icon in the bottom toolbar', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('Demo');
    const button = host.querySelector<HTMLElement>('[data-action="toggle-selection-mode"]')!;
    expect(button.querySelector('[data-role="canvas-mode-icon"] svg.ymz-icon-canvas-select')).not.toBeNull();
    expect(button.querySelector('[data-role="canvas-mode-label"]')).toBeNull();
    expect(button.textContent?.trim()).toBe('');
  });

  it('uses matching icon radio choices in settings instead of a text-only select', () => {
    const html = createSettingsDialogTemplate(DEFAULT_SETTINGS);
    expect(html).toContain('data-canvas-mode-choice="select"');
    expect(html).toContain('data-canvas-mode-choice="pan"');
    expect(html).toContain('ymz-icon-canvas-select');
    expect(html).toContain('ymz-icon-canvas-pan');
    expect(html).not.toMatch(/<select[^>]+data-setting="canvasMode"/);
  });

  it('updates the bottom icon when the mode changes', () => {
    const source = readFileSync('src/editor/YeMindEditor.ts', 'utf8');
    expect(source).toContain('[data-role="canvas-mode-icon"]');
    expect(source).toContain('canvasModeIcon(this.settings.canvasMode)');
  });
});
