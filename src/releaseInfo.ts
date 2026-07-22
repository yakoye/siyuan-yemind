import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T09:00:00+09:00',
  buildId: 'yemind-v0.9.1-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '补全 19 套主题的分层节点、文字和连线颜色，并统一主题数据生成与运行时渲染。',
  highlights: [
    '完整接入晨曦、彩虹、活力、舞动、代码、和风、岛屿、玫瑰、薄荷、绿茶、永恒、奶油、花海、珊瑚、绚丽、香槟、香水、禅心和律动 19 套主题。',
    '每套主题分别控制导图背景、中心节点、一级节点、二级节点、普通节点及三个层级的父子连线颜色。',
    '三套基础主题补齐浅色和深色配置，主题注册表共 22 套主题、25 个实际外观定义。',
    '主题颜色由 JSON 单一数据源自动生成，构建、检查和测试前会重新生成运行时代码。',
    '节点局部文字色、背景色和连线色继续优先于整图主题，生成样式不会写入导图数据。',
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
