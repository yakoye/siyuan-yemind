import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T11:30:00+08:00',
  buildId: 'yemind-v0.9.1-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '补齐十九套命名主题的完整层级颜色，并统一三套基础主题的配色控制。',
  highlights: [
    '主题颜色改为统一完整配置，覆盖中心主题、一级、二级、普通节点与各级连线。',
    '新增永恒、奶油、花海、珊瑚、绚丽、香槟、香水、禅心、律动九套主题。',
    'YeMind 默认、Ink Branch、Material 3 Basic 进入同一配色控制体系。',
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
