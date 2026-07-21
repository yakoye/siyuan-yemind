import { describe, expect, it } from 'vitest';
import { findShortcutConflicts, isEditableTarget, keyboardEventToShortcut, matchesShortcut } from '../../../src/editor/shortcuts';
import { DEFAULT_SHORTCUTS } from '../../../src/settings/SettingsStore';

describe('shortcut helpers', () => {
  it('serializes modifier keys using the labels shown in settings', () => {
    const event = new KeyboardEvent('keydown', { key: 'F', ctrlKey: true, shiftKey: true });
    expect(keyboardEventToShortcut(event)).toBe('Ctrl+Shift+f');
  });

  it('matches alternatives and platform-specific modifiers', () => {
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'f', ctrlKey: true }), 'Ctrl+f / Cmd+f')).toBe(true);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'f', metaKey: true }), 'Ctrl+f / Cmd+f')).toBe(true);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'f' }), 'Ctrl+f / Cmd+f')).toBe(false);
    expect(matchesShortcut(new KeyboardEvent('keydown', { key: 'Escape' }), '')).toBe(false);
  });

  it('detects conflicting custom shortcuts but ignores disabled commands', () => {
    const conflicts = findShortcutConflicts({
      ...DEFAULT_SHORTCUTS,
      comments: 'Ctrl+f',
      summary: '',
    });
    expect(conflicts.search).toContain('comments');
    expect(conflicts.comments).toContain('search');
    expect(conflicts.summary).toEqual([]);
  });

  it('does not dispatch map shortcuts while the user is typing', () => {
    const input = document.createElement('input');
    const editable = document.createElement('div');
    editable.contentEditable = 'true';
    const plain = document.createElement('button');
    expect(isEditableTarget(input)).toBe(true);
    expect(isEditableTarget(editable)).toBe(true);
    expect(isEditableTarget(plain)).toBe(false);
  });
});
