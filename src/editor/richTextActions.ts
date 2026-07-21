export type RichTextBooleanFormat = 'bold' | 'italic' | 'underline' | 'strike';

export interface RichTextActionDefinition {
  id: RichTextBooleanFormat | 'cloze' | 'formula' | 'clear';
  label: string;
  title: string;
}

export const CLOZE_BACKGROUND = '#f5dfa0';

export const RICH_TEXT_ACTIONS: RichTextActionDefinition[] = [
  { id: 'bold', label: 'B', title: '加粗' },
  { id: 'italic', label: 'I', title: '斜体' },
  { id: 'underline', label: 'U', title: '下划线' },
  { id: 'strike', label: 'S', title: '删除线' },
  { id: 'cloze', label: '挖空', title: '挖空/取消挖空' },
  { id: 'formula', label: 'Fx', title: '插入公式' },
  { id: 'clear', label: '×', title: '清除格式' },
];

export function nextToggleFormat(
  name: RichTextBooleanFormat,
  formatInfo: Record<string, unknown> | null | undefined,
): Record<string, boolean> {
  return { [name]: !Boolean(formatInfo?.[name]) };
}

export function isClozeFormat(formatInfo: Record<string, unknown> | null | undefined): boolean {
  if (!formatInfo) return false;
  const color = String(formatInfo.color ?? '').toLowerCase().replaceAll(' ', '');
  const background = String(formatInfo.background ?? '').toLowerCase().replaceAll(' ', '');
  return color === 'transparent'
    || color === 'rgba(0,0,0,0)'
    || background === CLOZE_BACKGROUND;
}
