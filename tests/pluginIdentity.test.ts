import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const plugin = JSON.parse(readFileSync(resolve(process.cwd(), 'plugin.json'), 'utf8'));

describe('plugin identity', () => {
  it('uses the permanent SiYuan package id and YeMind Zen display name', () => {
    expect(plugin.name).toBe('siyuan-yemind-zen');
    expect(plugin.displayName.zh_CN).toBe('YeMind Zen');
    expect(plugin.version).toBe('0.6.8');
  });
});
