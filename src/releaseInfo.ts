import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-21T15:16:33+08:00',
  buildId: 'yemind-v0.8.1-20260721',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  officialReference: 'KMind Zen 0.34.0',
  releaseSummary: '将思源正式插件 ID 与安装目录统一为 siyuan-yemind，并保留旧协议链接兼容。',
  highlights: [
    'plugin.json.name、运行时资源路径、诊断身份和发布说明统一为 siyuan-yemind。',
    '安装目录固定为工作空间/data/plugins/siyuan-yemind，可直接解压覆盖升级。',
    '首次启动会在新存储为空时，从 data/storage/petal/siyuan-yemind-zen 只复制旧导图、设置和检查点到新 ID 存储，旧数据不删除。',
    '新复制的导图链接使用 siyuan-yemind；历史 siyuan-yemind-zen 链接仍可解析。',
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
