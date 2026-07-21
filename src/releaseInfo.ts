import { PLUGIN_VERSION } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T10:58:47+08:00',
  buildId: 'yemind-zen-v0.7.0-20260721',
  productName: 'YeMind Zen',
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '新增关于页面、版本一致性门禁，并将诊断与回归升级为可追踪全局搜索完整链路的工具。',
  highlights: [
    '设置中新增“关于”，集中展示版本、构建、运行环境和本版更新。',
    '诊断包拆分为摘要、环境、版本、事件时间线、搜索状态、错误和回归结果。',
    '全局搜索记录查询、结果、预览、Enter、关闭窗口、打开导图和节点定位全过程。',
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
