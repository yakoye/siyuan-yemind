import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T05:57:37Z',
  buildId: 'yemind-v0.9.22-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '将用户提供的 Base64 SVG 原样隔离为图片文档，避免宿主样式把线框图标填充成黑块。',
  highlights: [
    '搜索、样式、上级/同级/下级节点、节点样式、外框、图标、剪贴图等 14 个图标直接使用图标-svg.txt 中的原始 Base64 SVG。',
    '使用 img 文档边界隔离 SVG 内部 path，阻止思源主题或自定义 CSS 的 fill/stroke 规则把线框图标渲染成黑色实心块。',
    '保留原始宽高、路径、描边、填充、虚线、遮罩、透明度和固定颜色，显示结果与浏览器直接预览一致。',
    '继续使用统一 18×18 外层占位、禁用原生图片拖动，并保持工具栏与右键菜单对齐。',
    '补充精确 SHA-256、离线、恶意宿主 CSS 和真实 Chromium 回归。',
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
