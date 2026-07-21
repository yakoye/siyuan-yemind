import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/plugin/YeMindZenPlugin.ts'), 'utf8');

describe('new map lifecycle', () => {
  it('persists title and default layout in one repository create transaction', () => {
    const start = source.indexOf('async createMap()');
    const end = source.indexOf('async renameMap', start);
    const body = source.slice(start, end);
    expect(body).toContain('this.repository.create(title, settings.defaultLayout)');
    expect(body).not.toContain('this.repository.update(map.id');
  });
});
