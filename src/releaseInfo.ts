import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-25T02:21:07Z',
  buildId: 'yemind-v0.9.27-20260725',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一大纲与导图的图标、图片和剪贴图交互，优化资源与备注对话框，并修复待办及跨视图内容同步。',
  highlights: [
    '大纲图标改用与导图一致的 marker sprite 渲染，单击可直接打开对应分类的图标选择器并即时同步修改结果。',
    '大纲图片和剪贴图继续区分单击编辑与双击共享大图浏览，备注、批注、待办、标签、链接和外框支持悬停预览。',
    '图标与剪贴图对话框改为紧凑宽度、自定义加粗标题栏和明确关闭按钮，并根据点击位置避开当前节点。',
    '备注对话框操作按钮右对齐；标题栏关闭或点击遮罩会自动保存，显式取消仍放弃本次修改。',
    '导图剪贴图单击直接打开选择器，不再显示图片替换/删除浮动工具栏；图标选择器同样锚定在点击节点旁。',
    '待办前缀统一为 18px 方形布局，并在大纲文字编辑期间仅刷新附件投影，保持图标、图片和状态在导图、大纲及分屏一致。',
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
