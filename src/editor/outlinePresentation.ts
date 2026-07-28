import type { StructuredOutlineBlock } from './structuredOutlineDocument';

const OUTLINE_BRANCH_COLOR_COUNT = 6;

export function outlineBranchColorIndexes(
  blocks: readonly Pick<StructuredOutlineBlock, 'uid' | 'depth' | 'parentUid'>[],
): Map<string, number> {
  const result = new Map<string, number>();
  let branch = 0;
  blocks.forEach((block) => {
    if (block.depth <= 0 || !block.parentUid) {
      result.set(block.uid, 0);
      return;
    }
    if (block.depth === 1) {
      branch = branch % OUTLINE_BRANCH_COLOR_COUNT + 1;
      result.set(block.uid, branch);
      return;
    }
    result.set(block.uid, result.get(block.parentUid) ?? 0);
  });
  return result;
}

export function outlineBranchColorVariable(index: number): string {
  return index > 0
    ? `var(--ymz-outline-branch-${Math.min(OUTLINE_BRANCH_COLOR_COUNT, index)})`
    : 'var(--ymz-accent)';
}
