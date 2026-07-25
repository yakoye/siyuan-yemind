import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-25T03:58:24Z',
  buildId: 'yemind-v0.9.28-20260725',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修复大纲图标与语义状态显示，恢复剪贴图直接缩放，并统一所有对话框的标题、关闭与底部操作区域。',
  highlights: [
    '大纲 marker 使用数学缩放后的紧凑 sprite 背景，修复图标外框与图形偏移；备注、批注改用明确语义图标，不再把批注数量误显示为节点编号。',
    '大纲悬停预览等待真实布局和图片加载后再显示，并通过 ResizeObserver 持续校正，避免首次出现时内容被截断。',
    '大纲图片单击继续编辑，双击稳定进入与导图完全相同的共享大图浏览器，单击与双击通过可取消延迟正确仲裁。',
    '导图剪贴图重新保留八方向缩放框和删除按钮，同时单击仍可打开剪贴图选择器；普通图片行为不受影响。',
    '图标和剪贴图选择器使用八方向候选与视口夹紧算法，在屏幕四角和各边缘附近均优先避开被点击节点。',
    '全部 YeMind 对话框接入统一外壳：标题加粗并垂直居中，关闭按钮对齐，底部按钮统一右对齐，原生和自定义标题栏保持同一几何。',
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
