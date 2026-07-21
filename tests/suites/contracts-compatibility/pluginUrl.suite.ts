import { describe, expect, it } from 'vitest';
import { LEGACY_PLUGIN_IDS, PLUGIN_ID } from '../../../src/plugin/constants';
import { createYeMindMapUrl, parseYeMindMapUrl } from '../../../src/plugin/pluginUrl';

describe('YeMind plugin URLs', () => {
  it('generates new links with the current plugin id', () => {
    expect(createYeMindMapUrl('map 1', PLUGIN_ID)).toBe('siyuan://plugins/siyuan-yemind?map=map%201');
  });

  it('extracts a map id from the current siyuan-yemind protocol link', () => {
    expect(parseYeMindMapUrl('siyuan://plugins/siyuan-yemind?map=map%201', PLUGIN_ID, LEGACY_PLUGIN_IDS)).toBe('map 1');
  });

  it('keeps historical siyuan-yemind-zen links readable', () => {
    expect(parseYeMindMapUrl('siyuan://plugins/siyuan-yemind-zen?map=legacy-map', PLUGIN_ID, LEGACY_PLUGIN_IDS)).toBe('legacy-map');
  });

  it('ignores links for another plugin', () => {
    expect(parseYeMindMapUrl('siyuan://plugins/other-plugin?map=map-1', PLUGIN_ID, LEGACY_PLUGIN_IDS)).toBeNull();
  });
});
