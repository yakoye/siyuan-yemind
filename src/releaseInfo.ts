import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';
import { SOURCE_BUILD_INFO } from './buildInfo';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-08-01T02:56:37.362Z',
  buildId: 'yemind-v1.8.0-20260801',
  sourceBuildId: SOURCE_BUILD_INFO.id,
  sourceBuildTime: SOURCE_BUILD_INFO.time,
  sourceBuildLabel: `v${PLUGIN_VERSION} · ${SOURCE_BUILD_INFO.id}`,
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '稳定画布实时编辑几何、节点宽度调整和父子树拖动预览，并统一插件与网页版交互。',
  highlights: [
    '双击既有节点不再发生编辑层右移回跳，新建节点仍保留一次性首帧位置校正。',
    '输入和粘贴按单节点实时事务更新边框、入边与出边，多行选区可用一次 Delete 或 Backspace 删除。',
    '宽度手柄拖动期间不再触发竞争性几何修复，父节点拖动预览包含完整可见子树且尊重折叠状态。',
    '扩大加减与数字控件的指针热区，并让大纲多行节点的三角和方块固定在第一行。',
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
