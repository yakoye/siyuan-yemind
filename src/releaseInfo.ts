import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T03:15:00Z',
  buildId: 'yemind-v0.9.11-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一画布与大纲文字选区工具栏、图片选择、节点右键菜单和样式面板，并将关联线升级为可持久化调整控制点和切线的贝塞尔曲线。',
  highlights: [
    '画布与大纲都在选区完成后显示同一套浮动工具栏；字体和字号会恢复原选区后再应用，不再因下拉控件抢焦点而失效。',
    '单击节点图片即可固定图片工具，双击直接打开预览；图片工具与节点结构拖动完全隔离。',
    '单节点、多节点和画布空白使用独立右键菜单；外框菜单按节点状态动态显示添加或删除，并区分节点链接与行内链接。',
    '顶部样式和节点样式复用统一尺寸的锚定面板，分别贴近顶部按钮和右键位置显示。',
    '关联线保留原生可拖动贝塞尔控制点、切线和自动箭头方向，修复创建完成后延迟命中检查导致的空引用错误。',
    '节点加减快捷按钮贴合节点边框，并新增真实 Chromium 对选区、图片、菜单、面板、关联线控制点和按钮几何的回归。',
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
