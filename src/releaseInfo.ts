import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-27T06:30:22.700Z',
  buildId: 'yemind-v1.3.0-20260727',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一思源插件与独立网页版，完成结构、编辑、外观、导入导出和发布链路的稳定性整理。',
  highlights: [
    '思源插件与独立网页版共用编辑器、数据模型、导入导出和交互实现。',
    '回归 28 种结构、导图和大纲编辑拖动、附件、关联线、明暗主题与响应式工具栏。',
    '修复导图和大纲的选区工具栏、模糊切换、编辑及删除等连续操作。',
    '提供双端 ZIP、发布清单、SHA-256 校验、CI、GitHub Release 和 Pages 自动部署。',
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
