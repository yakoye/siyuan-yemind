import { describe, expect, it } from 'vitest';
import { MIND_MAP_PLUGIN_NAMES } from '../src/core/registerPlugins';

describe('mind-map plugin registration', () => {
  it('includes the mature plugins required by node content features', () => {
    expect(MIND_MAP_PLUGIN_NAMES).toEqual(expect.arrayContaining([
      'Drag',
      'Select',
      'RichText',
      'Formula',
      'AssociativeLine',
      'OuterFrame',
      'NodeImgAdjust',
    ]));
  });
});
