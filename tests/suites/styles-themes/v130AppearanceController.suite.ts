import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppearanceController } from '../../../src/ui/AppearanceController';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

function createSystemSubscription() {
  let listener: ((dark: boolean) => void) | null = null;
  const unsubscribe = vi.fn();
  return {
    subscribe: (next: (dark: boolean) => void) => {
      listener = next;
      return unsubscribe;
    },
    emit: (dark: boolean) => listener?.(dark),
    unsubscribe,
  };
}

describe('v1.3.0 appearance controller', () => {
  it('applies the resolved appearance and color scheme to its root', () => {
    const root = document.createElement('section');
    const controller = new AppearanceController({
      root,
      getSystemDark: () => true,
    });

    expect(controller.getMode()).toBe('system');
    expect(controller.getResolved()).toBe('dark');
    expect(root.dataset.appearanceMode).toBe('system');
    expect(root.dataset.appearance).toBe('dark');
    expect(root.style.colorScheme).toBe('dark');

    controller.setMode('light');
    expect(root.dataset.appearanceMode).toBe('light');
    expect(root.dataset.appearance).toBe('light');
    expect(root.style.colorScheme).toBe('light');
    controller.destroy();
  });

  it('responds to host changes only while following system', () => {
    const system = createSystemSubscription();
    const root = document.createElement('div');
    const controller = new AppearanceController({
      root,
      getSystemDark: () => false,
      subscribeSystem: system.subscribe,
    });

    system.emit(true);
    expect(controller.getResolved()).toBe('dark');
    controller.setMode('light');
    system.emit(true);
    expect(controller.getResolved()).toBe('light');
    controller.setMode('system');
    expect(controller.getResolved()).toBe('dark');

    controller.destroy();
    expect(system.unsubscribe).toHaveBeenCalledOnce();
  });

  it('normalizes malformed modes and stops mutating after destroy', () => {
    const system = createSystemSubscription();
    const root = document.createElement('div');
    const controller = new AppearanceController({
      root,
      getSystemDark: () => false,
      subscribeSystem: system.subscribe,
    });

    controller.setMode('sepia' as never);
    expect(controller.getMode()).toBe('system');
    controller.destroy();
    system.emit(true);

    expect(root.dataset.appearance).toBe('light');
  });

  it('reports resolved changes without duplicating unchanged notifications', () => {
    const system = createSystemSubscription();
    const onChange = vi.fn();
    const controller = new AppearanceController({
      root: document.createElement('div'),
      getSystemDark: () => false,
      subscribeSystem: system.subscribe,
      onChange,
    });

    expect(onChange).toHaveBeenLastCalledWith('light', 'system');
    system.emit(false);
    expect(onChange).toHaveBeenCalledTimes(1);
    system.emit(true);
    expect(onChange).toHaveBeenLastCalledWith('dark', 'system');
    controller.setMode('dark');
    expect(onChange).toHaveBeenCalledTimes(2);
    controller.setMode('light');
    expect(onChange).toHaveBeenLastCalledWith('light', 'light');
    controller.destroy();
  });

  it('uses the shared controller instead of a second editor-only appearance observer', () => {
    expect(editorSource).toContain("import { AppearanceController } from '../ui/AppearanceController'");
    expect(editorSource).toContain('this.appearanceController?.setMode(settings.appearanceMode)');
    expect(editorSource).toContain('this.appearanceController?.destroy()');
    expect(editorSource).not.toContain('private appearanceObserver: MutationObserver');
    expect(editorSource).not.toContain('private appearanceMedia: MediaQueryList');
  });
});
