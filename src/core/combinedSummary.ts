export interface CombinedSummaryPlan {
  owner: any;
  range: [number, number] | null;
  commandNodes: any[];
}

function uniqueNodes(nodes: any[]): any[] {
  return nodes.filter((node, index) => node && nodes.indexOf(node) === index);
}

function ancestors(node: any): any[] {
  const list: any[] = [];
  let current = node;
  while (current) {
    list.push(current);
    current = current.parent ?? null;
  }
  return list;
}

function isAncestor(ancestor: any, node: any): boolean {
  let current = node?.parent ?? null;
  while (current) {
    if (current === ancestor) return true;
    current = current.parent ?? null;
  }
  return false;
}

function lowestCommonAncestor(nodes: any[]): any | null {
  if (!nodes.length) return null;
  const [first, ...rest] = nodes;
  return ancestors(first).find((candidate) => rest.every((node) => ancestors(node).includes(candidate))) ?? null;
}

function directChildOf(ancestor: any, node: any): any | null {
  if (node === ancestor) return ancestor;
  let current = node;
  while (current?.parent && current.parent !== ancestor) current = current.parent;
  return current?.parent === ancestor ? current : null;
}

function childIndex(parent: any, node: any): number {
  const children = Array.isArray(parent?.children) ? parent.children : [];
  const index = children.indexOf(node);
  if (index >= 0) return index;
  const value = Number(node?.getIndexInBrothers?.());
  return Number.isFinite(value) ? value : -1;
}

/**
 * Convert an arbitrary multi-selection into one native simple-mind-map
 * generalization target. Descendants of another selected node are folded into
 * that ancestor; otherwise the selection is projected to one contiguous child
 * range under its lowest common ancestor.
 */
export function createCombinedSummaryPlan(input: any[]): CombinedSummaryPlan | null {
  const eligible = uniqueNodes(input).filter((node) => !node?.isRoot && !node?.isGeneralization);
  if (!eligible.length) return null;

  const topLevel = eligible.filter((node) => !eligible.some((candidate) => candidate !== node && isAncestor(candidate, node)));
  if (topLevel.length === 1) {
    return { owner: topLevel[0], range: null, commandNodes: [topLevel[0]] };
  }

  const owner = lowestCommonAncestor(topLevel);
  if (!owner) return null;
  const projected = uniqueNodes(topLevel.map((node) => directChildOf(owner, node)).filter(Boolean));
  if (projected.length <= 1) {
    const node = projected[0] ?? topLevel[0];
    return node ? { owner: node, range: null, commandNodes: [node] } : null;
  }

  const indexed = projected
    .map((node) => ({ node, index: childIndex(owner, node) }))
    .filter((item) => item.index >= 0)
    .sort((a, b) => a.index - b.index);
  if (indexed.length <= 1) {
    const node = indexed[0]?.node ?? topLevel[0];
    return node ? { owner: node, range: null, commandNodes: [node] } : null;
  }
  return {
    owner,
    range: [indexed[0].index, indexed[indexed.length - 1].index],
    commandNodes: [indexed[0].node, indexed[indexed.length - 1].node],
  };
}

export function hasCombinedSummary(plan: CombinedSummaryPlan): boolean {
  const raw = plan.owner?.getData?.('generalization');
  const list = raw ? (Array.isArray(raw) ? raw : [raw]) : [];
  if (!plan.range) return list.some((item: any) => !Array.isArray(item?.range) || item.range.length === 0);
  return list.some((item: any) => Array.isArray(item?.range)
    && item.range[0] === plan.range?.[0]
    && item.range[1] === plan.range?.[1]);
}

/** Execute one combined summary through the upstream command so history,
 * rendering and rich-text editing remain native. */
export function addCombinedSummary(mindMap: any, selectedNodes: any[]): boolean {
  const plan = createCombinedSummaryPlan(selectedNodes);
  if (!plan || hasCombinedSummary(plan)) return false;
  const renderer = mindMap?.renderer;
  if (!renderer || typeof mindMap?.execCommand !== 'function') return false;

  const originalList = Array.isArray(renderer.activeNodeList) ? [...renderer.activeNodeList] : [];
  const temporaryList = [...plan.commandNodes];
  renderer.clearActiveNodeList?.();
  const restoreChecks = temporaryList.map((node) => {
    const original = node.checkHasSelfGeneralization;
    if (typeof original === 'function') node.checkHasSelfGeneralization = () => false;
    return () => { if (typeof original === 'function') node.checkHasSelfGeneralization = original; };
  });
  renderer.activeNodeList = temporaryList;
  try {
    mindMap.execCommand('ADD_GENERALIZATION');
  } finally {
    restoreChecks.forEach((restore) => restore());
    // The upstream command clears or replaces the list when it focuses the new
    // summary. Only restore the user's selection when the temporary list was
    // left untouched.
    if (renderer.activeNodeList === temporaryList) {
      renderer.clearActiveNodeList?.();
      if (typeof renderer.activeMultiNode === 'function') renderer.activeMultiNode(originalList);
      else renderer.activeNodeList = originalList;
      renderer.emitNodeActiveEvent?.(originalList[0] ?? null, [...originalList]);
    }
  }
  return true;
}
