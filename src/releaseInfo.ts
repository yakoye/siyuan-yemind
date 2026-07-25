import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T15:57:06Z',
  buildId: 'yemind-v0.9.26-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修复文本导入长节点布局，统一深度折叠与单层展开语义，并补齐大纲图片浏览和节点内容操作。',
  highlights: [
    '文本导入节点只使用 customTextWidth 控制自动换行，升级时安全清理 v0.9.25 自动宽度节点中重复的 width 字段。',
    '导入完成后等待文本尺寸稳定再执行一次整体重排，并恢复原画布缩放、平移和活动节点，避免长节点文字、边框和连线错位。',
    '节点折叠会递归折叠全部后代分支；重新展开时只展开当前一层。全局折叠后再次展开也只显示中心主题的一级节点。',
    '大纲图片和剪贴图支持单击编辑、双击进入共享大图浏览器，单击与双击通过可取消延迟避免冲突。',
    '大纲添加菜单补齐待办、外框、备注、批注、标签、图标、链接、剪贴图、图片、代码块、公式和行内链接，并复用导图同一份节点数据。',
    '大纲同步待办、标签、备注、批注、链接和外框状态，但继续不复制节点背景、边框、形状和分支线等画布装饰。',
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
