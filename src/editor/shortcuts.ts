import type { ShortcutCommand, ShortcutMap } from '../settings/SettingsStore';

const MODIFIER_ORDER = ['Ctrl', 'Cmd', 'Alt', 'Shift'] as const;

function normalizeKey(key: string): string {
  const aliases: Record<string, string> = {
    ' ': 'Space',
    Spacebar: 'Space',
    Esc: 'Escape',
    Del: 'Delete',
    Up: 'ArrowUp',
    Down: 'ArrowDown',
    Left: 'ArrowLeft',
    Right: 'ArrowRight',
  };
  const value = aliases[key] ?? key;
  if (value.length === 1 && /[A-Z]/.test(value)) return value.toLowerCase();
  return value;
}

export function keyboardEventToShortcut(event: KeyboardEvent): string {
  const key = normalizeKey(event.key);
  if (['Control', 'Meta', 'Alt', 'Shift'].includes(key)) return '';
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.metaKey) parts.push('Cmd');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey) parts.push('Shift');
  parts.push(key);
  return parts.join('+');
}

function normalizeAlternative(value: string): string {
  const raw = value.trim();
  if (!raw) return '';
  const tokens = raw.split('+').map((item) => item.trim()).filter(Boolean);
  const modifiers = new Set<string>();
  let key = '';
  tokens.forEach((token) => {
    const lower = token.toLowerCase();
    if (lower === 'ctrl' || lower === 'control' || lower === '⌃') modifiers.add('Ctrl');
    else if (lower === 'cmd' || lower === 'command' || lower === 'meta' || lower === '⌘') modifiers.add('Cmd');
    else if (lower === 'alt' || lower === 'option' || lower === '⌥') modifiers.add('Alt');
    else if (lower === 'shift' || lower === '⇧') modifiers.add('Shift');
    else key = normalizeKey(token);
  });
  if (!key) return '';
  return [...MODIFIER_ORDER.filter((modifier) => modifiers.has(modifier)), key].join('+').toLowerCase();
}

function alternatives(binding: string): string[] {
  return binding
    .split('/')
    .map(normalizeAlternative)
    .filter(Boolean);
}

export function matchesShortcut(event: KeyboardEvent, binding: string): boolean {
  const current = normalizeAlternative(keyboardEventToShortcut(event));
  return Boolean(current) && alternatives(binding).includes(current);
}

export function findShortcutConflicts(shortcuts: ShortcutMap): Record<ShortcutCommand, ShortcutCommand[]> {
  const keys = Object.keys(shortcuts) as ShortcutCommand[];
  const result = keys.reduce((output, key) => {
    output[key] = [];
    return output;
  }, {} as Record<ShortcutCommand, ShortcutCommand[]>);
  const normalized = new Map<ShortcutCommand, Set<string>>(
    keys.map((key) => [key, new Set(alternatives(shortcuts[key]))]),
  );
  keys.forEach((key, index) => {
    keys.slice(index + 1).forEach((other) => {
      const left = normalized.get(key)!;
      const right = normalized.get(other)!;
      if (left.size === 0 || right.size === 0) return;
      if ([...left].some((shortcut) => right.has(shortcut))) {
        result[key].push(other);
        result[other].push(key);
      }
    });
  });
  return result;
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true;
  if (target.isContentEditable || target.contentEditable === 'true' || target.closest('[contenteditable="true"], [contenteditable=""], .ql-editor')) return true;
  return false;
}
