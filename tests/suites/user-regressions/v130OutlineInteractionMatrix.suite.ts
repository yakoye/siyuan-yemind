import { describe, expect, it, vi } from 'vitest';
import { createCommandAdapter } from '../../../src/core/commands';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../../src/editor/outlineAccessories';
import { resolveOutlinePointerDropIntent } from '../../../src/editor/outlineDrag';
import {
  parseOutlineText,
  serializeOutlineText,
} from '../../../src/editor/outlineTextDocument';
import {
  buildTreeFromStructuredOutline,
  flattenStructuredOutline,
} from '../../../src/editor/structuredOutlineDocument';
import { resolveOutlineKeyAction } from '../../../src/editor/outline';

const tree = {
  data: { uid: 'root', text: '根节点', expand: true },
  children: [{
    data: {
      uid: 'branch',
      text: '中间节点',
      expand: false,
      icon: ['priority_1'],
      image: 'data:image/png;base64,AA==',
      yemindClipartId: 'animal-1',
      yemindNote: { html: '<p>备注</p>', createdAt: 1, updatedAt: 1 },
      yemindComments: [{ id: 'c1', text: '批注', createdAt: 1, updatedAt: 1 }],
    },
    children: [{ data: { uid: 'leaf', text: '叶子节点' }, children: [] }],
  }],
};

describe('v1.3.0 outline interaction matrix', () => {
  it('round-trips Unicode hierarchy and collapse state through the shared tree', () => {
    const blocks = flattenStructuredOutline(tree);
    const result = buildTreeFromStructuredOutline(tree, blocks);
    expect(result.tree).toMatchObject({
      data: { uid: 'root', text: '根节点', expand: true },
      children: [{
        data: {
          uid: 'branch',
          text: '中间节点',
          expand: false,
          icon: ['priority_1'],
          image: 'data:image/png;base64,AA==',
          yemindClipartId: 'animal-1',
        },
        children: [{ data: { uid: 'leaf', text: '叶子节点' } }],
      }],
    });
    expect(serializeOutlineText(result.tree)).toBe('根节点\n    中间节点\n        叶子节点');
    expect(parseOutlineText('根节点\n    中间节点\n        PCIe 错误／错误注入').lines)
      .toMatchObject([
        { depth: 0, text: '根节点' },
        { depth: 1, text: '中间节点' },
        { depth: 2, text: 'PCIe 错误／错误注入' },
      ]);
  });

  it('keeps Enter, Tab, Shift+Tab and boundary deletion deterministic', () => {
    expect(resolveOutlineKeyAction({ key: 'Enter', empty: false, isRoot: true, readonly: false })).toBe('insert-child');
    expect(resolveOutlineKeyAction({ key: 'Enter', empty: false, isRoot: false, readonly: false })).toBe('insert-sibling');
    expect(resolveOutlineKeyAction({ key: 'Tab', empty: false, isRoot: false, readonly: false })).toBe('indent');
    expect(resolveOutlineKeyAction({ key: 'Tab', shiftKey: true, empty: false, isRoot: false, readonly: false })).toBe('outdent');
    expect(resolveOutlineKeyAction({ key: 'Backspace', empty: true, isRoot: false, readonly: false })).toBe('delete-empty');
    expect(resolveOutlineKeyAction({ key: 'Backspace', empty: true, isRoot: true, readonly: false })).toBe('none');
  });

  it('rejects cyclic moves and preserves explicit same-level pointer intent', () => {
    const base = {
      sourceUid: 'branch',
      targetUid: 'leaf',
      clientX: 120,
      clientY: 120,
      rect: { top: 100, height: 40 },
      targetTextLeft: 120,
      targetDepth: 2,
      indentWidth: 22,
    };
    expect(resolveOutlinePointerDropIntent({
      ...base,
      sourceUid: 'leaf',
      targetUid: 'branch',
      targetDepth: 1,
      targetAncestors: [{ uid: 'root', depth: 0 }, { uid: 'branch', depth: 1 }],
    })).toMatchObject({ targetUid: 'branch', position: 'after', desiredDepth: 1 });

    const root = { isRoot: true, isGeneralization: false, parent: null, children: [] as unknown[] };
    const branch = { isRoot: false, isGeneralization: false, parent: root, children: [] as unknown[] };
    const leaf = { isRoot: false, isGeneralization: false, parent: branch, children: [] as unknown[] };
    root.children = [branch];
    branch.children = [leaf];
    const map = {
      opt: { readonly: false },
      renderer: {
        activeNodeList: [branch],
        findNodeByUid: (uid: string) => ({ root, branch, leaf } as const)[uid as 'root' | 'branch' | 'leaf'] ?? null,
      },
      execCommand: vi.fn(),
      view: { fit: vi.fn(), reset: vi.fn(), enlarge: vi.fn(), narrow: vi.fn() },
    };
    expect(createCommandAdapter(map as never).moveNodeByUid('branch', 'leaf', 'inside')).toBe(false);
    expect(map.execCommand).not.toHaveBeenCalled();
  });

  it('projects marker, clipart, image, note and comments with eight-point media selection', () => {
    const branch = tree.children[0].data;
    const accessories = outlineAccessoriesFromData(branch);
    const html = outlineAccessoriesHtml(accessories);
    expect(accessories).toMatchObject({ hasNote: true, commentCount: 1 });
    expect(html).toContain('data-outline-icon-action');
    expect(html).toContain('data-outline-image-action');
    expect(html.match(/data-outline-media-handle=/g)).toHaveLength(8);
    expect(html).toContain('data-outline-media-delete');
  });
});
