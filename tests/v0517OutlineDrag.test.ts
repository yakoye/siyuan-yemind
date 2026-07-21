import { describe, expect, it, vi } from 'vitest';
import { resolveOutlineDropIntent } from '../src/editor/outlineDrag';
import { createCommandAdapter } from '../src/core/commands';
import { renderOutlineHtml } from '../src/editor/outline';
import fs from 'node:fs';
import path from 'node:path';

const tree = {
  data: { text: 'Root', uid: 'root' },
  children: [{ data: { text: 'A', uid: 'a' }, children: [] }],
};

describe('official-style outline row drag', () => {
  it('renders a dedicated draggable handle for every row', () => {
    const html = renderOutlineHtml(tree, false);
    expect((html.match(/data-outline-drag-handle/g) ?? []).length).toBe(2);
    expect(html).toContain('draggable="true"');
  });

  it('resolves before, inside and after drop zones', () => {
    const rect = { top: 100, height: 40 };
    expect(resolveOutlineDropIntent({ sourceUid: 'a', targetUid: 'b', clientY: 103, rect })).toEqual({ targetUid: 'b', position: 'before' });
    expect(resolveOutlineDropIntent({ sourceUid: 'a', targetUid: 'b', clientY: 120, rect })).toEqual({ targetUid: 'b', position: 'inside' });
    expect(resolveOutlineDropIntent({ sourceUid: 'a', targetUid: 'b', clientY: 138, rect })).toEqual({ targetUid: 'b', position: 'after' });
    expect(resolveOutlineDropIntent({ sourceUid: 'a', targetUid: 'a', clientY: 120, rect })).toBeNull();
  });

  it('arms pending focus before a synchronous structure command emits data_change', () => {
    const source = fs.readFileSync(path.resolve('src/editor/YeMindEditor.ts'), 'utf8');
    const dropBlock = source.slice(source.indexOf("this.outlineEl.addEventListener('drop'"), source.indexOf("this.outlineEl.addEventListener('dragend'"));
    expect(dropBlock.indexOf('this.pendingOutlineFocus = { uid: sourceUid')).toBeGreaterThan(-1);
    expect(dropBlock.indexOf('this.pendingOutlineFocus = { uid: sourceUid')).toBeLessThan(dropBlock.indexOf('this.commands.moveNodeByUid'));
  });

  it('maps drop intent to upstream structure commands and rejects descendants', () => {
    const root: any = { isRoot: true, isGeneralization: false, parent: null, children: [] };
    const a: any = { isRoot: false, isGeneralization: false, parent: root, children: [] };
    const b: any = { isRoot: false, isGeneralization: false, parent: root, children: [] };
    const child: any = { isRoot: false, isGeneralization: false, parent: a, children: [] };
    root.children = [a, b]; a.children = [child];
    const nodes: Record<string, any> = { root, a, b, child };
    const map: any = {
      opt: { readonly: false },
      renderer: { activeNodeList: [a], findNodeByUid: (uid: string) => nodes[uid] ?? null },
      execCommand: vi.fn(),
      view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    };
    const commands = createCommandAdapter(map);

    expect(commands.moveNodeByUid('a', 'b', 'before')).toBe(true);
    expect(commands.moveNodeByUid('a', 'b', 'inside')).toBe(true);
    expect(commands.moveNodeByUid('a', 'b', 'after')).toBe(true);
    expect(commands.moveNodeByUid('a', 'child', 'inside')).toBe(false);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_BEFORE', [a], b]);
    expect(map.execCommand.mock.calls).toContainEqual(['MOVE_NODE_TO', [a], b]);
    expect(map.execCommand.mock.calls).toContainEqual(['INSERT_AFTER', [a], b]);
  });
});
