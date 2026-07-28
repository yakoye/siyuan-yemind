import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/plugin/tabs.ts'), 'utf8');

describe('restored tab handle liveness', () => {
  it('does not treat a temporarily detached SiYuan head element as a dead tab', () => {
    expect(source).toContain('isAlive: () => !state.destroyed');
    expect(source).not.toContain('headElement.isConnected');
  });

  it('retries activation while SiYuan is still creating the restored tab head element', () => {
    expect(source).toContain('const activateTab = (attempt = 0): void =>');
    expect(source).toContain('window.requestAnimationFrame(() => activateTab(attempt + 1))');
  });
});
