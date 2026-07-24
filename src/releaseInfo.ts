import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T07:30:00Z',
  buildId: 'yemind-v0.9.21-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '直接适配用户提供的 SVG 图形，并在节点双击全选后立即显示富文本工具栏。',
  highlights: [
    '保持图标-svg.txt 中的原始路径和形状，仅统一外层 20×20 视口、18×18 居中画布和菜单占位盒。',
    '将固定深色描边与填充转换为 currentColor，保留虚线、透明度、遮罩和原始视觉语义，兼容浅色与深色主题。',
    '更新搜索、样式、撤销、重做、上级/同级/下级插入、节点样式、关联线、外框、图标和剪贴图等操作图标。',
    '节点双击进入编辑后继续全选文字，并主动派发富文本选区事件，使共享格式工具栏立即定位并显示。',
    '补充真实 Chromium 回归，验证源 SVG 视口、主题继承、菜单图标和双击工具栏。',
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
