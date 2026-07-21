import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T14:07:00+08:00',
  buildId: 'yemind-v0.8.0-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '启用全新的 YeMind 品牌图标，并将公开产品名、工程名、源码入口和发布产物统一重命名为 YeMind。',
  highlights: [
    '使用用户提供的新导图图标，生成 32、64、128 和 512 像素透明资源，主色精确统一为 #176B50。',
    '公开名称、设置、搜索、诊断、Dock、标签页和当前文档统一使用 YeMind 品牌。',
    'npm 工程、源码插件类和发布压缩包统一改为 siyuan-yemind / YeMindPlugin；技术插件 ID 保留以兼容旧数据。',
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
