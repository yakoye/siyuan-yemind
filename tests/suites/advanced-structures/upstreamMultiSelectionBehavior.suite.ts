import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const selectSource = readFileSync(resolve(process.cwd(), 'node_modules/simple-mind-map/src/plugins/Select.js'), 'utf8');
const nodeSource = readFileSync(resolve(process.cwd(), 'node_modules/simple-mind-map/src/core/render/node/MindMapNode.js'), 'utf8');
const dragSource = readFileSync(resolve(process.cwd(), 'node_modules/simple-mind-map/src/plugins/Drag.js'), 'utf8');

describe('simple-mind-map native multi-selection contract', () => {
  it('owns box selection and Ctrl/Cmd node toggling', () => {
    expect(selectSource).toContain('e.ctrlKey || e.metaKey');
    expect(selectSource).toContain('useLeftKeySelectionRightKeyDrag');
    expect(nodeSource).toContain('enableCtrlKeyNodeSelection');
    expect(nodeSource).toContain("isActive ? 'removeNodeFromActiveList' : 'addNodeToActiveList'");
  });

  it('moves the top-level selected subtrees through native structural commands', () => {
    expect(dragSource).toContain('this.mindMap.renderer.activeNodeList');
    expect(dragSource).toContain('getTopAncestorsFomNodeList');
    expect(dragSource).toContain("'MOVE_NODE_TO'");
    expect(dragSource).toContain("'INSERT_AFTER'");
    expect(dragSource).toContain("'INSERT_BEFORE'");
  });
});
