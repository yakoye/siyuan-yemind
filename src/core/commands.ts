import type MindMap from 'simple-mind-map';

export interface YeMindCommands {
  addChild(): void;
  addSibling(): void;
  addParent(): void;
  moveUp(): void;
  moveDown(): void;
  toggleExpand(): void;
  remove(): void;
  removeOnlyCurrent(): void;
  undo(): void;
  redo(): void;
  fit(): void;
  resetZoom(): void;
  zoomIn(): void;
  zoomOut(): void;
  edit(): void;
}

export function createCommandAdapter(mindMap: MindMap): YeMindCommands {
  return {
    addChild: () => mindMap.execCommand('INSERT_CHILD_NODE'),
    addSibling: () => mindMap.execCommand('INSERT_NODE'),
    addParent: () => mindMap.execCommand('INSERT_PARENT_NODE'),
    moveUp: () => mindMap.execCommand('UP_NODE'),
    moveDown: () => mindMap.execCommand('DOWN_NODE'),
    toggleExpand: () => mindMap.renderer.toggleActiveExpand(),
    remove: () => mindMap.execCommand('REMOVE_NODE'),
    removeOnlyCurrent: () => mindMap.execCommand('REMOVE_CURRENT_NODE'),
    undo: () => mindMap.execCommand('BACK'),
    redo: () => mindMap.execCommand('FORWARD'),
    fit: () => (mindMap.view as any).fit(),
    resetZoom: () => mindMap.view.reset(),
    zoomIn: () => mindMap.view.enlarge(undefined, undefined, false),
    zoomOut: () => mindMap.view.narrow(undefined, undefined, false),
    edit: () => mindMap.renderer.startTextEdit(),
  };
}
