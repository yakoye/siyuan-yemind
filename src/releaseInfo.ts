import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T13:53:45Z',
  buildId: 'yemind-v0.9.25-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '优化文本转导图的大文本预览与导入节点宽度，统一暗黑主题项目控件，并让大纲同步显示和添加图片、图标与剪贴图。',
  highlights: [
    '文本转导图对话框限制在视口内，原始文本和处理后结构分别滚动，右侧预览展示去除树形符号后的真实层级结果。',
    '超过约二十个汉字显示宽度的导入节点默认使用 280px 自动换行，不修改原始文字；用户手动调整宽度后以自定义值持久保存。',
    '主题与线型改为自定义选择面板，结构、主题、线型、样式和保存状态在暗黑主题下使用统一可读前景、悬停和选中配色。',
    '大纲以紧凑附件槽同步显示节点图标、图片和剪贴图，并复用导图的图标、剪贴图和图片添加入口。',
    '大纲只同步节点内容，不复制节点边框、背景、形状和连线等画布装饰样式。',
    '保留 v0.9.24 的文本导入、连续 Enter 退层级、公式图标和主题切换视图稳定性修复。',
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
