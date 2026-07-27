import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-27T04:25:00Z',
  buildId: 'yemind-v1.1.1-20260727',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修复网页版菜单越界、节点折叠、字体测量和公式图标兼容问题。',
  highlights: [
    '网页版画布、节点和大纲右键菜单支持完整子菜单、内置图标和视口边界约束。',
    '根节点与中间节点的加号、减号和数量按钮直接驱动实时渲染节点，折叠展开立即生效。',
    'Web 字体加载完成后自动重新测量全部节点，避免中英文长文本漂出边框。',
    '选中文字工具栏使用自包含公式 SVG，不再依赖思源宿主的图标精灵。',
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
