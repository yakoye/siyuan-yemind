import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const plugin = JSON.parse(readFileSync(resolve(process.cwd(), 'plugin.json'), 'utf8'));

describe('plugin identity', () => {
  it('uses siyuan-yemind as the current SiYuan id and YeMind as the display name', () => {
    expect(plugin.name).toBe('siyuan-yemind');
    expect(plugin.displayName.zh_CN).toBe('YeMind');
    expect(plugin.version).toBe('0.8.2');
  });
});
