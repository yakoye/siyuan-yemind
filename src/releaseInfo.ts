import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T13:40:00Z',
  buildId: 'yemind-v0.9.7-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '重建向右逻辑图的最近节点局部拖放判定，使绿色候选父级虚线在整个拖动期间持续存在并随目标实时切换。',
  highlights: [
    '向右逻辑图以最近合法节点为局部目标，按节点左侧上/下区决定同级前后，按节点右半部及右侧扩展区决定成为子节点。',
    '不同宽高节点使用各自放大的局部判定盒，不再依赖固定全局泳道；相邻目标之间加入候选保持与迟滞，减少闪烁。',
    '绿色虚线在拖动开始后始终存在：无新目标时连接原父节点，进入局部目标后在同一指针帧切换到候选父节点。',
    '修复虚线坐标空间混用：父节点和拖动影子统一在场景坐标中绘制，避免穿过 Root、错位或连接到错误节点。',
    '候选父节点、兄弟索引、节点让位预览和最终提交共享同一个 DropCandidate，避免预览与实际落点不一致。',
    '保留原子移动、单步撤销、Esc 取消、完整子树与 UID/备注/标签/图片/局部样式保护。',
  ],
} as const;

export interface VersionConsistency {
  manifest: string;
  runtime: string;
  build: string;
  consistent: boolean;
}

export function resolveVersionConsistency(manifestVersion: string | null | undefined): VersionConsistency {
  const manifest = manifestVersion || 'unknown';
  const runtime = PLUGIN_VERSION;
  const build = RELEASE_INFO.buildVersion;
  return {
    manifest,
    runtime,
    build,
    consistent: manifest !== 'unknown' && manifest === runtime && runtime === build,
  };
}
