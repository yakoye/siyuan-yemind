import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T10:30:00Z',
  buildId: 'yemind-v0.9.14-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '将多选概要合并为一个范围概要，统一节点文字与外框的测量世代，并隔离拖动优先模式下的右键框选。',
  highlights: [
    '多选节点添加概要时，按最低公共祖先投影为一个连续范围，只创建一个综合概要。',
    '富文本测量缓存迁移到保留编辑器样式的离屏宿主，迁移后只进行一次完整重排，避免文字和节点框来自不同渲染世代。',
    '隐藏标签页恢复、缩放和重新布局后，长文本、自定义宽度、图片节点继续保持正确边界。',
    '拖动优先模式中，右键拖动只平移画布，不再显示框选矩形，也不会改变当前节点选择。',
    '普通右键单击仍可打开原有上下文菜单。',
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
