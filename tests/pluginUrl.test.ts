import { describe, expect, it } from 'vitest';
import { parseYeMindMapUrl } from '../src/plugin/pluginUrl';

describe('parseYeMindMapUrl', () => {
  it('extracts a map id from the plugin protocol link', () => {
    expect(parseYeMindMapUrl('siyuan://plugins/siyuan-yemind-zen?map=map%201', 'siyuan-yemind-zen')).toBe('map 1');
  });

  it('ignores links for another plugin', () => {
    expect(parseYeMindMapUrl('siyuan://plugins/other-plugin?map=map-1', 'siyuan-yemind-zen')).toBeNull();
  });
});
