import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-25T09:05:00Z',
  buildId: 'yemind-v0.9.29-20260725',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '增加可固定的浮动工具栏、可编辑缩放与标题，扩大关联线命中区，并统一各布局的节点展开控件。',
  highlights: [
    '顶部和底部工具栏默认自动隐藏，鼠标靠近边缘或进入工具栏时显示；一个持久化图钉可同时固定两条工具栏。',
    '底部缩放百分比可直接输入，支持带或不带百分号并限制在有效范围；底部导图标题可内联重命名并同步思源标签页。',
    '关联线增加 12px 透明命中描边，视觉线宽保持不变，选中后仍使用原有高亮宽度，并与节点文字布局完全隔离。',
    '节点快捷展开控件按真实子分支方向定位，数字只统计直接子节点；折叠会递归关闭后代，再次展开只打开一层。',
    '离开导图视图时清理图片和剪贴图的缩放框、删除按钮与资源工具条，大纲双击图片继续使用共享大图浏览器。',
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
