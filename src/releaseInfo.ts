import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T10:09:05Z',
  buildId: 'yemind-v0.9.5-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '重建大纲与画布树结构拖放判定，加入明确中性区、层级插入反馈、稳定候选和图片工具事件隔离。',
  highlights: [
    '大纲节点仅从隐形 gutter 启动结构拖动，正文继续用于跨节点文本选择；叶子方点缩小为 5×5px。',
    '大纲插入位置使用 YeMind 绿色横线和方形起点，支持同级前后、子节点与父级对齐，并保留彩虹缩进线。',
    '画布拖动改为鼠标指针驱动，拖动影子不再参与碰撞；节点间中性区域松手保持原状。',
    '画布虚线始终显示当前候选父节点，绿色插入线明确 BEFORE、AFTER 与 CHILD 的最终结构位置。',
    '拖动候选采用同级快速响应、子级短暂驻留和 NONE 立即清除，避免旧目标残留与层级抖动。',
    '图片垃圾桶内部图形缩小到与放大镜视觉重量一致，按钮背景和命中范围保持不变，图片工具不会启动节点拖动。',
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
