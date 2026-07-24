import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-24T03:30:00Z',
  buildId: 'yemind-v0.9.19-20260724',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '统一替换导图操作图标，重构固定尺寸图标与剪贴图对话框，并恢复检查点历史入口和大纲插入标记对齐。',
  highlights: [
    '使用提供的 SVG 更新样式、节点样式、撤销、重做、关联线、插入层级、剪贴图、外框、搜索和全屏图标。',
    '插入命令统一命名为插入上级节点、插入同级节点和插入下级节点，并按层级顺序排列。',
    '底部画布模式按钮显示点击后将切换到的操作模式，选择优先时展示手型拖动图标。',
    '图标对话框固定尺寸，一次展示全部分类和图标；分类导航固定，支持全部、关闭、外部点击关闭以及右对齐操作按钮。',
    '剪贴图对话框固定尺寸并移除加载更多，搜索和分类直接筛选完整目录。',
    '检查点按钮直接打开管理器，管理器内可创建、恢复、重命名和删除检查点。',
    '大纲拖动插入线的小方块按照目标层级对齐到对应三角或叶子方块中心。',
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
