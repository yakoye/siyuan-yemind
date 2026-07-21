import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { LEGACY_PLUGIN_IDS, PLUGIN_ID, ROOT_ICON_URL } from '../../../src/plugin/constants';

const manifest = JSON.parse(readFileSync('plugin.json', 'utf8')) as { name: string; version: string };

describe('current plugin id contract', () => {
  it('uses siyuan-yemind everywhere current runtime resources are resolved', () => {
    expect(manifest.name).toBe(PLUGIN_ID);
    expect(PLUGIN_ID).toBe('siyuan-yemind');
    expect(ROOT_ICON_URL).toBe('/plugins/siyuan-yemind/icon.png');
  });

  it('keeps the old id only as a historical compatibility alias', () => {
    expect(LEGACY_PLUGIN_IDS).toEqual(['siyuan-yemind-zen']);
    expect(PLUGIN_ID).not.toBe(LEGACY_PLUGIN_IDS[0]);
  });

  it('runs the old petal-storage migration before loading repositories', () => {
    const source = readFileSync('src/plugin/YeMindPlugin.ts', 'utf8');
    expect(source).toContain('migrateLegacyPluginData');
    expect(source.indexOf('await migrateLegacyPluginData')).toBeLessThan(source.indexOf('await Promise.all([this.repository.load()'));
  });
});
