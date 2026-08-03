import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';

function fakeMindMap() {
  return {
    execCommand: vi.fn(),
    view: {
      fit: vi.fn(),
      reset: vi.fn(),
      scale: 0.61,
      setScale: vi.fn(),
      enlarge: vi.fn(),
      narrow: vi.fn(),
    },
    width: 800,
    height: 600,
    renderer: {
      startTextEdit: vi.fn(),
      activeNodeList: [{}],
      toggleActiveExpand: vi.fn(),
    },
  };
}

describe('createCommandAdapter', () => {
  it('inserts symbols at the rich-text caret and otherwise appends to the active node', () => {
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    const plain = { getData: () => ({ text: '节点', richText: false }), nodeData: { data: {} } };
    map.renderer.activeNodeList = [plain];
    const commands = createCommandAdapter(map as never);

    expect(commands.insertSymbol('Ω')).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_TEXT', plain, '节点Ω', false, true);

    const quill = {
      insertText: vi.fn(),
      deleteText: vi.fn(),
      setSelection: vi.fn(),
    };
    map.richText = { quill, range: { index: 2, length: 0 } };
    expect(commands.insertSymbol('→')).toBe(true);
    expect(quill.insertText).toHaveBeenCalledWith(2, '→', 'user');
    expect(quill.setSelection).toHaveBeenCalledWith(3, 0, 'silent');
  });

  it('keeps inserting into the node that opened the persistent symbol dialog after focus clears selection', () => {
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    const source = { getData: () => ({ uid: 'source', text: '节点', richText: false }), nodeData: { data: {} } };
    map.renderer.activeNodeList = [];
    map.renderer.findNodeByUid = vi.fn((uid: string) => uid === 'source' ? source : null);
    map.richText = {
      quill: { insertText: vi.fn(), setSelection: vi.fn() },
      lastRange: { index: 1, length: 0 },
    };
    const commands = createCommandAdapter(map as never);

    expect(commands.insertSymbol('Ω', 'source')).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_TEXT', source, '节点Ω', false, true);
    expect(map.richText.quill.insertText).not.toHaveBeenCalled();
  });

  it('maps node actions to simple-mind-map native commands', () => {
    const map = fakeMindMap();
    (map as any).command = {
      yemindFlushHistory: vi.fn(),
      yemindCancelHistory: vi.fn(),
      yemindBeginHistoryReplay: vi.fn(),
      yemindEndHistoryReplay: vi.fn(),
    };
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
    expect((map as any).command.yemindFlushHistory).toHaveBeenCalledTimes(2);
    expect((map as any).command.yemindCancelHistory).toHaveBeenCalledTimes(2);
    expect((map as any).command.yemindBeginHistoryReplay).toHaveBeenCalledTimes(2);
    expect((map as any).command.yemindEndHistoryReplay).toHaveBeenCalledTimes(2);
    expect(map.execCommand.mock.calls).toEqual([
      ['INSERT_CHILD_NODE', true, [], expect.objectContaining({ richText: false, yemindTextPristine: true, yemindTextEdited: false })],
      ['INSERT_NODE', true, [], expect.objectContaining({ richText: false, yemindTextPristine: true, yemindTextEdited: false })],
      ['INSERT_PARENT_NODE', true, [], expect.objectContaining({ richText: false, yemindTextPristine: true, yemindTextEdited: false })],
      ['UP_NODE'],
      ['DOWN_NODE'],
      ['REMOVE_NODE', [map.renderer.activeNodeList[0]]],
      ['REMOVE_CURRENT_NODE', [map.renderer.activeNodeList[0]]],
      ['BACK'],
      ['FORWARD'],
      ['RESET_LAYOUT'],
    ]);
  });

  it('delegates insertion and first-edit focus to the upstream inserting transaction only', () => {
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.on = vi.fn();
    map.off = vi.fn();

    createCommandAdapter(map as never).addChild();

    expect(map.execCommand).toHaveBeenCalledWith(
      'INSERT_CHILD_NODE',
      true,
      [],
      expect.objectContaining({
        yemindTextPristine: true,
        yemindTextEdited: false,
      }),
    );
    expect(map.on).not.toHaveBeenCalledWith('node_tree_render_end', expect.any(Function));
    expect(map.on).not.toHaveBeenCalledWith('yemind_text_edit_ready', expect.any(Function));
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
    expect(map.view.setScale.mock.calls).toEqual([
      [0.8, 400, 300],
      [0.4, 400, 300],
    ]);
    expect(map.view.enlarge).not.toHaveBeenCalled();
    expect(map.view.narrow).not.toHaveBeenCalled();
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
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_NODE', false, [node], { uid: 'new-sibling', text: '', richText: false, yemindTextPristine: true, yemindTextEdited: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_CHILD_NODE', false, [node], { uid: 'new-child', text: '', richText: false, yemindTextPristine: true, yemindTextEdited: false }]);
    expect(map.execCommand.mock.calls).toContainEqual(['REMOVE_NODE', [node]]);
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_EXPAND', node, false]);
  });

  it('replaces the continuous outline through the upstream undoable whole-tree transaction', () => {
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.updateData = vi.fn();
    map.setData = vi.fn();
    const commands = createCommandAdapter(map as never);
    const nextTree = {
      data: { uid: 'root', text: 'Root' },
      children: [{ data: { uid: 'child', text: 'Child' }, children: [] }],
    };

    expect(commands.replaceTree(nextTree)).toBe(true);
    expect(map.updateData).toHaveBeenCalledOnce();
    expect(map.updateData).toHaveBeenCalledWith(nextTree);
    expect(map.setData).not.toHaveBeenCalled();
  });

  it('applies one outline text patch natively and multiple patches as one atomic tree transaction', () => {
    const first = { nodeData: { data: {} } };
    const second = { nodeData: { data: {} } };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.updateData = vi.fn();
    map.renderer.findNodeByUid = vi.fn((uid: string) => uid === 'first' ? first : uid === 'second' ? second : null);
    const commands = createCommandAdapter(map as never);
    const nextTree = {
      data: { uid: 'root', text: '<p>Root</p>', richText: true },
      children: [
        { data: { uid: 'first', text: '<p>A</p>', richText: true }, children: [] },
        { data: { uid: 'second', text: '<p>B</p>', richText: true }, children: [] },
      ],
    };

    expect(commands.applyNodeTextPatches(nextTree, [
      { uid: 'first', text: 'A < B', richText: false },
    ])).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_TEXT', first, '<p>A &lt; B</p>', true, false);
    expect(map.updateData).not.toHaveBeenCalled();

    map.execCommand.mockClear();
    expect(commands.applyNodeTextPatches(nextTree, [
      { uid: 'first', text: '<p>A</p>', richText: true },
      { uid: 'second', text: '<p>B</p>', richText: true },
    ])).toBe(true);
    expect(map.execCommand).not.toHaveBeenCalled();
    expect(map.updateData).toHaveBeenCalledTimes(1);
    expect(map.updateData).toHaveBeenCalledWith(expect.objectContaining({
      children: [
        expect.objectContaining({ data: expect.objectContaining({ uid: 'first', yemindTextEdited: true, yemindTextPristine: false }) }),
        expect.objectContaining({ data: expect.objectContaining({ uid: 'second', yemindTextEdited: true, yemindTextPristine: false }) }),
      ],
    }));
  });

  it('rejects an invalid outline text batch without applying any partial mutation', () => {
    const first = { nodeData: { data: {} } };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.updateData = vi.fn();
    map.renderer.findNodeByUid = vi.fn((uid: string) => uid === 'first' ? first : null);
    const commands = createCommandAdapter(map as never);
    const nextTree = {
      data: { uid: 'root', text: '<p>Root</p>', richText: true },
      children: [{ data: { uid: 'first', text: '<p>A</p>', richText: true }, children: [] }],
    };

    expect(commands.applyNodeTextPatches(nextTree, [
      { uid: 'first', text: '<p>A</p>', richText: true },
      { uid: 'missing', text: '<p>B</p>', richText: true },
    ])).toBe(false);
    expect(map.execCommand).not.toHaveBeenCalled();
    expect(map.updateData).not.toHaveBeenCalled();
  });

  it('refuses whole-tree replacement when readonly or when the upstream transaction is unavailable', () => {
    const nextTree = { data: { uid: 'root', text: 'Root' }, children: [] };
    const readonlyMap = fakeMindMap() as any;
    readonlyMap.getConfig = () => true;
    readonlyMap.updateData = vi.fn();
    expect(createCommandAdapter(readonlyMap as never).replaceTree(nextTree)).toBe(false);
    expect(readonlyMap.updateData).not.toHaveBeenCalled();

    const incompleteMap = fakeMindMap() as any;
    incompleteMap.opt = { readonly: false };
    expect(createCommandAdapter(incompleteMap as never).replaceTree(nextTree)).toBe(false);
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
    expect(map.execCommand.mock.calls).toContainEqual(['SET_NODE_DATA', node, {
      width: 200,
      yemindImportedAutoWidth: false,
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
    expect(map.execCommand).toHaveBeenCalledWith(
      'INSERT_CHILD_NODE',
      true,
      [node],
      expect.objectContaining({ yemindTextPristine: true, yemindTextEdited: false }),
    );
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

  it('uses the live native expand command even when whole-tree updateData is available', () => {
    const root = {
      isRoot: true,
      isGeneralization: false,
      children: [{}],
      nodeData: { children: [{ data: { uid: 'child' }, children: [] }] },
      getData: (key?: string) => key === 'uid' ? 'root' : key === 'expand' ? true : undefined,
    };
    const map = fakeMindMap() as any;
    map.opt = { readonly: false };
    map.renderer.findNodeByUid = (uid: string) => uid === 'root' ? root : null;
    map.getData = vi.fn(() => ({
      data: { uid: 'root', expand: true },
      children: [{ data: { uid: 'child' }, children: [] }],
    }));
    map.updateData = vi.fn();
    const commands = createCommandAdapter(map as never);

    expect(commands.setNodeExpandedByUid('root', false)).toBe(true);
    expect(map.execCommand).toHaveBeenCalledWith('SET_NODE_EXPAND', root, false);
    expect(map.updateData).not.toHaveBeenCalled();
  });

});
