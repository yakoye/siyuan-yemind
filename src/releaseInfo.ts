import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T00:20:00Z',
  buildId: 'yemind-v0.9.18-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '打开分屏时立即定位当前节点，并将右向导图的丝滑拖动语义镜像和扩展到全部结构布局。',
  highlights: [
    '打开分屏或纯大纲视图时，立即在大纲自身滚动区域内显示当前画布选中节点，不改变画布选中所有权。',
    '保留右向导图已经稳定的局部命中、绿色虚线父级预览和实时让位逻辑，左向导图使用严格镜像坐标复用同一算法。',
    '思维导图、逆向导图、双向平衡向下、树状图、时间轴和组织结构图统一使用方向归一化后的即时拖动候选。',
    '鱼骨图右使用独立的镜像渲染器，节点、连线、概要和鱼尾结构与鱼骨图左左右对称，文字保持正常方向。',
    '树形表格和其他结构缩略图通过各自映射的正式引擎布局继承相同拖动规则。',
    '所有已适配结构在拖动时只显示一个候选父节点绿色虚线，并在横向或纵向兄弟轴上实时腾出空间。',
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
