import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T10:45:39Z',
  buildId: 'yemind-v0.9.24-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '增加大纲文本转导图、节点级右键操作与连续回车退层级，并修复宿主暗黑切换的画布漂移和主题/线型控件可见性。',
  highlights: [
    '大纲右键菜单按节点编辑、插入、文本转换、行级剪贴、排序、折叠和两种删除语义重新组织。',
    '文本转导图支持 Unicode 树、Windows Tree、空格或 Tab 缩进、Markdown、编号大纲和普通多行文本，并提供动态示例与实时预览。',
    '新建导图只保留中心主题；空白大纲行连续按 Enter 会逐级提升，在一级边界删除空行并回到中心主题。',
    '剪切当前行只复制并清空节点文字，节点、全部子级、层级与顺序保持不变。',
    '宿主明暗模式切换时完整保存并二次恢复画布 transform，隐藏或零尺寸画布延迟重绘，避免节点整体向右漂移。',
    '主题和线型的文字、图标、悬停/打开状态及原生下拉选项完整适配暗黑主题。',
    '富文本选区工具栏使用思源 iconMath 公式图标，不再显示 π 字符。',
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
