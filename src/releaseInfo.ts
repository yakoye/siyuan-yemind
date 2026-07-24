import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T06:30:00Z',
  buildId: 'yemind-v0.9.20-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一轻量线性图标与平面资源对话框，并补齐思维导图跨中心镜像拖动。',
  highlights: [
    '重新绘制插入层级、关联线、节点样式、复制、图标和剪贴图等操作图标，统一为 20×20 坐标、圆角线条和 currentColor。',
    '图标对话框取消分类标题和图标外层白底，仅保留固定分类栏与连续滚动图标区。',
    '剪贴图对话框使用透明内容表面和独立白色资源卡片，关闭按钮固定在右上角。',
    '思维导图节点可跨越中心主题切换左右分支，目标侧自动采用镜像的同级前后和下级插入规则。',
    '跨中心拖动会持久化根级分支方向，并为左右同名槽位生成独立稳定键，避免目标抖动或回跳。',
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
