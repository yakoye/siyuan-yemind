import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';

function regularNode(extra: Record<string, unknown> = {}) {
  return { isRoot: false, isGeneralization: false, ...extra };
}

function fakeMap(nodes: any[] = [regularNode()], readonly = false) {
  const textNode = { id: 'frame-text' };
  const firstNode = { getData: vi.fn(() => ({ text: '范围', strokeColor: '#123456' })) };
  const active = { node: { children: [firstNode] }, range: [0, 0], textNode };
  const outerFrame = {
    activeOuterFrame: active,
    getActiveOuterFrame: vi.fn(() => active),
    getNodeRangeFirstNode: vi.fn(() => firstNode),
    getStyle: vi.fn(() => ({ text: '范围', strokeColor: '#123456', fill: '#abcdef22', strokeDasharray: '5,5', textAlign: 'left' })),
    showEditTextBox: vi.fn(),
    updateActiveOuterFrame: vi.fn(),
    removeActiveOuterFrame: vi.fn(),
  };
  return {
    opt: { readonly },
    renderer: { activeNodeList: nodes },
    execCommand: vi.fn(),
    outerFrame,
    textNode,
  };
}

describe('native outer-frame commands', () => {
  it('adds an outer frame only when at least one selected node is a regular non-root node', () => {
    const map = fakeMap();
    const commands = createCommandAdapter(map as never);
    expect(commands.canAddOuterFrame()).toBe(true);
    commands.addOuterFrame();
    expect(map.execCommand).toHaveBeenCalledWith('ADD_OUTER_FRAME');

    map.renderer.activeNodeList = [{ isRoot: true }, { isGeneralization: true }];
    expect(commands.canAddOuterFrame()).toBe(false);
    commands.addOuterFrame();
    expect(map.execCommand).toHaveBeenCalledTimes(1);
  });

  it('delegates active-frame edit, style update, and deletion to the upstream plugin', () => {
    const map = fakeMap();
    const commands = createCommandAdapter(map as never);
    expect(commands.hasActiveOuterFrame()).toBe(true);
    expect(commands.getActiveOuterFrameStyle()).toMatchObject({ strokeColor: '#123456' });

    commands.editActiveOuterFrameText();
    commands.updateActiveOuterFrame({ strokeColor: '#ff0000' });
    commands.removeActiveOuterFrame();

    expect(map.outerFrame.showEditTextBox).toHaveBeenCalledWith(map.textNode);
    expect(map.outerFrame.updateActiveOuterFrame).toHaveBeenCalledWith({ strokeColor: '#ff0000' });
    expect(map.outerFrame.removeActiveOuterFrame).toHaveBeenCalledOnce();
  });

  it('guards every mutation in readonly mode and safely handles a missing plugin or inactive frame', () => {
    const readonlyMap = fakeMap([regularNode()], true);
    const readonlyCommands = createCommandAdapter(readonlyMap as never);
    readonlyCommands.addOuterFrame();
    readonlyCommands.editActiveOuterFrameText();
    readonlyCommands.updateActiveOuterFrame({ fill: '#fff' });
    readonlyCommands.removeActiveOuterFrame();
    expect(readonlyMap.execCommand).not.toHaveBeenCalled();
    expect(readonlyMap.outerFrame.updateActiveOuterFrame).not.toHaveBeenCalled();

    const missing = {
      opt: { readonly: false },
      renderer: { activeNodeList: [regularNode()] },
      execCommand: vi.fn(),
    };
    const commands = createCommandAdapter(missing as never);
    expect(commands.canAddOuterFrame()).toBe(false);
    expect(commands.hasActiveOuterFrame()).toBe(false);
    expect(commands.getActiveOuterFrameStyle()).toBeNull();
    expect(() => {
      commands.editActiveOuterFrameText();
      commands.updateActiveOuterFrame({ textAlign: 'center' });
      commands.removeActiveOuterFrame();
    }).not.toThrow();
  });
});
