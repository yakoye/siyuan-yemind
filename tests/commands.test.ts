import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../src/core/commands';

function fakeMindMap() {
  return {
    execCommand: vi.fn(),
    view: {
      fit: vi.fn(),
      reset: vi.fn(),
      enlarge: vi.fn(),
      narrow: vi.fn(),
    },
    renderer: {
      startTextEdit: vi.fn(),
      activeNodeList: [{}],
      toggleActiveExpand: vi.fn(),
    },
  };
}

describe('createCommandAdapter', () => {
  it('maps node actions to simple-mind-map native commands', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    commands.addChild();
    commands.addSibling();
    commands.addParent();
    commands.moveUp();
    commands.moveDown();
    commands.toggleExpand();
    commands.remove();
    commands.removeOnlyCurrent();
    commands.undo();
    commands.redo();

    expect(map.renderer.toggleActiveExpand).toHaveBeenCalledOnce();
    expect(map.execCommand.mock.calls).toEqual([
      ['INSERT_CHILD_NODE'],
      ['INSERT_NODE'],
      ['INSERT_PARENT_NODE'],
      ['UP_NODE'],
      ['DOWN_NODE'],
      ['REMOVE_NODE'],
      ['REMOVE_CURRENT_NODE'],
      ['BACK'],
      ['FORWARD'],
    ]);
  });

  it('uses native view and edit methods', () => {
    const map = fakeMindMap();
    const commands = createCommandAdapter(map as never);

    commands.fit();
    commands.resetZoom();
    commands.zoomIn();
    commands.zoomOut();
    commands.edit();

    expect(map.view.fit).toHaveBeenCalledOnce();
    expect(map.view.reset).toHaveBeenCalledOnce();
    expect(map.view.enlarge).toHaveBeenCalledOnce();
    expect(map.view.narrow).toHaveBeenCalledOnce();
    expect(map.renderer.startTextEdit).toHaveBeenCalledOnce();
  });
});
