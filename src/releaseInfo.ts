import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T00:30:00Z',
  buildId: 'yemind-v0.9.9-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一修正结构化大纲彩虹缩进线的层级几何，使每条引导线位于父子节点符号列之间且 Root 不再出现多余引导线。',
  highlights: [
    '大纲行、拖动 gutter、三角/方点和彩虹缩进线改用同一组几何变量，避免后续尺寸调整再次造成错位。',
    'Root 不绘制缩进引导线；一级线位于 Root 与一级节点符号之间，后续层级按 22px 等距递进。',
    '彩虹线颜色循环从一级开始，深层节点继续使用 1/2/3/4 色周期，不改变文字、图标和拖动区域位置。',
    '拖动插入指示线沿用相同缩进变量，展开、折叠、hover、选中和结构拖动不会推动彩虹线。',
    '新增 CSS 契约与真实 Chromium 几何回归，直接比较父子符号中心和引导线坐标。',
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
