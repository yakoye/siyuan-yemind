import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T16:35:00Z',
  buildId: 'yemind-v0.9.17-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '节点宽度拖动实时重排，重组节点右键菜单，并修复画布点击后被旧大纲选区重新选回其他节点的问题。',
  highlights: [
    '拖动节点文字宽度时，每一帧都重新布局整棵导图，子节点和连线实时跟随。',
    '编辑节点会直接进入文字编辑并全选文字；插入节点菜单统一使用“插入”并配套新的结构关系图标。',
    '外框和待办并入“添加”子菜单，并根据当前状态显示“外框/删除外框”和“添加待办/删除待办”。',
    '复制、剪切、粘贴和纯文本粘贴移动到节点上移/下移之前，节点样式图标与文字重新对齐。',
    '画布选中节点时会清除大纲中残留的 DOM 选区，避免点击任意节点后又跳回旧节点。',
    '节点标记 sprite 增加裁剪与命中隔离，避免超大透明图片区域截获其他节点点击。',
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
