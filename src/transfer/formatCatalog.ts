export type ExportFormatId =
  | 'yemind-svg'
  | 'yemind-package-svg'
  | 'svg'
  | 'kmindz'
  | 'yemind-zip'
  | 'markdown'
  | 'opml'
  | 'xmind'
  | 'png'
  | 'text'
  | 'html'
  | 'html-map'
  | 'pdf';

export interface ExportFormatDefinition {
  id: ExportFormatId;
  label: string;
  extension: string;
  description: string;
  mime: string;
  default?: boolean;
}

export const EXPORT_FORMATS: readonly ExportFormatDefinition[] = [
  { id: 'yemind-svg', label: 'YeMind SVG', extension: '.yemind.svg', description: '可预览、可继续编辑的默认格式', mime: 'image/svg+xml', default: true },
  { id: 'yemind-package-svg', label: 'SVG 包', extension: '.yemind.svg', description: 'SVG 预览与完整压缩包', mime: 'image/svg+xml' },
  { id: 'svg', label: 'SVG', extension: '.svg', description: '通用矢量图片', mime: 'image/svg+xml' },
  { id: 'kmindz', label: 'KMindz', extension: '.kmindz', description: 'KMindZ 兼容 SVG 包', mime: 'image/svg+xml' },
  { id: 'yemind-zip', label: 'Zip', extension: '.yemind.zip', description: '完整 YeMind 压缩包', mime: 'application/zip' },
  { id: 'markdown', label: 'Markdown', extension: '.md', description: 'Markdown 层级大纲', mime: 'text/markdown;charset=utf-8' },
  { id: 'opml', label: 'OPML', extension: '.opml', description: '通用大纲交换格式', mime: 'text/x-opml;charset=utf-8' },
  { id: 'xmind', label: 'XMind', extension: '.xmind', description: 'XMind 思维导图', mime: 'application/zip' },
  { id: 'png', label: 'PNG', extension: '.png', description: '高清图片，内含恢复数据', mime: 'image/png' },
  { id: 'text', label: 'Text', extension: '.txt', description: '缩进纯文本大纲', mime: 'text/plain;charset=utf-8' },
  { id: 'html', label: 'HTML 大纲', extension: '.html', description: '可独立打开的网页大纲', mime: 'text/html;charset=utf-8' },
  { id: 'html-map', label: 'HTML 导图', extension: '.html', description: '可缩放、折叠的独立网页导图', mime: 'text/html;charset=utf-8' },
  { id: 'pdf', label: 'PDF', extension: '.pdf', description: '单页 PDF 文档', mime: 'application/pdf' },
] as const;

export const IMPORT_EXTENSIONS = [
  '.kmindz', '.svg', '.png', '.zip', '.xmind', '.kmind', '.json', '.yemind',
  '.md', '.opml', '.txt', '.mm',
] as const;

export const IMPORT_ACCEPT = IMPORT_EXTENSIONS.join(',');

export function exportFormat(id: ExportFormatId): ExportFormatDefinition {
  const format = EXPORT_FORMATS.find((item) => item.id === id);
  if (!format) throw new Error(`未知导出格式：${id}`);
  return format;
}

export function safeExportFilename(value: string): string {
  return value.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').trim() || '未命名导图';
}
