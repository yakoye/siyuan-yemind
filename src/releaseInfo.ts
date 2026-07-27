import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-27T03:00:00Z',
  buildId: 'yemind-v0.9.32-20260727',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修正经典主题真实色预览，增加分组彩虹配色卡、最小运行目录同步和独立网页版。',
  highlights: [
    '经典主题不再显示未参与循环的伪颜色，只展示实际画布、中心、连线、节点和文字颜色。',
    '彩虹连线配色改为缤纷与经典分组的双列色卡，并保留隐藏原生值用于兼容。',
    '运行目录通过白名单原子同步，仅保留插件运行文件和固定资源。',
    '新增 IndexedDB 本地存储、单图传输与整库备份恢复的独立网页版。',
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
