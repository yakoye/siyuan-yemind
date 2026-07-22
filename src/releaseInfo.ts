import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T13:30:00+09:00',
  buildId: 'yemind-v0.9.2-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '补全主题节点边框颜色，并统一修复主题与彩虹连线切换后的即时完整重绘。',
  highlights: [
    '19 套命名主题增加中心、一级、二级和普通节点边框颜色，三套基础主题沿用各自浅色和深色描边配置。',
    '主题、彩虹连线和层级颜色改为一次原子外观事务，配置完成后只执行一次完整重绘。',
    '切换主题或彩虹连线后立即刷新节点、连线、关联线和外框，不再依赖后续结构变化触发。',
    '完整重绘保留缩放、平移和节点选择，不写入节点局部样式，也不增加撤销历史。',
    '主题 JSON、菜单、运行时、测试和发布文档继续由同一数据源同步生成与验证。',
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
