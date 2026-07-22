import { PLUGIN_VERSION, PRODUCT_NAME, PROJECT_PACKAGE_NAME } from './plugin/constants';

export const RELEASE_INFO = {
  version: PLUGIN_VERSION,
  buildVersion: PLUGIN_VERSION,
  buildTime: '2026-07-22T12:20:00Z',
  buildId: 'yemind-v0.9.6-20260722',
  productName: PRODUCT_NAME,
  projectName: PROJECT_PACKAGE_NAME,
  tagline: '思源笔记中的思维导图、统一结构化大纲与知识整理插件。',
  hostBaseline: 'SiYuan 3.7.3',
  releaseSummary: '稳定统一大纲的结构编辑与拖放，并为向右逻辑图重建无插入线、候选父级明确且节点实时让位的画布拖动体验。',
  highlights: [
    '大纲拖动命中扩展到完整缩进单元格，正文继续用于文本选择；绿色插入线采用整行上下区和横向层级吸附，避免闪烁。',
    'Enter 创建或拆分兄弟节点，Shift+Enter 插入软换行；空节点采用两阶段删除，不再给上一个节点追加空行。',
    '选区格式工具栏的字体字段在继承主题字体时显示“默认字体”，未知或混合字体不再留下空白控件。',
    '向右逻辑图删除画布插入线，只显示绿色候选父级虚线；无有效目标时不再错误连接 Root。',
    '同级拖放由目标节点上下区决定，子节点拖放只在明确进入节点尾部时生效，原位置与中性空白区均保持不变。',
    '有效画布候选会实时移动目标兄弟或子节点，为被拖子树让出空间；移动保留 UID、元数据和完整子树，并只产生一条撤销记录。',
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
