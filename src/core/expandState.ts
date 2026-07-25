import type { MindMapTree } from '../model/types';

export interface ExpandTreeResult {
  tree: MindMapTree;
  changed: boolean;
}

function cloneTree<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try { return structuredClone(value); } catch { /* JSON fallback */ }
  }
  return JSON.parse(JSON.stringify(value)) as T;
}

function branch(node: MindMapTree): boolean {
  return Array.isArray(node.children) && node.children.length > 0;
}

function findNode(tree: MindMapTree, uid: string): MindMapTree | null {
  if (String(tree.data?.uid ?? '') === uid) return tree;
  for (const child of tree.children ?? []) {
    const found = findNode(child, uid);
    if (found) return found;
  }
  return null;
}

function setBranchState(node: MindMapTree, expanded: boolean, includeSelf = true): number {
  let changed = 0;
  if (includeSelf && branch(node) && node.data.expand !== expanded) {
    node.data.expand = expanded;
    changed += 1;
  }
  for (const child of node.children ?? []) {
    changed += setBranchState(child, expanded, true);
  }
  return changed;
}

export function collapseBranchDeep(tree: MindMapTree, uid: string): ExpandTreeResult {
  const next = cloneTree(tree);
  const target = findNode(next, uid);
  if (!target || !branch(target)) return { tree: next, changed: false };
  return { tree: next, changed: setBranchState(target, false, true) > 0 };
}

export function expandBranchOneLevel(tree: MindMapTree, uid: string): ExpandTreeResult {
  const next = cloneTree(tree);
  const target = findNode(next, uid);
  if (!target || !branch(target)) return { tree: next, changed: false };
  let changed = 0;
  if (target.data.expand !== true) {
    target.data.expand = true;
    changed += 1;
  }
  for (const child of target.children ?? []) {
    changed += setBranchState(child, false, true);
  }
  return { tree: next, changed: changed > 0 };
}

export function toggleBranchExpansion(tree: MindMapTree, uid: string): ExpandTreeResult {
  const target = findNode(tree, uid);
  if (!target || !branch(target)) return { tree: cloneTree(tree), changed: false };
  return target.data.expand === false
    ? expandBranchOneLevel(tree, uid)
    : collapseBranchDeep(tree, uid);
}

export function collapseAllBranches(tree: MindMapTree): ExpandTreeResult {
  const next = cloneTree(tree);
  return { tree: next, changed: setBranchState(next, false, true) > 0 };
}

export function expandRootOneLevel(tree: MindMapTree): ExpandTreeResult {
  const next = cloneTree(tree);
  if (!branch(next)) return { tree: next, changed: false };
  let changed = 0;
  if (next.data.expand !== true) {
    next.data.expand = true;
    changed += 1;
  }
  for (const child of next.children ?? []) {
    changed += setBranchState(child, false, true);
  }
  return { tree: next, changed: changed > 0 };
}

export function toggleAllExpansion(tree: MindMapTree): ExpandTreeResult {
  return tree.data.expand === false
    ? expandRootOneLevel(tree)
    : collapseAllBranches(tree);
}
