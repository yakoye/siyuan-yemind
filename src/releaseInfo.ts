import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-25T15:36:30Z',
  buildId: 'yemind-v0.9.30-20260725',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一分支控件方向、完整展开范围、三边工具栏状态，以及图标和剪贴图的两步资源操作。',
  highlights: [
    '节点快捷控件跟随真实子分支出口定位，右向、左向、双侧以及树状、时间线、组织图和鱼骨图采用一致的连接方向规则。',
    '节点右键菜单完整展开或折叠当前子树，空白菜单完整展开或折叠全图；节点数字仍只展开一级并只显示直接子节点数量。',
    '顶部、底部和左侧工具栏默认固定显示，竖图钉表示固定、斜图钉表示自动隐藏，一个图钉统一控制三边工具栏。',
    '底部只读按钮使用明确的开锁和闭锁图标，并同步标题与无障碍状态。',
    '导图节点右键菜单增加文本转导图入口；导图和大纲中的图标、剪贴图单击先显示替换/删除，再按需打开资源选择器。',
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
