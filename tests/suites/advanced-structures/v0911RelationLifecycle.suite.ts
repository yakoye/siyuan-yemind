import { describe, expect, it, vi } from 'vitest';
import YeMindAssociativeLine from '../../../src/core/YeMindAssociativeLine';

describe('v0.9.11 association-line lifecycle', () => {
  it('ignores a delayed overlap probe after creation has ended', () => {
    const plugin = Object.create((YeMindAssociativeLine as any).prototype);
    plugin.isCreatingLine = false;
    plugin.creatingStartNode = null;
    plugin.mindMap = { renderer: { root: {} } };
    expect(() => plugin.checkOverlapNode(10, 20)).not.toThrow();
  });

  it('does not complete or cancel an already-cleared relation session', () => {
    const plugin = Object.create((YeMindAssociativeLine as any).prototype);
    plugin.isCreatingLine = false;
    plugin.creatingStartNode = null;
    plugin.creatingLine = null;
    expect(() => plugin.completeCreateLine({ uid: 'target' })).not.toThrow();
    expect(() => plugin.cancelCreateLine()).not.toThrow();
  });
});
