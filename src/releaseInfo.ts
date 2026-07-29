import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';
import { SOURCE_BUILD_INFO } from './buildInfo';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-29T14:48:22.345Z',
  buildId: 'yemind-v1.5.2-20260729',
  sourceBuildId: SOURCE_BUILD_INFO.id,
  sourceBuildTime: SOURCE_BUILD_INFO.time,
  sourceBuildLabel: `v${PLUGIN_VERSION} · ${SOURCE_BUILD_INFO.id}`,
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '对齐 version47 界面并统一插件与网页版，新增卡片复习、完整基础主题和 v1.5.0 传输契约。',
  highlights: [
    '采用 version47 工具栏、面板、菜单、卡片和明暗视觉，并按编辑器宽度完成桌面与窄屏适配。',
    '补齐 6 个基础主题、向右组织结构、导图/大纲富文本选区恢复及共享资源交互。',
    '新增独立卡片数据、掌握进度、收藏筛选、翻面、状态管理和三档复习队列。',
    '统一 .yemind.svg、.yemind.zip、双 HTML 与旧格式兼容，并继续产出双端可验证发布包。',
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
