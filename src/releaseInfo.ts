import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T17:30:00+09:00',
  buildId: 'yemind-v0.9.4-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '将分屏与纯大纲重构为单一结构化编辑器，统一节点操作、跨节点文本选择、层级粘贴和可视化拖放。',
  highlights: [
    '删除文本/节点双模式，整棵大纲由一个连续结构化编辑器承载，节点外观与原生跨行文本选择同时成立。',
    'Ctrl/Cmd+A 首次选择当前节点正文，再次选择完整大纲；跨节点选区可直接提升为全大纲选择。',
    '粘贴严格替换当前真实选区，支持富文本、纯文本、跨节点替换、缩进目录导入和一次事务撤销。',
    '分支三角与叶子方点统一为等大的纯黑标记，保留 indent-rainbow 层级引导线与扁平悬停/当前行背景。',
    '节点拖动仅从专用 gutter 发起，并提供同级前后、父级对齐和子节点插入线反馈。',
    '选区格式工具栏只在选择完成后出现；中文输入法、只读复制、UID 与节点元数据均有独立保护。',
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
