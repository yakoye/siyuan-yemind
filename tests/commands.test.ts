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
    commands.resetLayout();

    expect(map.renderer.toggleActiveExpand).toHaveBeenCalledOnce();
    expect(map.execCommand.mock.calls).toEqual([
      ['INSERT_CHILD_NODE'],
      ['INSERT_NODE'],
      ['INSERT_PARENT_NODE'],
      ['UP_NODE'],
      ['DOWN_NODE'],
      ['REMOVE_NODE', [map.renderer.activeNodeList[0]]],
      ['REMOVE_CURRENT_NODE', [map.renderer.activeNodeList[0]]],
      ['BACK'],
      ['FORWARD'],
      ['RESET_LAYOUT'],
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

it('guards structural commands for root and generalization nodes', () => {
  const calls: any[] = [];
  const root = { isRoot: true, isGeneralization: false };
  const map = {
    opt: { readonly: false },
    renderer: { activeNodeList: [root], toggleActiveExpand: () => undefined },
    execCommand: (...args: any[]) => calls.push(args),
    view: { fit: () => undefined, reset: () => undefined, enlarge: () => undefined, narrow: () => undefined },
  } as any;
  const commands = createCommandAdapter(map);

  commands.addSibling();
  commands.addParent();
  commands.moveUp();
  commands.moveDown();
  expect(calls).toEqual([]);

  map.renderer.activeNodeList = [{ isRoot: false, isGeneralization: true }];
  commands.addChild();
  commands.addSibling();
  commands.addParent();
  expect(calls).toEqual([]);
});

describe('outline command bridge', () => {
  it('uses upstream native commands with explicit node targets', () => {
    const node = {
      isRoot: false,
      isGeneralization: false,
      getData: vi.fn((key?: string) => key === 'uid' ? 'node-1' : {}),
    };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = vi.fn((uid: string) => uid === 'node-1' ? node : null);
    map.renderer.activeNodeList = [node];
    const commands = createCommandAdapter(map as never);

    commands.setNodeTextByUid('node-1', 'Changed');
    commands.insertSiblingByUid('node-1', 'new-sibling');
    commands.insertChildByUid('node-1', 'new-child');
    commands.removeNodeByUid('node-1');

    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_TEXT', node, 'Changed', false, true]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_NODE', false, [node], { uid: 'new-sibling', text: '', richText: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_CHILD_NODE', false, [node], { uid: 'new-child', text: '', richText: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['REMOVE_NODE', [node]]);
  });

  it('refuses outline mutations in readonly mode and refuses root deletion', () => {
    const root = { isRoot: true, isGeneralization: false, getData: (key?: string) => key === 'uid' ? 'root' : {} };
    const map = fakeMindMap() as any;
    map.getConfig = () => true;
    map.renderer.findNodeByUid = () => root;
    const commands = createCommandAdapter(map as never);

    expect(commands.setNodeTextByUid('root', 'Changed')).toBe(false);
    expect(commands.insertChildByUid('root', 'child')).toBe(false);
    expect(commands.removeNodeByUid('root')).toBe(false);
    expect(map.execCommand).not.toHaveBeenCalled();
  });
});
