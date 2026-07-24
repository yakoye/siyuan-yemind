import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T06:57:39Z',
  buildId: 'yemind-v0.9.23-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一工具栏与菜单图标为 22px 槽位和 15px 图形，并补齐暗黑主题图标、悬停与选中状态。',
  highlights: [
    '所有自定义菜单和工具栏图标统一进入 22×22 固定槽位，图形在 15×15 区域内等比例居中。',
    '思源原生菜单 SVG 同样使用 22px 外框和 3.5px 内边距，原生与 YeMind 图标及文字起点保持一致。',
    '14 个用户提供的 Base64 SVG 增加独立暗黑版本，继续使用图片文档边界避免宿主 CSS 污染。',
    '大纲普通、悬停、选中、拖入状态改用主题变量，移除固定浅灰背景和固定黑色三角/方点。',
    '顶部工具栏暗黑模式的悬停与选中状态提高背景、边框、文字和图标对比度。',
    '补充失败测试、离线契约、14 图标像素可见性和真实 Chromium 暗黑主题回归。',
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
