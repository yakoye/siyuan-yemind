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

const DELETE_SHORTCUTS = new Set(['Del', 'Delete', 'Backspace', 'Shift+Backspace']);

export type UpstreamShortcutAction = 'allow' | 'block' | 'safe-delete';

/**
 * Resolve destructive shortcuts before simple-mind-map executes them. All node
 * deletion is routed through YeMind's adapter so Root nodes can be filtered and
 * the upstream multi-Root error dialog is never entered.
 */
export function resolveUpstreamShortcutAction(
  shortcut: string,
  nodes: any[],
  readonly: boolean,
): UpstreamShortcutAction {
  if (readonly && !READONLY_ALLOWED_SHORTCUTS.has(shortcut)) return 'block';
  if (!DELETE_SHORTCUTS.has(shortcut)) return 'allow';
  const active = Array.isArray(nodes) ? nodes : [];
  return active.some((node) => !node?.isRoot) ? 'safe-delete' : 'block';
}

/** Backwards-compatible boolean used by existing integrations and tests. */
export function shouldBlockUpstreamShortcut(
  shortcut: string,
  nodes: any[],
  readonly: boolean,
): boolean {
  return resolveUpstreamShortcutAction(shortcut, nodes, readonly) !== 'allow';
}
