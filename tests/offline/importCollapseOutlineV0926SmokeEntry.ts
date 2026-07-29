import { applyOutlineImport, parseOutlineTreeText, repairImportedAutoWidthTree } from '../../src/editor/outlineTreeImport';
import { collapseAllBranches, collapseBranchDeep, expandBranchOneLevel, expandRootOneLevel } from '../../src/core/expandState';
import { outlineAccessoriesFromData, outlineAccessoriesHtml } from '../../src/editor/outlineAccessories';
import type { MindMapTree } from '../../src/model/types';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const base: MindMapTree = {
  data: { uid: 'root', text: 'root', expand: true },
  children: [{ data: { uid: 'target', text: 'target', expand: true }, children: [] }],
};
const longText = '这是一个超过二十个汉字而且需要稳定换行但不能改变原始内容的节点标题';
const imported = applyOutlineImport(base, 'target', parseOutlineTreeText(longText, 'plain'));
const importedData = imported.children[0].children[0].data;
assert(importedData.customTextWidth === 280, 'long imported node must use customTextWidth');
assert(importedData.width === undefined, 'long imported node must not persist conflicting width');

const legacy: MindMapTree = {
  data: { uid: 'root', text: 'root' },
  children: [{ data: { uid: 'legacy', text: 'legacy', width: 280, customTextWidth: 280, yemindImportedAutoWidth: true }, children: [] }],
};
const repaired = repairImportedAutoWidthTree(legacy);
assert(repaired.repaired === 1 && repaired.tree.children[0].data.width === undefined, 'legacy auto width must be repaired');

const tree: MindMapTree = {
  data: { uid: 'root', text: 'root', expand: true },
  children: [{ data: { uid: 'a', text: 'a', expand: true }, children: [{ data: { uid: 'b', text: 'b', expand: true }, children: [{ data: { uid: 'c', text: 'c' }, children: [] }] }] }],
};
const collapsedBranch = collapseBranchDeep(tree, 'a').tree;
assert(collapsedBranch.children[0].data.expand === false, 'selected branch must collapse');
assert(collapsedBranch.children[0].children[0].data.expand === false, 'descendant branch must collapse');
const expandedBranch = expandBranchOneLevel(collapsedBranch, 'a').tree;
assert(expandedBranch.children[0].data.expand === true, 'selected branch must expand');
assert(expandedBranch.children[0].children[0].data.expand === false, 'descendant must remain collapsed');
const collapsedAll = collapseAllBranches(tree).tree;
assert(collapsedAll.data.expand === false, 'global collapse must collapse root');
const expandedRoot = expandRootOneLevel(collapsedAll).tree;
assert(expandedRoot.data.expand === true && expandedRoot.children[0].data.expand === false, 'global expand must show first level only');

const accessories = outlineAccessoriesFromData({
  text: 'node', image: 'data:image/png;base64,AAAA', imageTitle: 'image',
  yemindTodo: { checked: false, text: 'todo' }, tag: ['PCIe'], hyperlink: 'https://example.com',
  yemindNote: { html: '<p>note</p>' }, yemindComments: [{ id: '1', text: 'comment' }], outerFrame: { groupId: 'g1' },
} as any);
const html = outlineAccessoriesHtml(accessories);
for (const token of ['data-outline-image-action', 'data-outline-todo-action', 'data-outline-content="tags"', 'data-outline-content="link"', 'data-outline-content="note"', 'data-outline-content="comments"', 'data-outline-content="outer-frame"']) {
  assert(html.includes(token), `outline accessory html missing ${token}`);
}

export default {
  repaired: repaired.repaired,
  importedWidth: importedData.customTextWidth,
  branchExpanded: expandedBranch.children[0].data.expand,
  rootExpanded: expandedRoot.data.expand,
  accessoryLength: html.length,
};
