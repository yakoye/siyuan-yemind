import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T16:10:00Z',
  buildId: 'yemind-v0.9.8-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '保留拖动让位期间未受影响的普通分支实线，并移除画布文字编辑器叠加的额外焦点框。',
  highlights: [
    '向右逻辑图拖动让位时只替换需要移动端点的入线，其他正常父子实线始终保持可见。',
    '为让位子树生成临时入线覆盖层：父节点端点保持固定，子节点端点跟随预览位置，取消或切换候选后完整恢复原线。',
    '被拖子树根节点原入线继续由绿色候选父级虚线替代，兄弟分支和其他层级连线不再被整组隐藏。',
    '双击编辑画布节点时清除 Quill 容器、编辑正文和浏览器焦点的额外 border、outline 与 box-shadow。',
    '编辑状态仅保留节点自身主题/选中外观、文字光标和系统原生文字选区，节点尺寸与位置不因进入编辑而跳动。',
    '新增离线与真实 Chromium 回归，覆盖拖动实线连续性、候选父级切换、取消恢复和无额外编辑框。',
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
