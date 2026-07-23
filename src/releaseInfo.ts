import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-23T08:36:48Z',
  buildId: 'yemind-v0.9.13-20260723',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修复节点图标与文字越界、隐藏标签文字塌缩、多选右键丢失，并恢复图片悬停工具和更清晰的面板交互。',
  highlights: [
    '节点图标改用受限 SVG pattern 渲染，完整 sprite 不再参与节点边界计算，文字和图标保持在节点框内。',
    '图片工具恢复为悬停显示，放大镜单击打开预览；预览背景降低遮罩不透明度并提高模糊程度。',
    '关联线选中态使用清晰蓝色和轻微加粗，不再覆盖为粗黑曲线。',
    '结构面板支持点击外部关闭；结构、样式按钮恢复 hover，整图与节点样式面板分别压缩并提高信息密度。',
    '关于 YeMind 移到顶部菜单的设置与诊断之间，新建导图使用“中心主题”和两个“新节点”。',
    '多选节点右键前捕获并恢复选择；富文本测量节点移出隐藏标签，防止文字节点塌缩成空椭圆。',
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
