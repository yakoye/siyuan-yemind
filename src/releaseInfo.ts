import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-27T04:40:00Z',
  buildId: 'yemind-v1.2.0-20260727',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '新增插件版与网页版共用的多格式导入导出，并提供可恢复的 YeMind SVG/ZIP/PNG 包。',
  highlights: [
    '默认导出 .yemind.svg：普通 SVG 软件可预览，YeMind 可无损恢复完整导图。',
    '支持 SVG 包、KMindz、ZIP、Markdown、OPML、XMind、PNG、Text、HTML 和 PDF。',
    '自动识别 KMindZ、SVG、PNG、ZIP、XMind、旧 KMind/JSON 以及 MD/OPML/TXT/MM 大纲。',
    '思源插件与独立网页版共用实时画布导出和导入解析流程。',
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
