import { describe, expect, it } from 'vitest';
import { createNodeMenuAvailability } from '../src/ui/nodeContentMenu';

describe('node context menu availability', () => {
  it('disables all editing actions in readonly mode but leaves copy and expand available', () => {
    const state = createNodeMenuAvailability({
      readonly: true,
      primaryIsRoot: false,
      primaryIsGeneralization: false,
      hasRichTextSelection: true,
      hasCodeBlock: true,
    });

    expect(state.edit).toBe(false);
    expect(state.addChild).toBe(false);
    expect(state.cut).toBe(false);
    expect(state.paste).toBe(false);
    expect(state.nodeContent).toBe(false);
    expect(state.copy).toBe(true);
    expect(state.toggleExpand).toBe(true);
  });

  it('protects the root and only enables inline tools when a rich-text target exists', () => {
    const state = createNodeMenuAvailability({
      readonly: false,
      primaryIsRoot: true,
      primaryIsGeneralization: false,
      hasRichTextSelection: false,
      hasCodeBlock: false,
    });

    expect(state.remove).toBe(false);
    expect(state.removeOnlyCurrent).toBe(false);
    expect(state.addSibling).toBe(false);
    expect(state.addParent).toBe(false);
    expect(state.inlineLink).toBe(false);
    expect(state.codeBlock).toBe(false);
  });
});
