import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/plugin/dock.ts'), 'utf8');

describe('dock startup', () => {
  it('waits for repository readiness before showing the final map list', () => {
    expect(source).toContain('ymz-dock__empty">正在加载导图');
    expect(source).toContain('this.host.whenReady()');
  });
});
