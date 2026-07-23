export type RelationMode = 'idle' | 'creating' | 'active';

export interface RelationPresentationInput {
  isCreating: boolean;
  isActive: boolean;
}

export interface RelationPresentation {
  mode: RelationMode;
  hidden: boolean;
  hint: string;
}

export function createRelationPresentation(input: RelationPresentationInput): RelationPresentation {
  if (input.isCreating) {
    return { mode: 'creating', hidden: false, hint: '点击目标节点完成关联，Esc 取消' };
  }
  if (input.isActive) {
    return { mode: 'active', hidden: false, hint: '拖动两个控制点调整曲线弧度；箭头方向随终点切线变化' };
  }
  return { mode: 'idle', hidden: true, hint: '' };
}
