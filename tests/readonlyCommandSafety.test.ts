import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';

function createNode(overrides: Record<string, unknown> = {}) {
  return {
    isRoot: false,
    isGeneralization: false,
    getData: vi.fn((key?: string) => key ? undefined : {}),
    ...overrides,
  };
}

function fakeMindMap(readonly: boolean, nodes = [createNode()]) {
  return {
    getConfig: vi.fn((key: string) => key === 'readonly' ? readonly : undefined),
    execCommand: vi.fn(),
    render: vi.fn(),
    view: {
      fit: vi.fn(),
      reset: vi.fn(),
      enlarge: vi.fn(),
      narrow: vi.fn(),
    },
    renderer: {
      startTextEdit: vi.fn(),
      activeNodeList: nodes,
      toggleActiveExpand: vi.fn(),
      copy: vi.fn(),
      cut: vi.fn(),
      paste: vi.fn(),
    },
    richText: {
      formatText: vi.fn(),
      removeFormat: vi.fn(),
    },
  };
}

describe('readonly command safety', () => {
  it('blocks every mutating command while keeping view and copy operations available', async () => {
    const map = fakeMindMap(true);
    const commands = createCommandAdapter(map as never);

    commands.addChild();
    commands.addSibling();
    commands.addParent();
    commands.moveUp();
    commands.moveDown();
    commands.remove();
    commands.removeOnlyCurrent();
    commands.edit();
    commands.cut();
    await commands.paste();
    commands.setTodo({ checked: false });
    commands.setTags(['x']);
    commands.formatText({ bold: true });
    commands.resetLayout();
    commands.undo();
    commands.redo();

    expect(map.execCommand).not.toHaveBeenCalled();
    expect(map.renderer.startTextEdit).not.toHaveBeenCalled();
    expect(map.renderer.cut).not.toHaveBeenCalled();
    expect(map.renderer.paste).not.toHaveBeenCalled();
    expect(map.richText.formatText).not.toHaveBeenCalled();

    commands.copy();
    commands.fit();
    commands.resetZoom();
    commands.zoomIn();
    commands.zoomOut();
    commands.toggleExpand();

    expect(map.renderer.copy).toHaveBeenCalledOnce();
    expect(map.view.fit).toHaveBeenCalledOnce();
    expect(map.view.reset).toHaveBeenCalledOnce();
    expect(map.view.enlarge).toHaveBeenCalledOnce();
    expect(map.view.narrow).toHaveBeenCalledOnce();
    expect(map.renderer.toggleActiveExpand).toHaveBeenCalledOnce();
  });

  it('never removes the root node or clears its children', () => {
    const root = createNode({ isRoot: true });
    const child = createNode();
    const map = fakeMindMap(false, [root, child]);
    const commands = createCommandAdapter(map as never);

    commands.remove();
    commands.removeOnlyCurrent();

    expect(map.execCommand).toHaveBeenNthCalledWith(1, 'REMOVE_NODE', [child]);
    expect(map.execCommand).toHaveBeenNthCalledWith(2, 'REMOVE_CURRENT_NODE', [child]);
  });

  it('removes only the primary generalization even when other nodes are selected', () => {
    const summary = createNode({ isGeneralization: true });
    const other = createNode();
    const map = fakeMindMap(false, [summary, other]);
    const commands = createCommandAdapter(map as never);

    commands.removeSummary();

    expect(map.execCommand).toHaveBeenCalledWith('REMOVE_NODE', [summary]);
  });
});
