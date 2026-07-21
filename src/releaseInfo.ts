import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T21:20:00+08:00',
  buildId: 'yemind-v0.8.4-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '修复结构拖动后画布富文本编辑框归零、文字漂移与提交到失效节点的问题。',
  highlights: [
    '富文本编辑事务按节点 UID 重新绑定当前渲染实例，不再持有拖动前的失效节点引用。',
    '隐藏 SVG 文字返回零矩形时，使用屏幕变换矩阵或最后有效锚点恢复编辑框位置，禁止覆盖为 -6/-4。',
    '节点拖动、同位拖动、结构重绘后双击编辑仍覆盖在节点原位，并保留新节点全选与旧节点末尾光标语义。',
    '完成编辑时把文字提交到当前渲染节点，避免重绘后写入旧实例；新增真实 SVG/Quill 拖动后回归测试。',
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
