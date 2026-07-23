import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T12:30:00Z',
  buildId: 'yemind-v0.9.15-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '根据 SVG 的真实固有宽高或 viewBox 计算剪贴图尺寸，保持原始纵横比，并自动修复旧版 72×72 默认插入节点。',
  highlights: [
    '剪贴图插入不再强制写入 72×72，而是将原始宽高等比缩放到 72px 边界框内。',
    '同时支持带 width/height、仅带 viewBox 以及浏览器已加载尺寸的 SVG。',
    '打开旧导图时自动识别带 yemindClipartId 的旧 72×72 默认节点并恢复真实比例。',
    '修正本地资源契约和测试中的剪贴图总数与分类计数，当前为 13 类 764 个。',
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
