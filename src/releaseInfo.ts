import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T22:30:00+08:00',
  buildId: 'yemind-v0.8.6-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '重构测试体系：按 15 个功能域组织 445 项回归，合并重复入口并建立功能覆盖矩阵。',
  highlights: [
    '将 159 个零散测试入口重组为 15 个功能域入口，保留独立场景模块和故障隔离能力。',
    '删除重复的插件身份与版本断言，所有用户反馈形成的永久回归场景继续保留。',
    '新增测试结构门禁、suite manifest 和功能覆盖矩阵，阻止孤立、漏挂载或未分类测试进入发布包。',
    '完整执行 445 项测试、TypeScript 检查、生产构建和最终 ZIP 解压后二次验证。',
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
