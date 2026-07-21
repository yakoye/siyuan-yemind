const READONLY_ALLOWED_SHORTCUTS = new Set([
  'Control+c',
  'Control+=',
  'Control+-',
  'Control+i',
  'Control+Enter',
  'Control+a',
  '/',
  'Up',
  'Down',
  'Left',
  'Right',
]);

const ROOT_DELETE_SHORTCUTS = new Set(['Del', 'Delete', 'Backspace', 'Shift+Backspace']);

export function shouldBlockUpstreamShortcut(
  shortcut: string,
  nodes: any[],
  readonly: boolean,
): boolean {
  if (readonly && !READONLY_ALLOWED_SHORTCUTS.has(shortcut)) return true;
  if (ROOT_DELETE_SHORTCUTS.has(shortcut) && nodes.some((node) => Boolean(node?.isRoot))) return true;
  return false;
}
