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



  it('filters Root nodes from mixed destructive selections and never calls upstream with Root', () => {
    const root = { isRoot: true, isGeneralization: false };
    const child = { isRoot: false, isGeneralization: false };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.activeNodeList = [root, child];
    const commands = createCommandAdapter(map as never);

    commands.remove();
    commands.removeOnlyCurrent();

    expect(map.execCommand.mock.calls).toEqual([
      ['REMOVE_NODE', [child]],
      ['REMOVE_CURRENT_NODE', [child]],
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
      children: [{}],
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
    commands.setNodeExpandedByUid('node-1', false);

    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_TEXT', node, 'Changed', false, true]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_NODE', false, [node], { uid: 'new-sibling', text: '', richText: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_CHILD_NODE', false, [node], { uid: 'new-child', text: '', richText: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['REMOVE_NODE', [node]]);
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_EXPAND', node, false]);
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

describe('official-style outline structure commands', () => {
  it('indents under the previous sibling, outdents one level, and toggles expansion natively', () => {
    const parent = { children: [] as any[] };
    const previous = { isRoot: false, isGeneralization: false, parent };
    const node = { isRoot: false, isGeneralization: false, layerIndex: 2, parent, children: [{}] };
    parent.children = [previous, node];
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = vi.fn((uid: string) => uid === 'node' ? node : uid === 'previous' ? previous : null);
    const commands = createCommandAdapter(map as never);

    expect(commands.indentNodeByUid('node')).toBe(true);
    expect(commands.outdentNodeByUid('node')).toBe(true);
    expect(commands.setNodeExpandedByUid('node', false)).toBe(true);

    expect(map.execCommand.mock.calls).toContainEqual(['MOVE_NODE_TO', [node], previous]);
    expect(map.execCommand.mock.calls).toContainEqual(['MOVE_UP_ONE_LEVEL', node]);
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_EXPAND', node, false]);
  });

  it('refuses indent for the first sibling and outdent at the first child level', () => {
    const parent = { children: [] as any[] };
    const node = { isRoot: false, isGeneralization: false, layerIndex: 1, parent };
    parent.children = [node];
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = () => node;
    const commands = createCommandAdapter(map as never);

    expect(commands.indentNodeByUid('node')).toBe(false);
    expect(commands.outdentNodeByUid('node')).toBe(false);
    expect(map.execCommand).not.toHaveBeenCalled();
  });
});

describe('node style command bridge', () => {
  it('maps the style panel patch to native node style fields and resets via upstream command', () => {
    const data = { fillColor: '#ffffff', customTextWidth: 121, fontSize: 18 };
    const node = { isRoot: false, isGeneralization: false, getData: vi.fn((key?: string) => key ? (data as any)[key] : data) };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.activeNodeList = [node];
    const commands = createCommandAdapter(map as never);

    expect(commands.getActiveNodeStyle()).toMatchObject({ fillColor: '#ffffff', width: 121, fontSize: 18 });
    commands.setActiveNodeStyle({ shape: 'pill', width: 200, borderWidth: 2 });
    commands.resetActiveNodeStyle();

    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_STYLES', node, {
      shape: 'roundedRectangle',
      borderRadius: 999,
      customTextWidth: 200,
      borderWidth: 2,
    }]);
    expect(map.execCommand.mock.calls).toContainEqual(['REMOVE_CUSTOM_STYLES', node]);
  });

  it('adds a child to the explicit quick-action target', () => {
    const node = { isRoot: false, isGeneralization: false };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = vi.fn(() => node);
    const commands = createCommandAdapter(map as never);

    expect(commands.addChildByUid('node-1')).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('INSERT_CHILD_NODE', true, [node]);
  });

  it('allows Root to use the native expand command when it has children', () => {
    const root = {
      isRoot: true,
      isGeneralization: false,
      children: [{}],
      getData: (key?: string) => key === 'uid' ? 'root' : undefined,
    };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = (uid: string) => uid === 'root' ? root : null;
    const commands = createCommandAdapter(map as never);

    expect(commands.setNodeExpandedByUid('root', false)).toBe(true);
    expect(commands.setNodeExpandedByUid('root', true)).toBe(true);
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_EXPAND', root, false]);
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_EXPAND', root, true]);
  });

});
