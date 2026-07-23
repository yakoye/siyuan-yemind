import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T08:30:00Z',
  buildId: 'yemind-v0.9.10-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '将大纲彩虹引导线改为单一覆盖层逐条绘制，使线条位于展开三角尖端正下方并保持统一 1px；同时补齐画布与大纲节点选择的双向可视定位。',
  highlights: [
    '每个展开父节点只生成一条独立彩虹引导线，不再由每行渐变重复拼接，消除深浅和粗细不一致。',
    '引导线横坐标直接取展开三角尖端中心，纵向从三角尖端下方延伸到最后一个可见后代标记。',
    '画布点击节点后，大纲自动滚动并将对应行置于可视区域；仅调整大纲内部滚动，不推动宿主页面。',
    '大纲点击节点继续通过 GO_TARGET_NODE 将画布目标居中显示，并与当前行高亮保持同步。',
    '新增真实 Chromium 几何、单线去重、画布到大纲及大纲到画布双向定位回归。',
  ]
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
