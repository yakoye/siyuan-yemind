import { describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { restoreContextMenuSelection } from '../../../src/editor/selectionPresentation';

const editorSource = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('v0.9.13 multi-selection context menu', () => {
  it('restores all selected nodes and promotes the right-clicked node to primary', () => {
    const a = { active: vi.fn() };
    const b = { active: vi.fn() };
    const c = { active: vi.fn() };
    const renderer = {
      activeNodeList: [] as unknown[],
      clearActiveNodeList: vi.fn(() => { renderer.activeNodeList = []; }),
      addNodeToActiveList: vi.fn((node: unknown) => renderer.activeNodeList.push(node)),
      emitNodeActiveEvent: vi.fn(),
    };

    expect(restoreContextMenuSelection(renderer, [a, b, c], b)).toBe(true);
    expect(renderer.activeNodeList).toEqual([b, a, c]);
    expect(renderer.emitNodeActiveEvent).toHaveBeenCalledOnce();
  });

  it('captures the selection before the upstream node contextmenu handler clears it', () => {
    expect(editorSource).toContain('this.canvasEl.addEventListener("contextmenu", this.onCanvasContextMenuCapture, true)');
    expect(editorSource).toContain('this.contextMenuSelectionSnapshot');
    expect(editorSource).toContain('restoreContextMenuSelection(renderer, snapshot.nodes, node)');
  });
});
