import { afterEach, describe, expect, it, vi } from 'vitest';
import { createEditorTemplate } from '../../../src/editor/editorTemplate';
import {
  ToolbarVisibilityController,
  type ToolbarSide,
} from '../../../src/editor/ToolbarVisibilityController';

afterEach(() => {
  vi.useRealTimers();
});

function createRoot() {
  const root = document.createElement('div');
  root.innerHTML = `
    <div class="ymz-topbar"><button>top</button></div>
    <div class="ymz-leftbar"><button>left</button></div>
    <div class="ymz-statusbar"><button>bottom</button></div>
    <button data-toolbar-edge="top"></button>
    <button data-toolbar-edge="left"></button>
    <button data-toolbar-edge="bottom"></button>
  `;
  Object.assign(root.dataset, {
    topbarVisible: 'true',
    leftbarVisible: 'true',
    statusbarVisible: 'true',
    zen: 'false',
  });
  root.getBoundingClientRect = () => ({
    x: 0, y: 0, left: 0, top: 0, right: 500, bottom: 400,
    width: 500, height: 400, toJSON: () => ({}),
  });
  return root;
}

function visible(root: HTMLElement, side: ToolbarSide): string | undefined {
  return side === 'top'
    ? root.dataset.topbarVisible
    : side === 'left'
      ? root.dataset.leftbarVisible
      : root.dataset.statusbarVisible;
}

describe('v1.5.0 unified toolbar visibility', () => {
  it('renders one accessible discovery handle for each hidden edge', () => {
    const host = document.createElement('div');
    host.innerHTML = createEditorTemplate('工具栏');
    const handles = [...host.querySelectorAll<HTMLButtonElement>('[data-toolbar-edge]')];

    expect(handles.map((button) => button.dataset.toolbarEdge)).toEqual(['top', 'left', 'bottom']);
    expect(handles.map((button) => button.getAttribute('aria-label'))).toEqual([
      '显示顶部工具栏',
      '显示左侧工具栏',
      '显示底部工具栏',
    ]);
    handles.forEach((button) => expect(button.type).toBe('button'));
  });

  it('uses one shared reveal and hide state for all three toolbars', () => {
    vi.useFakeTimers();
    const root = createRoot();
    const controller = new ToolbarVisibilityController({
      root,
      pinned: false,
      hideDelayMs: 700,
    });
    vi.advanceTimersByTime(700);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['false', 'false', 'false']);

    controller.revealLeft();
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
    vi.advanceTimersByTime(700);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['false', 'false', 'false']);
    controller.destroy();
  });

  it('reveals all toolbars from any approached, clicked or focused edge', () => {
    vi.useFakeTimers();
    const root = createRoot();
    const controller = new ToolbarVisibilityController({
      root,
      pinned: false,
      hideDelayMs: 700,
      hotZonePx: 28,
    });
    vi.advanceTimersByTime(700);

    root.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 250,
      clientY: 2,
    }));
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
    vi.advanceTimersByTime(2_100);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);

    root.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 250,
      clientY: 200,
    }));
    vi.advanceTimersByTime(700);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['false', 'false', 'false']);
    root.querySelector<HTMLButtonElement>('[data-toolbar-edge="bottom"]')!.click();
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
    vi.advanceTimersByTime(700);
    root.querySelector<HTMLButtonElement>('[data-toolbar-edge="left"]')!
      .dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
    controller.destroy();
  });

  it('pins all sides together and cancels every pending timer on destroy', () => {
    vi.useFakeTimers();
    const root = createRoot();
    const controller = new ToolbarVisibilityController({
      root,
      pinned: false,
      hideDelayMs: 700,
    });
    controller.setPinned(true);
    vi.advanceTimersByTime(2_000);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
    controller.setPinned(false);
    controller.destroy();
    vi.advanceTimersByTime(2_000);
    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['true', 'true', 'true']);
  });

  it('keeps a real neutral canvas zone in very small editor surfaces', () => {
    vi.useFakeTimers();
    const root = createRoot();
    root.getBoundingClientRect = () => ({
      x: 0, y: 0, left: 0, top: 0, right: 90, bottom: 60,
      width: 90, height: 60, toJSON: () => ({}),
    });
    const controller = new ToolbarVisibilityController({
      root,
      pinned: false,
      hideDelayMs: 100,
      hotZonePx: 28,
    });
    vi.advanceTimersByTime(100);

    root.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      clientX: 45,
      clientY: 30,
    }));
    vi.advanceTimersByTime(100);

    expect([visible(root, 'top'), visible(root, 'left'), visible(root, 'bottom')])
      .toEqual(['false', 'false', 'false']);
    controller.destroy();
  });
});
