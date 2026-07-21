import { describe, expect, it } from 'vitest';
import { calculateDialogResize } from '../src/ui/dialogResize';

describe('note dialog resize', () => {
  it('resizes from the pointer delta and clamps to the viewport', () => {
    expect(calculateDialogResize({ startWidth: 560, startHeight: 380, deltaX: 80, deltaY: 70, viewportWidth: 1200, viewportHeight: 800 }))
      .toEqual({ width: 640, height: 450 });
    expect(calculateDialogResize({ startWidth: 420, startHeight: 280, deltaX: -900, deltaY: -900, viewportWidth: 900, viewportHeight: 600 }))
      .toEqual({ width: 420, height: 280 });
    expect(calculateDialogResize({ startWidth: 800, startHeight: 600, deltaX: 500, deltaY: 500, viewportWidth: 1000, viewportHeight: 700 }))
      .toEqual({ width: 968, height: 668 });
  });
});
