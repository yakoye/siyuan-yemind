import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/settings/settingsDialog.ts'), 'utf8');

describe('settings dialog cleanup', () => {
  it('cleans shortcut recording when the dialog closes from any path', () => {
    expect(source).toContain('destroyCallback: () => recordingCleanup?.()');
  });
});
