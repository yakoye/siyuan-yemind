import { describe, expect, it } from 'vitest';
import { DragViewportController } from '../src/editor/DragViewportController';

const view = (x: number) => ({
  state: { scale: 1, x, y: 0, sx: 0, sy: 0 },
  transform: { scaleX: 1, scaleY: 1, translateX: x, translateY: 0 },
});

describe('DragViewportController', () => {
  it('captures only the first drag transform and suppresses transient persistence', () => {
    const controller = new DragViewportController();
    controller.begin(view(10));
    controller.begin(view(20));
    expect(controller.shouldPersistView()).toBe(false);
    expect(controller.finish(view(200), true)).toEqual(view(10));
    expect(controller.shouldPersistView()).toBe(true);
  });

  it('keeps the final transform when viewport preservation is disabled', () => {
    const controller = new DragViewportController();
    controller.begin(view(10));
    expect(controller.finish(view(30), false)).toEqual(view(30));
  });
});
