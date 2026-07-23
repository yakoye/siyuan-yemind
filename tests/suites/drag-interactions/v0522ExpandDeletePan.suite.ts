import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';
import { isEditableTarget } from '../../../src/editor/shortcuts';
import {
  CanvasRightDragController,
  CanvasRightDragGesture,
  cancelNativeSelectionGesture,
  shouldSuppressCanvasContextMenu,
} from '../../../src/editor/canvasRightDrag';

describe('v0.5.22 collapsed node expansion bridge', () => {
  it('expands a collapsed rendered node whose live children list is empty but persisted children still exist', () => {
    const collapsed = {
      isRoot: false,
      isGeneralization: false,
      children: [],
      nodeData: { children: [{ data: { uid: 'child' }, children: [] }] },
      getData: vi.fn((key?: string) => key === 'uid' ? 'branch' : key === 'expand' ? false : undefined),
    };
    const map = {
      opt: { readonly: false },
      renderer: {
        activeNodeList: [],
        findNodeByUid: vi.fn(() => collapsed),
      },
      execCommand: vi.fn(),
      view: {},
    } as any;
    const commands = createCommandAdapter(map);

    expect(commands.setNodeExpandedByUid('branch', true)).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_EXPAND', collapsed, true);
  });

  it('does the same for a collapsed Root node', () => {
    const root = {
      isRoot: true,
      isGeneralization: false,
      children: [],
      nodeData: { children: [{ data: { uid: 'first' }, children: [] }] },
      getData: vi.fn((key?: string) => key === 'uid' ? 'root' : key === 'expand' ? false : undefined),
    };
    const map = {
      opt: { readonly: false },
      renderer: { activeNodeList: [], findNodeByUid: vi.fn(() => root) },
      execCommand: vi.fn(),
      view: {},
    } as any;
    const commands = createCommandAdapter(map);

    expect(commands.setNodeExpandedByUid('root', true)).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_EXPAND', root, true);
  });
});

describe('v0.5.22 outline editing shortcut isolation', () => {
  it('treats the outline editor host and all descendants as editable targets', () => {
    const host = document.createElement('div');
    host.dataset.outlineEditor = '';
    const child = document.createElement('span');
    host.appendChild(child);

    expect(isEditableTarget(host)).toBe(true);
    expect(isEditableTarget(child)).toBe(true);
  });
});

describe('v0.5.22 canvas right-drag gesture', () => {
  it('crosses a movement threshold, emits incremental pan deltas, and suppresses the following menu', () => {
    const gesture = new CanvasRightDragGesture(5);
    expect(gesture.pointerDown({ button: 2, clientX: 10, clientY: 10 })).toBe(true);
    expect(gesture.pointerMove({ clientX: 12, clientY: 12 })).toEqual({ dragging: false, dx: 0, dy: 0 });
    expect(gesture.pointerMove({ clientX: 20, clientY: 17 })).toEqual({ dragging: true, dx: 8, dy: 5 });
    expect(gesture.pointerMove({ clientX: 25, clientY: 20 })).toEqual({ dragging: true, dx: 5, dy: 3 });
    expect(gesture.pointerUp()).toBe(true);
    expect(gesture.consumeContextMenu()).toBe(true);
    expect(gesture.consumeContextMenu()).toBe(false);
  });

  it('does not suppress a stationary right click', () => {
    const gesture = new CanvasRightDragGesture(5);
    gesture.pointerDown({ button: 2, clientX: 10, clientY: 10 });
    expect(gesture.pointerUp()).toBe(false);
    expect(shouldSuppressCanvasContextMenu(gesture)).toBe(false);
  });



  it('cancels the upstream right-button selection rectangle before pan starts', () => {
    const remove = vi.fn();
    const clearAutoMoveTimer = vi.fn();
    const activeNodeList = [{ uid: 'kept-selected' }];
    const map = {
      select: { isMousedown: true, isSelecting: true, cacheActiveList: [...activeNodeList], rect: { remove }, autoMove: { clearAutoMoveTimer } },
      renderer: { activeNodeList },
    };
    expect(cancelNativeSelectionGesture(map)).toBe(true);
    expect(map.select.isMousedown).toBe(false);
    expect(map.select.isSelecting).toBe(false);
    expect(map.select.cacheActiveList).toEqual([]);
    expect(map.select.rect).toBeNull();
    expect(remove).toHaveBeenCalledOnce();
    expect(clearAutoMoveTimer).toHaveBeenCalledOnce();
    expect(map.renderer.activeNodeList).toBe(activeNodeList);
  });

  it('pans manually in pan mode, shows the grabbing state, and suppresses the release menu', () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const root = document.createElement('div');
    const translateXY = vi.fn();
    const map = {
      on: vi.fn((name: string, callback: (...args: any[]) => void) => listeners.set(name, callback)),
      off: vi.fn(),
      view: { translateXY },
    };
    const controller = new CanvasRightDragController({ root, map, mode: () => 'pan' });

    listeners.get('mousedown')?.({ button: 2, clientX: 10, clientY: 10 });
    listeners.get('mousemove')?.({ clientX: 20, clientY: 20, preventDefault: vi.fn() });
    expect(translateXY).toHaveBeenCalledWith(10, 10);
    expect(root.classList.contains('is-canvas-right-dragging')).toBe(true);

    listeners.get('mouseup')?.({ button: 2 });
    expect(root.classList.contains('is-canvas-right-dragging')).toBe(false);
    expect(controller.consumeContextMenu()).toBe(true);
    controller.destroy();
  });

  it('restores the existing active selection after drag-first right panning', () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const selected = { uid: 'selected' };
    const renderer = {
      activeNodeList: [selected] as any[],
      clearActiveNodeList: vi.fn(function (this: any) { this.activeNodeList = []; }),
      activeMultiNode: vi.fn(function (this: any, nodes: any[]) { this.activeNodeList = [...nodes]; }),
      emitNodeActiveEvent: vi.fn(),
    };
    const map = {
      on: vi.fn((name: string, callback: (...args: any[]) => void) => listeners.set(name, callback)),
      off: vi.fn(),
      renderer,
      select: { isMousedown: true, isSelecting: false, cacheActiveList: [], rect: null, autoMove: { clearAutoMoveTimer: vi.fn() } },
      view: { translateXY: vi.fn() },
    };
    const root = document.createElement('div');
    const controller = new CanvasRightDragController({ root, map, mode: () => 'pan' });
    listeners.get('mousedown')?.({ button: 2, clientX: 10, clientY: 10 });
    renderer.activeNodeList = [];
    listeners.get('mousemove')?.({ clientX: 30, clientY: 20, preventDefault: vi.fn() });
    expect(renderer.activeNodeList).toEqual([selected]);
    listeners.get('mouseup')?.({ button: 2 });
    expect(renderer.activeNodeList).toEqual([selected]);
    controller.destroy();
  });

  it('lets upstream perform the actual pan in select mode while still suppressing the menu', () => {
    const listeners = new Map<string, (...args: any[]) => void>();
    const root = document.createElement('div');
    const translateXY = vi.fn();
    const map = {
      on: vi.fn((name: string, callback: (...args: any[]) => void) => listeners.set(name, callback)),
      off: vi.fn(),
      view: { translateXY },
    };
    const controller = new CanvasRightDragController({ root, map, mode: () => 'select' });

    listeners.get('mousedown')?.({ button: 2, clientX: 0, clientY: 0 });
    listeners.get('mousemove')?.({ clientX: 9, clientY: 0, preventDefault: vi.fn() });
    listeners.get('mouseup')?.({ button: 2 });

    expect(translateXY).not.toHaveBeenCalled();
    expect(controller.consumeContextMenu()).toBe(true);
    controller.destroy();
  });
});
