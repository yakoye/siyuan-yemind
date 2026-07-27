import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-27T03:00:00Z',
  buildId: 'yemind-v1.1.0-20260727',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '重构 28 种导图结构，统一节点快捷控件方向，并完善大纲拖动与媒体选中交互。',
  highlights: [
    '28 个结构预设使用明确的运行时布局，补齐镜像、上下双向、S 型、环形、表格和括号结构。',
    '根节点、中间节点、叶子节点的加号、折叠和数量控件按实际分支生长方向定位。',
    '大纲视图移除大块左侧留白，增加六点拖动手柄和十字移动光标。',
    '大纲图片与剪贴图支持八点选中、直接删除，并统一替换与删除 SVG 图标。',
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
