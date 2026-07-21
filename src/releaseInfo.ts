import { PLUGIN_VERSION } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T12:20:00+08:00',
  buildId: 'yemind-zen-v0.7.1-20260721',
  productName: 'YeMind Zen',
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '修复思源全局搜索关闭控件兼容性，使 Enter、双击和打开导图按钮能够稳定打开并定位节点。',
  highlights: [
    '兼容思源全局搜索中 SVG 和非按钮关闭控件，不再直接假定存在 click() 方法。',
    '关闭搜索窗口失败时仍继续打开导图，避免导航链路被关闭步骤阻断。',
    '诊断自检可识别导航停滞，不再把长时间停在关闭阶段误判为通过。',
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
