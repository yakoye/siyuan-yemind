import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T21:40:00+08:00',
  buildId: 'yemind-v0.8.5-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '修复分屏模式下画布新增节点后错误恢复旧大纲节点焦点并进入编辑的问题。',
  highlights: [
    '新增画布/大纲编辑表面所有权协调器，同一时刻只有当前交互表面拥有编辑与焦点恢复权。',
    '画布点击、节点激活和画布富文本开始会提交并关闭旧大纲编辑器，同时取消旧焦点恢复票据。',
    '大纲焦点只允许由大纲自身的插入、缩进、删除和折叠命令显式恢复，普通结构同步不再推断旧焦点。',
    '异步焦点恢复使用代次校验，旧请求被画布接管或新请求替换后立即失效，并纳入永久分屏回归。',
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
