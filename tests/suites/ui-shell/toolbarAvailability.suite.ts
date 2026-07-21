import { describe, expect, it } from 'vitest';
import { createToolbarAvailability } from '../../../src/editor/toolbarAvailability';

describe('editor toolbar availability', () => {
  it('disables node actions when nothing is selected', () => {
    const state = createToolbarAvailability({
      readonly: false,
      selectedCount: 0,
      primaryIsRoot: false,
      primaryIsGeneralization: false,
    });
    expect(state.addChild).toBe(false);
    expect(state.addSibling).toBe(false);
    expect(state.remove).toBe(false);
    expect(state.layout).toBe(true);
  });

  it('protects root and generalization nodes while keeping valid actions enabled', () => {
    const root = createToolbarAvailability({
      readonly: false,
      selectedCount: 1,
      primaryIsRoot: true,
      primaryIsGeneralization: false,
    });
    expect(root.addChild).toBe(true);
    expect(root.addSibling).toBe(false);
    expect(root.remove).toBe(false);

    const summary = createToolbarAvailability({
      readonly: false,
      selectedCount: 1,
      primaryIsRoot: false,
      primaryIsGeneralization: true,
    });
    expect(summary.addChild).toBe(false);
    expect(summary.addSibling).toBe(false);
  });

  it('disables all mutation controls in readonly mode', () => {
    const state = createToolbarAvailability({
      readonly: true,
      selectedCount: 1,
      primaryIsRoot: false,
      primaryIsGeneralization: false,
    });
    expect(state.undo).toBe(false);
    expect(state.redo).toBe(false);
    expect(state.addChild).toBe(false);
    expect(state.resetLayout).toBe(false);
    expect(state.layout).toBe(false);
  });
});
