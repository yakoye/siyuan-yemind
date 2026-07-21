import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';

function fakeMindMap() {
  const map: any = {
    opt: { disabledClipboard: true },
    execCommand: vi.fn(),
    view: {
      fit: vi.fn(),
      reset: vi.fn(),
      enlarge: vi.fn(),
      narrow: vi.fn(),
    },
    renderer: {
      activeNodeList: [{ isRoot: false }],
      toggleActiveExpand: vi.fn(),
      startTextEdit: vi.fn(),
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(async () => undefined),
      beingCopyData: [{ data: { text: 'copied' }, children: [] }],
    },
  };
  return map;
}

describe('native same-map clipboard commands', () => {
  it('delegates copy, cut, and paste directly to the native renderer', async () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map);

    commands.copy();
    commands.cut();
    await commands.paste();

    expect(map.renderer.copy).toHaveBeenCalledOnce();
    expect(map.renderer.cut).toHaveBeenCalledOnce();
    expect(map.renderer.paste).toHaveBeenCalledOnce();
    expect(map.opt.disabledClipboard).toBe(true);
  });
});
