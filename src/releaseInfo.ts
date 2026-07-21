import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T20:30:00+08:00',
  buildId: 'yemind-v0.8.3-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '修复画布、分屏和大纲的节点文本编辑事务与编辑器定位。',
  highlights: [
    '新建或默认节点双击后自动全选文字，可直接粘贴、剪切或替换。',
    '已有节点双击后光标落在末尾，Ctrl+A、复制、剪切、粘贴、Backspace 和 Delete 按文本编辑语义工作。',
    '画布富文本编辑层改用编辑器局部坐标，修复节点原位空白、文字漂到页面左上角的问题。',
    '分屏和大纲统一 Ctrl+A 与选区处理，并确保 YeMind 富文本覆盖真正替换上游同名插件。',
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
