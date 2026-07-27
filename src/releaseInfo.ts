import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-26T15:53:25Z',
  buildId: 'yemind-v0.9.31-20260726',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '仅重做主题下拉菜单的分组标签与六色色条展示，保留全部主题数据和切换逻辑。',
  highlights: [
    '主题下拉菜单改为分组标签与双列卡片布局，每个现有主题显示名称和六个真实一级分支颜色块。',
    '基础、缤纷、经典三个现有分类和全部二十二个主题保持不变，当前主题所在分类会自动打开并高亮。',
    '亮色与暗黑宿主仅改变面板外观，六色色条始终保留主题真实颜色。',
    '线型下拉菜单继续使用原有列表展示，主题应用、保存和导图刷新逻辑没有变化。',
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
