import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T15:30:00Z',
  buildId: 'yemind-v0.9.16-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '重构节点图片交互：悬停描边、单击选图、八点缩放、图片级删除与替换，以及双击预览。',
  highlights: [
    '鼠标悬停图片只显示蓝色边框，单击后显示八个缩放点、删除按钮和替换/删除工具栏，同时保持节点选中。',
    '四边控制点默认自由拉伸，按住 Shift 时等比；四角控制点始终等比，并使用对应方向的缩放光标。',
    '图片选中时 Delete 或 Backspace 只删除图片，节点保留；双击图片打开大图预览。',
    '双击节点文字进入编辑并全选文字，移除旧版悬停删除、缩放和放大镜图标。',
    '新插入剪贴图保持原始比例并缩放到最长边 48px，同时继续识别旧版 72×72 错误几何。',
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
