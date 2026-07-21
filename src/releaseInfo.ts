import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T23:45:00+08:00',
  buildId: 'yemind-v0.9.0-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '新增图片安全操作与沉浸预览，扩展彩虹连线配色，并重做整图主题方案。',
  highlights: [
    '节点图片增加左上角放大预览和右上角删除图标，删除前必须二次确认。',
    '图片预览支持遮罩显示、滚轮缩放、恢复 1:1、点击空白或按 Esc 关闭。',
    '备注和批注悬停只显示内容预览，不再叠加浏览器提示标签。',
    '彩虹连线增加晨曦、彩虹、活力、舞动、代码、和风、岛屿、玫瑰、薄荷和绿茶十套配色。',
    '主题面板保留三套基础主题，并加入十套带背景色、节点色和分支色的完整配色方案。',
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
