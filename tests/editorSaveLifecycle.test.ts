import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const source = readFileSync(resolve(process.cwd(), 'src/editor/YeMindEditor.ts'), 'utf8');

describe('editor save lifecycle', () => {
  it('flushes a pending autosave before destroying the mind-map instance', () => {
    const destroyStart = source.indexOf('destroy(): void');
    const destroyEnd = source.indexOf('private mount()', destroyStart);
    const destroyBody = source.slice(destroyStart, destroyEnd);
    expect(destroyBody).toContain('this.flushPendingSave()');
    expect(destroyBody.indexOf('this.flushPendingSave()')).toBeLessThan(destroyBody.indexOf('this.destroyed = true'));
    expect(destroyBody.indexOf('this.flushPendingSave()')).toBeLessThan(destroyBody.indexOf('this.map?.destroy()'));
  });
});
