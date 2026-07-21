import { describe, expect, it, vi } from 'vitest';
import { hasNonZeroSize, waitForNonZeroSize } from '../../../src/plugin/visibleElement';

describe('visible element readiness', () => {
  it('rejects zero-sized containers and accepts visible containers', () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = vi.fn(() => ({ width: 0, height: 20 } as DOMRect));
    expect(hasNonZeroSize(element)).toBe(false);
    element.getBoundingClientRect = vi.fn(() => ({ width: 800, height: 600 } as DOMRect));
    expect(hasNonZeroSize(element)).toBe(true);
  });

  it('waits until a restored hidden tab becomes visible', async () => {
    const element = document.createElement('div');
    let visible = false;
    element.getBoundingClientRect = vi.fn(() => ({ width: visible ? 800 : 0, height: visible ? 600 : 0 } as DOMRect));
    const wait = waitForNonZeroSize(element, { pollMs: 1 });
    visible = true;
    await expect(wait).resolves.toBe(true);
  });

  it('stops waiting when the tab is destroyed', async () => {
    const element = document.createElement('div');
    element.getBoundingClientRect = vi.fn(() => ({ width: 0, height: 0 } as DOMRect));
    let destroyed = false;
    const wait = waitForNonZeroSize(element, { pollMs: 1, isCancelled: () => destroyed });
    destroyed = true;
    await expect(wait).resolves.toBe(false);
  });
});

it('settles immediately for an already visible container', async () => {
  const element = document.createElement('div');
  element.getBoundingClientRect = vi.fn(() => ({ width: 640, height: 480 } as DOMRect));
  await expect(waitForNonZeroSize(element, { pollMs: 1 })).resolves.toBe(true);
});
