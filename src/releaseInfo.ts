import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T13:30:00+09:00',
  buildId: 'yemind-v0.9.3-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、分屏大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '修复中心主题透底与节点悬停操作，并将分屏大纲升级为可批量选择、复制和缩进粘贴的连续文本编辑器。',
  highlights: [
    '透明中心主题自动使用当前主题或项目背景色，分支线不再透过文字区域。',
    '节点无需先选中，鼠标悬停即可显示添加、折叠和展开操作；指针跨越按钮间隙时控件保持有效。',
    '分屏与大纲默认提供一个连续文本编辑器，支持跨节点多行选择、复制、剪切、粘贴和替换。',
    '粘贴空格或 Tab 缩进的目录文本会自动生成层级，并通过一次可撤销的整树事务同步到画布。',
    '中文输入法完成组合输入后才同步；完全改写标题仍保留节点身份、备注、标签、图片和局部样式。',
    '保留节点树模式用于富文本、拖动和展开折叠，文本与节点模式共享同一份导图数据。',
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
