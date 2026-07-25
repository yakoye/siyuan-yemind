export const UNTITLED_MAP_NAME = '未命名导图';

export function normalizeMapTitle(value: unknown): string {
  const title = String(value ?? '').trim();
  return title || UNTITLED_MAP_NAME;
}
