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

interface UpstreamKeyCommand {
  removeShortcut?(shortcut: string): void;
}

export interface MindMapShortcutScope {
  activate(): void;
  check(event: KeyboardEvent): boolean;
  destroy(): void;
}

const activeShortcutHostByDocument = new WeakMap<Document, HTMLElement>();

function isNodeLike(value: unknown): value is Node {
  return Boolean(value && typeof (value as Node).nodeType === 'number');
}

/**
 * simple-mind-map installs one window-level key listener per mounted map.
 * SiYuan keeps inactive tabs mounted, so checking only a shared class such as
 * `.ql-editor` lets an old map consume the active map's Ctrl+A/Delete. Scope
 * every upstream listener to its own canvas/editor and remember the last map
 * that received a pointer or focus event for body-targeted shortcuts.
 */
export function createMindMapShortcutScope(
  host: HTMLElement,
  getTextEditHost: () => HTMLElement | null | undefined,
): MindMapShortcutScope {
  const ownerDocument = host.ownerDocument;
  const activate = (): void => {
    activeShortcutHostByDocument.set(ownerDocument, host);
  };
  const ownsTarget = (target: unknown): boolean => {
    if (!isNodeLike(target)) return false;
    return host.contains(target) || Boolean(getTextEditHost()?.contains(target));
  };
  const check = (event: KeyboardEvent): boolean => {
    const target = event.target;
    if (ownsTarget(target)) {
      activate();
      return true;
    }
    if (target === ownerDocument.body || target === ownerDocument.documentElement || !target) {
      return activeShortcutHostByDocument.get(ownerDocument) === host;
    }
    return false;
  };
  const handleActivation = (): void => activate();
  host.addEventListener('pointerdown', handleActivation, true);
  host.addEventListener('focusin', handleActivation, true);
  return {
    activate,
    check,
    destroy(): void {
      host.removeEventListener('pointerdown', handleActivation, true);
      host.removeEventListener('focusin', handleActivation, true);
      if (activeShortcutHostByDocument.get(ownerDocument) === host) {
        activeShortcutHostByDocument.delete(ownerDocument);
      }
    },
  };
}

/**
 * YeMind owns Tab/Enter insertion as one transaction: create the node with a
 * preallocated UID, wait for its rendered instance, then focus that exact
 * editor. Keeping the upstream handlers registered creates a second insertion
 * path which can leave the browser performing native Tab focus navigation.
 */
export function disableUpstreamStructuralInsertShortcuts(
  keyCommand: UpstreamKeyCommand | null | undefined,
): void {
  keyCommand?.removeShortcut?.('Tab');
  keyCommand?.removeShortcut?.('Enter');
}

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
