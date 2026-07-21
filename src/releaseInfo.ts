import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T18:30:00+08:00',
  buildId: 'yemind-v0.8.2-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '修复 Dock 激活状态下图标无法随主题反色的问题。',
  highlights: [
    'Dock、顶栏和菜单图标改为 currentColor 矢量图标，自动适配浅色、深色与激活状态。',
    'Dock 激活后由思源主题自动切换为高对比前景色，不再保留固定绿色像素。',
    '关于页和品牌展示继续使用 #176B50 透明 PNG，交互图标与品牌图标分工明确。',
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
